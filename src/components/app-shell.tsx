import { useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { BootLeaves } from "@/components/boot-leaves";
import { EditorPane } from "@/components/editor-pane";
import { MenuBar } from "@/components/menu-bar";
import { NoteList } from "@/components/note-list";
import { NotebookRail } from "@/components/notebook-rail";
import { PrintPreview } from "@/components/print-preview";
import { QuillPanel } from "@/components/quill-panel";
import { RecipeChooserHost, openRecipeChooser } from "@/components/recipe-chooser";
import { SettingsPanel } from "@/components/settings-panel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { startAmbient, stopAmbient, toggleAmbientMute } from "@/lib/ambient";
import { initNativeShell } from "@/lib/native";
import { peekBoot } from "@/lib/boot-peek";
import { applyDevice } from "@/lib/device";
import { applyTheme } from "@/lib/theme";
import { stopSharedReading } from "@/components/read-back-chip";
import { getActiveEditor } from "@/lib/editor-commands";
import { hydrateAppVersion, notifyDesktopFlushDone, onDesktopFlushRequest } from "@/lib/desktop";
import { flushNotebookPersist, useNotebookStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell() {
  useEffect(() => {
    hydrateAppVersion();
    const peek = peekBoot();
    applyTheme(peek.theme, []);
    applyDevice();
    const onResize = () => applyDevice();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const focusMode = useNotebookStore((s) => s.focusMode);
  const setFocusMode = useNotebookStore((s) => s.setFocusMode);
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const hasHydrated = useNotebookStore((s) => s.hasHydrated);
  const [notebooksOpen, setNotebooksOpen] = useState(false);
  const [mobileList, setMobileList] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const bootingRef = useRef(true);
  bootingRef.current = booting;

  useEffect(() => {
    void useNotebookStore.persist.rehydrate();
    void initNativeShell();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (prefs.ambient === false) {
      stopAmbient();
      return;
    }
    if (prefs.bootLeaves === false || !booting) {
      void startAmbient(prefs.ambientVolume ?? 0.22, prefs.theme);
    }
  }, [hasHydrated, prefs.ambient, prefs.ambientVolume, prefs.theme, prefs.bootLeaves, booting]);

  useEffect(() => {
    if (!hasHydrated) return;
    applyTheme(prefs.theme, prefs.customThemes ?? []);
  }, [hasHydrated, prefs.theme, prefs.customThemes]);

  useEffect(() => {
    document.documentElement.dataset.inkOnly = prefs.inkOnly ? "true" : "false";
    document.documentElement.dataset.focusMode = focusMode ? "true" : "false";
    if (prefs.inkOnly) {
      const editor = getActiveEditor();
      if (editor?.isActive("image")) {
        editor.commands.setTextSelection(editor.state.selection.from);
      }
    }
  }, [prefs.inkOnly, focusMode]);

  useEffect(() => {
    let flushing = false;
    async function flushPersist() {
      if (flushing) return;
      flushing = true;
      try {
        stopSharedReading();
        await flushNotebookPersist();
      } finally {
        flushing = false;
      }
    }

    function onQuit() {
      void flushPersist();
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") void flushPersist();
    }

    window.addEventListener("beforeunload", onQuit);
    window.addEventListener("pagehide", onQuit);
    document.addEventListener("visibilitychange", onVisibility);
    const stopFlushListener = onDesktopFlushRequest(async () => {
      await flushPersist();
      notifyDesktopFlushDone();
    });

    return () => {
      window.removeEventListener("beforeunload", onQuit);
      window.removeEventListener("pagehide", onQuit);
      document.removeEventListener("visibilitychange", onVisibility);
      stopFlushListener();
    };
  }, []);

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
        openRecipeChooser({ mode: "create" });
        setMobileList(false);
      }
      if (event.key === "Escape") {
        if (bootingRef.current) {
          event.preventDefault();
          window.dispatchEvent(new Event("quire-boot-skip"));
          return;
        }
        if (useNotebookStore.getState().focusMode) {
          setFocusMode(false);
        }
      }
      if (meta && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        const zoom = useNotebookStore.getState().prefs.zoom;
        setPrefs({ zoom: Math.min(1.6, Math.round((zoom + 0.1) * 10) / 10) });
      }
      if (meta && event.key === "-") {
        event.preventDefault();
        const zoom = useNotebookStore.getState().prefs.zoom;
        setPrefs({ zoom: Math.max(0.4, Math.round((zoom - 0.1) * 10) / 10) });
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
  }, [setFocusMode, setPrefs]);

  return (
    <TooltipProvider>
      <div className="quire-shell flex h-dvh flex-col overflow-hidden bg-paper text-ink">
        <div className={cn("hidden md:block", focusMode && "md:hidden")}>
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

      {booting ? (
        <BootLeaves
          deskReady={hasHydrated}
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
      <RecipeChooserHost />
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
