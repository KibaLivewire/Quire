import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TrashPanel } from "@/components/trash-panel";
import { buildBackup, readBackupFile, saveBackup } from "@/lib/backup";
import { checkForUpdates, appVersion } from "@/lib/desktop";
import { parsePlugin, pluginTemplate } from "@/lib/plugins";
import { allThemes } from "@/lib/theme";
import { type CustomTheme } from "@/lib/types";
import { useNotebookStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { clampTtsRate, listLocalVoices } from "@/lib/read-back";

export function SettingsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const replaceDesk = useNotebookStore((s) => s.replaceDesk);
  const pluginRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [draft, setDraft] = useState<CustomTheme>({
    id: "",
    label: "",
    desk: "#0c0b0a",
    paper: "#1a1714",
    ink: "#ece6dc",
    accent: "#8fa399",
  });
  const [updateNote, setUpdateNote] = useState("");

  const themes = allThemes(prefs.customThemes ?? []);

  function savePersonalTheme() {
    const label = draft.label.trim();
    if (!label) {
      toast.error("Name the theme first.");
      return;
    }
    const next: CustomTheme = { ...draft, id: draft.id || crypto.randomUUID(), label };
    const customThemes = [...(prefs.customThemes ?? []).filter((item) => item.id !== next.id), next];
    setPrefs({ customThemes, theme: next.id });
    toast("Theme saved on this device");
  }

  function importPlugin(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parsePlugin(JSON.parse(String(reader.result || "{}")));
        if (!parsed) {
          toast.error("That file is not a Quire add-on.");
          return;
        }
        const plugins = [...(prefs.plugins ?? []).filter((item) => item.id !== parsed.id), parsed];
        const extraThemes = parsed.themes ?? [];
        setPrefs({
          plugins,
          customThemes: [
            ...(prefs.customThemes ?? []).filter((theme) => !extraThemes.some((item) => item.id === theme.id)),
            ...extraThemes,
          ],
        });
        toast(`Added ${parsed.name}`);
      } catch {
        toast.error("Could not read that add-on.");
      }
    };
    reader.readAsText(file);
  }

  async function onCheckUpdates() {
    setUpdateNote("Checking…");
    const info = await checkForUpdates();
    if (info.error) {
      setUpdateNote(info.error);
      return;
    }
    if (info.latest && info.latest !== info.current) {
      setUpdateNote(`Version ${info.latest} is available (you have ${info.current}).`);
    } else {
      setUpdateNote(`Quire ${info.current} is up to date.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100%-1.5rem),36rem)] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Desk</DialogTitle>
          <DialogDescription>Theme and writing tools for this device. Quire {appVersion()}</DialogDescription>
        </DialogHeader>

        <section className="px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Mode</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {themes.map((item) => (
              <ThemeCard
                key={item.id}
                id={item.id}
                label={item.label}
                desk={item.desk}
                paper={item.paper}
                accent={item.accent}
                active={prefs.theme === item.id}
                onSelect={() => setPrefs({ theme: item.id })}
                onRemove={
                  "builtin" in item && !item.builtin
                    ? () => {
                        setPrefs({
                          customThemes: (prefs.customThemes ?? []).filter((theme) => theme.id !== item.id),
                          theme: prefs.theme === item.id ? "dark" : prefs.theme,
                        });
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        <section className="px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Personal palette</h3>
          <p className="mt-1 text-xs text-ink-muted">Save desk, paper, and ink colors as a new style beside the four defaults.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              Name
              <Input className="mt-1" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </label>
            <div />
            <ColorField label="Desk" value={draft.desk} onChange={(desk) => setDraft({ ...draft, desk })} />
            <ColorField label="Paper" value={draft.paper} onChange={(paper) => setDraft({ ...draft, paper })} />
            <ColorField label="Text" value={draft.ink} onChange={(ink) => setDraft({ ...draft, ink })} />
            <ColorField label="Accent" value={draft.accent} onChange={(accent) => setDraft({ ...draft, accent })} />
          </div>
          <Button className="mt-2" variant="outline" size="sm" onClick={savePersonalTheme}>
            Save as personal theme
          </Button>
        </section>

        <section className="grid gap-3 px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Writing tools</h3>
          <ToggleRow
            label="Word count"
            hint="Show words and characters under the page"
            checked={prefs.showWordCount}
            onCheckedChange={(checked) => setPrefs({ showWordCount: checked })}
          />
          <ToggleRow
            label="Spelling marks"
            hint="Underline misspellings using this device"
            checked={prefs.spellcheck}
            onCheckedChange={(checked) => setPrefs({ spellcheck: checked })}
          />
          <ToggleRow
            label="Grammar check"
            hint="Look up grammar suggestions (sends the page text to LanguageTool)"
            checked={prefs.grammar}
            onCheckedChange={(checked) => setPrefs({ grammar: checked })}
          />
          <ToggleRow
            label="Word suggestions"
            hint="Synonyms, antonyms, and a short sense for a selected word"
            checked={prefs.suggestions}
            onCheckedChange={(checked) => setPrefs({ suggestions: checked })}
          />
          <ToggleRow
            label="Typewriter scroll"
            hint="In Focus, keep the line you are on near the middle of the page"
            checked={prefs.typewriter !== false}
            onCheckedChange={(checked) => setPrefs({ typewriter: checked })}
          />
          <ToggleRow
            label="Ink only"
            hint="Just paper and typing. Hides borders and extra chrome."
            checked={Boolean(prefs.inkOnly)}
            onCheckedChange={(checked) => setPrefs({ inkOnly: checked })}
          />
          <ToggleRow
            label="Room sound"
            hint="A soft loop that follows your theme. Ctrl+M mutes"
            checked={prefs.ambient !== false}
            onCheckedChange={(checked) => setPrefs({ ambient: checked })}
          />
          <ToggleRow
            label="Opening scene"
            hint="Opening scene and room sound follow your theme. Leather keeps leaves and wind chimes."
            checked={prefs.bootLeaves !== false}
            onCheckedChange={(checked) => setPrefs({ bootLeaves: checked })}
          />
          <ToggleRow
            label="Quill"
            hint="A local helper in the toolbar. Highlight a sentence and ask"
            checked={prefs.quill !== false}
            onCheckedChange={(checked) => setPrefs({ quill: checked })}
          />
          <div>
            <p className="text-sm font-medium text-ink">Daily word aim</p>
            <p className="text-xs text-ink-muted">A quiet count in the corner. No streaks.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 300, 500, 750, 1000].map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setPrefs({ wordGoal: goal })}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs",
                    (prefs.wordGoal || 0) === goal ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted",
                  )}
                >
                  {goal === 0 ? "Off" : goal}
                </button>
              ))}
            </div>
          </div>
        </section>

        <ReadBackSettings />

        <section className="px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Add-ons</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Import a JSON add-on other people share. Add-ons can bring extra themes and CSS. They cannot run programs.
          </p>
          <input
            ref={pluginRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              importPlugin(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => pluginRef.current?.click()}>
              Import add-on
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob([pluginTemplate()], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "quire-addon.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download template
            </Button>
          </div>
          <ul className="mt-2 space-y-1">
            {(prefs.plugins ?? []).map((plugin) => (
              <li key={plugin.id} className="flex items-center justify-between rounded-lg bg-paper px-2 py-1.5 text-sm">
                <span>
                  {plugin.name}
                  {plugin.version ? <span className="text-ink-subtle"> · {plugin.version}</span> : null}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrefs({ plugins: (prefs.plugins ?? []).filter((item) => item.id !== plugin.id) })}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">This device</h3>
          <p className="mt-1 text-xs text-ink-muted">Backup, restore, and trash — the same tools as File on a computer.</p>
          <input
            ref={restoreRef}
            type="file"
            accept=".zip,.json,application/zip,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void readBackupFile(file)
                .then((payload) => {
                  if (!window.confirm("Replace everything on this desk with the backup?")) return;
                  replaceDesk(payload);
                  toast("Desk restored from backup");
                })
                .catch((error) => toast.error(error instanceof Error ? error.message : "Could not restore that backup."));
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const state = useNotebookStore.getState();
                void saveBackup(buildBackup(state.notebooks, state.notes, state.prefs)).then(
                  () => toast("Backup saved"),
                  () => toast.error("Could not save the backup."),
                );
              }}
            >
              Backup desk
            </Button>
            <Button variant="outline" size="sm" onClick={() => restoreRef.current?.click()}>
              Restore desk
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
              Trash
            </Button>
          </div>
        </section>

        <section className="px-1 pb-2">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">About</h3>
          <p className="mt-1 text-sm text-ink-muted">Quire {appVersion()} · Android and Windows</p>
          <Button className="mt-2" variant="outline" size="sm" onClick={() => void onCheckUpdates()}>
            Check for updates
          </Button>
          {updateNote ? <p className="mt-1 text-xs text-ink-muted">{updateNote}</p> : null}
        </section>

        <div className="flex justify-end px-1 pt-1">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReadBackSettings() {
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function refresh() {
      setVoices(listLocalVoices());
    }
    refresh();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  const rate = clampTtsRate(prefs.ttsRate);

  return (
    <section className="grid gap-3 px-1 pb-4">
      <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Read back</h3>
      <div>
        <Label>Read-back voice</Label>
        <p className="text-xs text-ink-muted">Local voices on this computer — nothing is sent away.</p>
        <select
          className="mt-2 w-full rounded-lg border border-rule bg-paper px-2 py-2 text-sm text-ink"
          value={prefs.ttsVoiceURI || ""}
          onChange={(event) => setPrefs({ ttsVoiceURI: event.target.value || undefined })}
        >
          <option value="">Default voice</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name}
              {voice.lang ? ` · ${voice.lang}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Reading pace</Label>
        <p className="text-xs text-ink-muted">Gentle range — not a podcast scrubber.</p>
        <div className="mt-2 flex items-center gap-3">
          <Slider
            className="flex-1"
            min={80}
            max={120}
            step={5}
            value={[Math.round(rate * 100)]}
            onValueChange={([value]) => setPrefs({ ttsRate: clampTtsRate(value / 100) })}
            aria-label="Read-back rate"
          />
          <span className="w-10 text-right text-xs tabular-nums text-ink-muted">{rate.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-ink-muted">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 cursor-pointer rounded border border-rule bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2.5">
      <div className="min-w-0">
        <Label>{label}</Label>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ThemeCard({
  id: _id,
  label,
  desk,
  paper,
  accent,
  active,
  onSelect,
  onRemove,
}: {
  id: string;
  label: string;
  desk: string;
  paper: string;
  accent: string;
  active: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className={cn("rounded-xl border p-2", active ? "border-forest" : "border-rule")}>
      <button type="button" aria-pressed={active} onClick={onSelect} className="block w-full text-left">
        <span
          className="block h-12 rounded-lg"
          style={{
            background: `linear-gradient(180deg, ${desk} 38%, ${paper} 38%)`,
            boxShadow: `inset 0 0 0 1px ${accent}55`,
          }}
        />
        <span className="mt-1.5 block text-xs font-medium text-ink">{label}</span>
      </button>
      {onRemove ? (
        <button type="button" className="mt-1 text-[11px] text-ink-subtle hover:text-ink" onClick={onRemove}>
          Remove
        </button>
      ) : null}
    </div>
  );
}
