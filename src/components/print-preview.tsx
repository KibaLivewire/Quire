import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notePages } from "@/lib/pages";
import { printDocument, registerPrintPreview } from "@/lib/print";
import { useNotebookStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PrintPreview() {
  const notes = useNotebookStore((s) => s.notes);
  const activeNoteId = useNotebookStore((s) => s.activeNoteId);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [landscape, setLandscape] = useState(false);
  const [busy, setBusy] = useState(false);

  const note = notes.find((item) => item.id === activeNoteId) ?? null;
  const pages = useMemo(() => (note ? notePages(note) : []), [note]);
  const safeIndex = Math.min(index, Math.max(0, pages.length - 1));
  const width = landscape ? 11 : 8.5;
  const height = landscape ? 8.5 : 11;

  useEffect(() => {
    return registerPrintPreview(() => {
      const current = useNotebookStore.getState();
      const active = current.notes.find((item) => item.id === current.activeNoteId);
      if (!active) {
        toast.error("Open or start a page first.");
        return;
      }
      setLandscape(current.prefs.pageOrientation === "landscape");
      setIndex(0);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open || !note) return;
    const current = note;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "ArrowRight") setIndex((value) => Math.min(pages.length - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopPropagation();
        void printDocument({
          title: current.title || "Untitled",
          pages,
          landscape,
        }).catch(() => toast.error("Could not open the printer."));
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, pages, landscape, note]);

  async function sendToPrinter() {
    if (!note) return;
    setBusy(true);
    try {
      await printDocument({
        title: note.title || "Untitled",
        pages,
        landscape,
      });
    } catch {
      toast.error("Could not open the printer.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !note) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#1a1714] text-cream">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          Print preview · {note.title || "Untitled"}
        </p>
        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            className={cn(
              "rounded-md px-2.5 py-1 text-xs",
              !landscape ? "bg-white/15 text-cream" : "text-cream/60 hover:text-cream",
            )}
            onClick={() => setLandscape(false)}
          >
            Portrait
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-2.5 py-1 text-xs",
              landscape ? "bg-white/15 text-cream" : "text-cream/60 hover:text-cream",
            )}
            onClick={() => setLandscape(true)}
          >
            Landscape
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-cream/70">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-cream/80 hover:text-cream"
            disabled={safeIndex <= 0}
            aria-label="Previous page"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {safeIndex + 1} / {pages.length || 1}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-cream/80 hover:text-cream"
            disabled={safeIndex >= pages.length - 1}
            aria-label="Next page"
            onClick={() => setIndex((value) => Math.min(pages.length - 1, value + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => void sendToPrinter()} disabled={busy}>
          <Printer className="size-4" />
          {busy ? "Printing…" : "Print"}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-cream/80 hover:text-cream"
          aria-label="Close preview"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
        <article
          className="quire-doc mx-auto bg-white text-[#1c1917] shadow-[0_24px_80px_rgb(0_0_0_/_45%)]"
          style={{
            width: `${width}in`,
            minHeight: `${height}in`,
            padding: "0.75in",
          }}
        >
          {safeIndex === 0 && note.title ? (
            <h1 className="title mb-4 font-display text-3xl font-semibold tracking-tight">
              {note.title}
            </h1>
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: pages[safeIndex] || "<p></p>" }} />
        </article>
        <p className="mx-auto mt-4 max-w-xl text-center text-xs text-cream/45">
          {width} × {height} in letter · this is how the page will print
        </p>
      </div>
    </div>
  );
}
