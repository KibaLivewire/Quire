import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { BootLeaves } from "@/components/boot-leaves";
import { EditorPane } from "@/components/editor-pane";
import { MenuBar } from "@/components/menu-bar";
import { NoteList } from "@/components/note-list";
import { NotebookRail } from "@/components/notebook-rail";
import { PrintPreview } from "@/components/print-preview";
import { QuillPanel } from "@/components/quill-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { startAmbient, stopAmbient, toggleAmbientMute } from "@/lib/ambient";
import { applyTheme } from "@/lib/theme";
import { useNotebookStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell() {
  const focusMode = useNotebookStore((s) => s.focusMode);
  const setFocusMode = useNotebookStore((s) => s.setFocusMode);
  const createNote = useNotebookStore((s) => s.createNote);
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const hasHydrated = useNotebookStore((s) => s.hasHydrated);
  const [notebooksOpen, setNotebooksOpen] = useState(false);
  const [mobileList, setMobileList] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    void useNotebookStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (prefs.bootLeaves === false) {
      setBooting(false);
      window.dispatchEvent(new Event("quire-desk-ready"));
      if (prefs.ambient !== false) void startAmbient(prefs.ambientVolume ?? 0.22);
      else stopAmbient();
    }
  }, [hasHydrated, prefs.bootLeaves, prefs.ambient, prefs.ambientVolume]);

  useEffect(() => {
    applyTheme(prefs.theme, prefs.customThemes ?? []);
  }, [prefs.theme, prefs.customThemes]);

  useEffect(() => {
    const id = "quire-plugin-css";
    const css = (prefs.plugins ?? []).map((plugin) => plugin.css || "").join("\n");
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!css.trim()) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [prefs.plugins]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "n" && !event.shiftKey) {
        event.preventDefault();
        createNote();
        setMobileList(false);
      }
      if (event.key === "Escape" && useNotebookStore.getState().focusMode) {
        setFocusMode(false);
      }
      if (meta && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        const zoom = useNotebookStore.getState().prefs.zoom;
        setPrefs({ zoom: Math.min(1.6, Math.round((zoom + 0.1) * 10) / 10) });
      }
      if (meta && event.key === "-") {
        event.preventDefault();
        const zoom = useNotebookStore.getState().prefs.zoom;
        setPrefs({ zoom: Math.max(0.7, Math.round((zoom - 0.1) * 10) / 10) });
      }
      if (meta && event.key === "0") {
        event.preventDefault();
        setPrefs({ zoom: 1 });
      }
      if (meta && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleAmbientMute();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNote, setFocusMode, setPrefs]);

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
        <div className={cn(focusMode && "hidden")}>
          <MenuBar onOpenSettings={() => setSettingsOpen(true)} />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
        <NotebookRail
          className={cn("hidden w-52 shrink-0 md:flex", focusMode && "md:hidden")}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <NoteList
          className={cn(
            "w-full shrink-0 md:w-72",
            focusMode && "md:hidden",
            mobileList ? "flex" : "hidden md:flex",
          )}
          onOpenNote={() => setMobileList(false)}
          onOpenNotebooks={() => setNotebooksOpen(true)}
        />
        <EditorPane
          className={cn("min-w-0 flex-1", mobileList && "hidden md:flex")}
          onBack={() => setMobileList(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <QuillPanel />
        </div>
      </div>

      {hasHydrated && booting && prefs.bootLeaves !== false ? (
        <BootLeaves
          onDone={() => {
            setBooting(false);
            window.dispatchEvent(new Event("quire-desk-ready"));
          }}
        />
      ) : null}

      <Sheet open={notebooksOpen} onOpenChange={setNotebooksOpen}>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Notebooks</SheetTitle>
          <NotebookRail
            onSelect={() => setNotebooksOpen(false)}
            onOpenSettings={() => {
              setNotebooksOpen(false);
              setSettingsOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PrintPreview />

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "bg-paper-raised text-ink border border-rule shadow-[var(--shadow-lift)] font-sans",
          },
        }}
      />
    </TooltipProvider>
  );
}
