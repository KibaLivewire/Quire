import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notePages } from "@/lib/pages";
import { noteGate } from "@/lib/lock";
import { assessPrintSheet, pageColors, type PrintWarning } from "@/lib/print-ink";
import { printDocument, printInk, printPaper, registerPrintPreview } from "@/lib/print";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useNotebookStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs",
        on ? "bg-white/15 text-cream" : "text-cream/60 hover:text-cream",
      )}
    >
      {label}
    </button>
  );
}

export function PrintPreview() {
  const notes = useNotebookStore((s) => s.notes);
  const activeNoteId = useNotebookStore((s) => s.activeNoteId);
  const prefs = useNotebookStore((s) => s.prefs);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [landscape, setLandscape] = useState(false);
  const [inkSaver, setInkSaver] = useState(false);
  const [grayscaleImages, setGrayscaleImages] = useState(false);
  const [header, setHeader] = useState(true);
  const [pageNumbers, setPageNumbers] = useState(true);
  const [thisSheetOnly, setThisSheetOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [warning, setWarning] = useState<PrintWarning | null>(null);
  const sheetRef = useRef<HTMLElement>(null);

  const note = notes.find((item) => item.id === activeNoteId) ?? null;
  const pages = useMemo(() => (note ? notePages(note) : []), [note]);
  const safeIndex = Math.min(index, Math.max(0, pages.length - 1));
  const width = landscape ? 11 : 8.5;
  const height = landscape ? 8.5 : 11;
  const colors = pageColors();
  const paper = printPaper({ inkSaver, paper: colors.paper });
  const ink = printInk({ inkSaver, ink: colors.ink });

  useEffect(() => {
    return registerPrintPreview(() => {
      const current = useNotebookStore.getState();
      const active = current.notes.find((item) => item.id === current.activeNoteId);
      if (!active) {
        toast.error("Open or start a page first.");
        return;
      }
      if (noteGate(current.notebooks, active, current.unlockedIds)) {
        toast.error("Unlock this page first.");
        return;
      }
      setLandscape(current.prefs.pageOrientation === "landscape");
      setConfirm(false);
      setInkSaver(false);
      setGrayscaleImages(false);
      setHeader(true);
      setPageNumbers(true);
      setThisSheetOnly(true);
      setIndex(current.session.pageIndex || 0);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setWarning(assessPrintSheet(sheetRef.current, paper, ink));
    }, 80);
    return () => window.clearTimeout(id);
  }, [open, safeIndex, pages, landscape, paper, ink, inkSaver, grayscaleImages, header, pageNumbers]);

  useEffect(() => {
    if (!open || !note) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (confirm) setConfirm(false);
        else setOpen(false);
      }
      if (event.key === "ArrowRight") setIndex((value) => Math.min(pages.length - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopPropagation();
        void requestPrint();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, pages, landscape, note, confirm, warning, inkSaver, grayscaleImages, header, pageNumbers, thisSheetOnly, safeIndex]);

  async function sendToPrinter() {
    if (!note) return;
    setBusy(true);
    setConfirm(false);
    try {
      await printDocument({
        title: note.title || "Untitled",
        pages: thisSheetOnly ? [pages[safeIndex] || ""] : pages,
        landscape,
        paper: colors.paper,
        ink: colors.ink,
        inkSaver,
        grayscaleImages,
        header,
        pageNumbers,
      });
    } catch {
      toast.error("Could not open the printer.");
    } finally {
      setBusy(false);
    }
  }

  function requestPrint() {
    const latest = assessPrintSheet(sheetRef.current, paper, ink);
    setWarning(latest);
    if (latest.textMayVanish || latest.heavyInk) {
      setConfirm(true);
      return;
    }
    void sendToPrinter();
  }

  if (!open || !note) return null;

  const risky = Boolean(warning?.textMayVanish || warning?.heavyInk);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#1a1714] text-cream">
      <header className="flex shrink-0 flex-col gap-1 border-b border-white/10 px-3 py-2">
        <div className="flex h-9 items-center gap-2">
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
          <Button size="sm" onClick={() => requestPrint()} disabled={busy}>
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
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-0.5">
          <Toggle label="Ink-saver" on={inkSaver} onClick={() => setInkSaver((value) => !value)} />
          <Toggle
            label="Grayscale pictures"
            on={grayscaleImages}
            onClick={() => setGrayscaleImages((value) => !value)}
          />
          <Toggle label="Header" on={header} onClick={() => setHeader((value) => !value)} />
          <Toggle label="Page numbers" on={pageNumbers} onClick={() => setPageNumbers((value) => !value)} />
          <Toggle label="This sheet only" on={thisSheetOnly} onClick={() => setThisSheetOnly((value) => !value)} />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
        {risky ? (
          <div className="mx-auto mb-4 max-w-xl rounded-xl border border-amber-200/30 bg-amber-950/70 px-4 py-3 text-sm text-amber-50">
            <p className="font-medium">This page may not print well</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-50/90">
              {warning?.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <article
          ref={sheetRef}
          className={cn("quire-doc print-preview-sheet mx-auto shadow-[0_24px_80px_rgb(0_0_0_/_45%)]", grayscaleImages && "is-gray")}
          style={{
            width: `${width}in`,
            minHeight: `${height}in`,
            padding: "0.75in",
            background: paper,
            color: ink,
          }}
        >
          {header ? (
            <div className="mb-4 flex justify-between border-b pb-2 text-[11px] tracking-wide uppercase opacity-70" style={{ borderColor: ink }}>
              <span>{note.title || "Untitled"}</span>
              <span>Quire</span>
            </div>
          ) : null}
          {safeIndex === 0 && note.title ? (
            <h1 className="title mb-4 font-display text-3xl font-semibold tracking-tight" style={{ color: ink }}>
              {note.title}
            </h1>
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(pages[safeIndex] || "<p></p>") }} />
          {pageNumbers ? (
            <p className="mt-8 text-right text-[11px] opacity-70">
              {safeIndex + 1} / {pages.length || 1}
            </p>
          ) : null}
        </article>
        <p className="mx-auto mt-4 max-w-xl text-center text-xs text-cream/45">
          {width} × {height} in letter
          {inkSaver
            ? " · ink-saver: white paper, black type"
            : ` · colors match the page on your desk (${prefs.theme})`}
        </p>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="z-[90]" data-close-on-back>
          <AlertDialogHeader>
            <AlertDialogTitle>Print this page anyway?</AlertDialogTitle>
            <AlertDialogDescription>
              {warning?.reasons.join(" ") || "This page may use a lot of ink or hide some text."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => void sendToPrinter()} disabled={busy}>
              Continue anyway
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
