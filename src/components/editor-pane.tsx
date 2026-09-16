import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  FolderInput,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pin,
  Plus,
  Printer,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { FindBar } from "@/components/find-bar";
import { AmbientDial } from "@/components/ambient-dial";
import { RichEditor } from "@/components/rich-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { exportDoc, exportDocx, exportHtml, exportMarkdown, exportPdf, exportRtf, exportText } from "@/lib/export-note";
import { notePages } from "@/lib/pages";
import { openPrintPreview } from "@/lib/print";
import { openRecipeChooser } from "@/lib/recipe-chooser";
import { useNotebookStore } from "@/lib/store";
import { cn, debounce, plainText, wordCount } from "@/lib/utils";

export function EditorPane({
  onBack,
  onOpenSettings,
  className,
}: {
  onBack?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}) {
  const notes = useNotebookStore((s) => s.notes);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const activeNoteId = useNotebookStore((s) => s.activeNoteId);
  const focusMode = useNotebookStore((s) => s.focusMode);
  const setFocusMode = useNotebookStore((s) => s.setFocusMode);
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const updateNote = useNotebookStore((s) => s.updateNote);
  const updateNotePage = useNotebookStore((s) => s.updateNotePage);
  const deleteNote = useNotebookStore((s) => s.deleteNote);
  const recordWords = useNotebookStore((s) => s.recordWords);
  const setSession = useNotebookStore((s) => s.setSession);
  const duplicateNote = useNotebookStore((s) => s.duplicateNote);
  const togglePin = useNotebookStore((s) => s.togglePin);
  const moveNote = useNotebookStore((s) => s.moveNote);

  const note = notes.find((item) => item.id === activeNoteId) ?? null;
  const [title, setTitle] = useState(note?.title ?? "");
  const [pageIndex, setPageIndex] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const lastWords = useRef(0);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setSaveState("saved");
    const session = useNotebookStore.getState().session;
    if (note && session.noteId === note.id) setPageIndex(session.pageIndex || 0);
    else setPageIndex(0);
    lastWords.current = note ? wordCount(notePages(note)[session.noteId === note.id ? session.pageIndex || 0 : 0] || "") : 0;
  }, [note?.id]);

  useEffect(() => {
    if (!note) return;
    setSession({ noteId: note.id, notebookId: note.notebookId, pageIndex });
  }, [note?.id, note?.notebookId, pageIndex, setSession]);

  const save = useMemo(
    () =>
      debounce((id: string, patch: { title?: string; content?: string }) => {
        updateNote(id, patch);
        setSaveState("saved");
      }, 400),
    [updateNote],
  );

  const savePage = useMemo(
    () =>
      debounce((id: string, index: number, content: string) => {
        updateNotePage(id, index, content);
        setSaveState("saved");
      }, 400),
    [updateNotePage],
  );

  useEffect(() => () => {
    save.flush();
    savePage.flush();
  }, [save, savePage]);

  if (!note) {
    return (
      <section className={cn("flex h-full min-h-0 flex-col quire-page", className)}>
        {onBack ? (
          <div className="flex items-center px-2 pt-3 md:hidden">
            <Button variant="ghost" size="icon" aria-label="Back to pages" onClick={onBack}>
              <ArrowLeft />
            </Button>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">A blank desk</h2>
          <p className="mt-2 max-w-sm text-pretty text-ink-muted">
            Start a page in this notebook, or choose one from the list.
          </p>
          <Button className="mt-5" onClick={() => openRecipeChooser({ mode: "create" })}>
            New page
          </Button>
        </div>
        <footer className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-t border-rule/80 px-3 py-2">
          <span />
          <AmbientDial />
          <span />
        </footer>
      </section>
    );
  }

  const allHtml = notePages(note).join(" ");
  const words = wordCount(allHtml);
  const chars = plainText(allHtml).length;
  const zoomPct = Math.round(prefs.zoom * 100);

  return (
    <section className={cn("relative flex h-full min-h-0 flex-col bg-paper quire-page", className)}>
      <FindBar />
      <header className="flex items-center gap-1 border-b border-rule/80 bg-paper-raised/80 px-2 py-1.5">
        {onBack ? (
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Back to pages" data-mobile-back onClick={onBack}>
            <ArrowLeft />
          </Button>
        ) : null}
        <p className="min-w-0 flex-1 truncate px-2 text-sm text-ink-muted">
          {saveState === "saving" ? "Saving" : "Saved on this device"}
        </p>
        {prefs.wordGoal > 0 ? (
          <span className="hidden px-2 text-xs text-ink-subtle tabular-nums sm:inline">
            {prefs.wordsToday} / {prefs.wordGoal}
          </span>
        ) : null}
        {focusMode ? null : onOpenSettings ? (
          <Button variant="ghost" size="icon-sm" aria-label="Desk settings" onClick={onOpenSettings}>
            <Settings />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={focusMode ? "Exit focus" : "Focus"}
          onClick={() => setFocusMode(!focusMode)}
          className="hidden md:inline-flex"
        >
          {focusMode ? <Minimize2 /> : <Maximize2 />}
        </Button>
        {focusMode ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Page actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => openRecipeChooser({ mode: "change", noteId: note.id, pageIndex })}
            >
              <FileText className="size-4" />
              Change recipe…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => togglePin(note.id)}>
              <Pin className="size-4" />
              {note.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => duplicateNote(note.id)}>
              <Copy className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="mr-2 size-4" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {notebooks.filter((nb) => !nb.deletedAt).map((nb) => (
                  <DropdownMenuItem
                    key={nb.id}
                    disabled={nb.id === note.notebookId}
                    onSelect={() => moveNote(note.id, nb.id)}
                  >
                    {nb.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => exportHtml(title || "Untitled", allHtml)}>
              <Download className="size-4" />
              Export HTML
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportText(title || "Untitled", allHtml)}>
              <FileText className="size-4" />
              Export .TXT
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportRtf(title || "Untitled", allHtml)}>
              <FileText className="size-4" />
              Export .RTF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportDoc(title || "Untitled", allHtml)}>
              <FileText className="size-4" />
              Export .DOC
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportDocx(title || "Untitled", allHtml)}>
              <FileText className="size-4" />
              Export .DOCX
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportPdf(title || "Untitled", allHtml)}>
              <FileText className="size-4" />
              Export .PDF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportMarkdown(title || "Untitled", allHtml)}>
              <Download className="size-4" />
              Export Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openPrintPreview()}>
              <Printer className="size-4" />
              Print preview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </header>

      <RichEditor
        key={`${note.id}:${pageIndex}`}
        note={note}
        title={title}
        pageIndex={pageIndex}
        onPageIndexChange={setPageIndex}
        onTitleChange={(next) => {
          setTitle(next);
          setSaveState("saving");
          save(note.id, { title: next.trim() || "Untitled" });
        }}
        onChange={(next, index) => {
          const nextCount = wordCount(next);
          if (nextCount > lastWords.current) recordWords(nextCount - lastWords.current);
          lastWords.current = nextCount;
          setSaveState("saving");
          savePage(note.id, index, next);
        }}
      />

      <footer className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-t border-rule/80 px-3 py-2 text-xs text-ink-subtle">
        <span className="min-w-0 truncate tabular-nums">
          {prefs.showWordCount ? (
            <>
              {words} {words === 1 ? "word" : "words"}
              <span className="text-ink-subtle/70"> · {chars} characters</span>
            </>
          ) : (
            <span suppressHydrationWarning>Edited {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
          )}
        </span>
        <AmbientDial />
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            className="size-8"
            onClick={() => setPrefs({ zoom: Math.max(0.4, Math.round((prefs.zoom - 0.1) * 10) / 10) })}
          >
            <Minus className="size-3.5" />
          </Button>
          <Slider
            className="w-24"
            min={40}
            max={160}
            step={5}
            value={[zoomPct]}
            onValueChange={([value]) => setPrefs({ zoom: value / 100 })}
            aria-label="Page zoom"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            className="size-8"
            onClick={() => setPrefs({ zoom: Math.min(1.6, Math.round((prefs.zoom + 0.1) * 10) / 10) })}
          >
            <Plus className="size-3.5" />
          </Button>
          <span className="w-9 text-right tabular-nums">{zoomPct}%</span>
        </div>
      </footer>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this page to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              “{title || "Untitled"}” will sit in Trash for 30 days, then be gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteNote(note.id);
                toast("Moved to trash");
                onBack?.();
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
