import { BORDER_META } from "@/lib/borders";
import { THEME_META } from "@/lib/theme";
import { THEMES, type BorderId, type ThemeId } from "@/lib/types";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100%-1.5rem),32rem)] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Desk</DialogTitle>
          <DialogDescription>Theme, page frame, and writing tools for this device.</DialogDescription>
        </DialogHeader>

        <section className="px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Mode</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((id) => (
              <ThemeCard
                key={id}
                id={id}
                active={prefs.theme === id}
                onSelect={() => setPrefs({ theme: id })}
              />
            ))}
          </div>
        </section>

        <section className="px-1 pb-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Page border</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {BORDER_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={prefs.border === item.id}
                onClick={() => setPrefs({ border: item.id })}
                className={cn(
                  "rounded-xl border px-2 py-2 text-left transition-colors duration-150",
                  prefs.border === item.id ? "border-forest bg-paper-inset" : "border-rule hover:bg-paper-inset",
                )}
              >
                <BorderSwatch id={item.id} />
                <p className="mt-1.5 text-xs font-medium text-ink">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 px-1 pb-2">
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
            label="Word suggestions"
            hint="Synonyms, antonyms, and a short sense for a selected word"
            checked={prefs.suggestions}
            onCheckedChange={(checked) => setPrefs({ suggestions: checked })}
          />
        </section>
        <div className="flex justify-end px-1 pt-1">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
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
  id,
  active,
  onSelect,
}: {
  id: ThemeId;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = THEME_META[id];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-2 text-left transition-colors duration-150",
        active ? "border-forest" : "border-rule hover:bg-paper-inset",
      )}
    >
      <span
        className="block h-12 rounded-lg"
        style={{
          background: `linear-gradient(180deg, ${meta.desk} 38%, ${meta.paper} 38%)`,
          boxShadow: `inset 0 0 0 1px ${meta.accent}55`,
        }}
      />
      <span className="mt-1.5 block text-xs font-medium text-ink">{meta.label}</span>
    </button>
  );
}

function BorderSwatch({ id }: { id: BorderId }) {
  return <span data-border={id} className="border-swatch" />;
}
