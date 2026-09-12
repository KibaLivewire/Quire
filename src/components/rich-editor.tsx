import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor-toolbar";
import { PageSheet } from "@/components/page-sheet";
import { Button } from "@/components/ui/button";
import { editorExtensions } from "@/lib/editor-extensions";
import { collectImageFiles, insertImages } from "@/lib/image";
import { isPageEmpty, notePages, splitOverflow } from "@/lib/pages";
import { useNotebookStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RichEditor({
  note,
  title,
  pageIndex,
  onPageIndexChange,
  onTitleChange,
  onChange,
}: {
  note: Note;
  title: string;
  pageIndex: number;
  onPageIndexChange: (index: number) => void;
  onTitleChange: (title: string) => void;
  onChange: (html: string, pageIndex: number) => void;
}) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const splittingRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [oversized, setOversized] = useState(false);

  const prefs = useNotebookStore((s) => s.prefs);
  const insertNotePage = useNotebookStore((s) => s.insertNotePage);
  const setNotePages = useNotebookStore((s) => s.setNotePages);
  const pages = notePages(note);
  const pageCount = Math.max(1, pages.length);
  const safeIndex = Math.min(pageIndex, pageCount - 1);
  const pageHtml = pages[safeIndex] ?? "";
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: pageHtml || "",
    editorProps: {
      attributes: {
        class: "quire-doc tiptap min-h-full px-1 pb-6 focus:outline-none",
        spellcheck: prefs.spellcheck ? "true" : "false",
      },
      handlePaste(_view, event) {
        const files = collectImageFiles(event.clipboardData?.files);
        if (!files.length || !editorRef.current) return false;
        event.preventDefault();
        void insertImages(editorRef.current, files).catch(() =>
          toast.error("Could not paste that image."),
        );
        return true;
      },
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false;
        const files = collectImageFiles(event.dataTransfer?.files);
        if (!files.length || !editorRef.current) return false;
        event.preventDefault();
        void insertImages(editorRef.current, files).catch(() =>
          toast.error("Could not add that image."),
        );
        return true;
      },
      handleClick(_view, _pos, event) {
        const target = event.target as HTMLElement | null;
        if (target?.closest("a.quire-image-link")) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (splittingRef.current) return;
      onChangeRef.current(ed.getHTML(), safeIndex);
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          class: "quire-doc tiptap min-h-full px-1 pb-6 focus:outline-none",
          spellcheck: prefs.spellcheck ? "true" : "false",
        },
      },
    });
  }, [editor, prefs.spellcheck]);

  useEffect(() => {
    if (!editor) return;

    function checkOverflow() {
      if (!editor || splittingRef.current) return;
      const root = editor.view.dom;
      const maxHeight = sheetRef.current
        ? Math.max(180, sheetRef.current.clientHeight - 48)
        : 640;
      const overflowed = root.scrollHeight > maxHeight + 12;
      if (!overflowed) {
        setOversized(false);
        return;
      }
      splittingRef.current = true;
      const moved = splitOverflow(editor, maxHeight);
      if (moved) {
        const current = [...pagesRef.current];
        current[safeIndex] = editor.getHTML();
        const nextIndex = safeIndex + 1;
        if (current[nextIndex]) {
          current[nextIndex] = `${moved}${current[nextIndex]}`;
        } else {
          current.splice(nextIndex, 0, moved);
        }
        setNotePages(note.id, current);
        if (editor.view.hasFocus()) onPageIndexChange(nextIndex);
        setOversized(false);
      } else {
        setOversized(true);
      }
      splittingRef.current = false;
    }

    const timer = window.setTimeout(checkOverflow, 120);
    editor.on("update", checkOverflow);
    const onLoad = () => checkOverflow();
    editor.view.dom.addEventListener("load", onLoad, true);
    editor.view.dom.querySelectorAll("img").forEach((img) => {
      if (img.complete) checkOverflow();
    });
    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(editor.view.dom);
    return () => {
      window.clearTimeout(timer);
      editor.off("update", checkOverflow);
      editor.view.dom.removeEventListener("load", onLoad, true);
      ro.disconnect();
    };
  }, [editor, note.id, safeIndex, onPageIndexChange, setNotePages]);

  const zoom = prefs.zoom;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editor ? (
        <EditorToolbar editor={editor} />
      ) : (
        <div className="h-12 border-b border-rule bg-paper-raised" />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="mx-auto w-full max-w-3xl px-4 pt-5 pb-16 md:px-6"
          style={{ zoom } as React.CSSProperties}
        >
          <textarea
            value={title}
            rows={1}
            placeholder="Title"
            aria-label="Page title"
            suppressHydrationWarning
            onChange={(e) => {
              onTitleChange(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor?.commands.focus("start");
              }
            }}
            className="mb-4 w-full resize-none bg-transparent font-display text-3xl leading-tight font-semibold tracking-tight text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <PageSheet border={prefs.border} oversized={oversized}>
            <div
              ref={sheetRef}
              className={cn("paper-body px-6 py-6 md:px-8", oversized && "is-oversized")}
            >
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="quire-doc" dangerouslySetInnerHTML={{ __html: pageHtml }} />
              )}
            </div>
          </PageSheet>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-ink-muted">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous sheet"
              disabled={safeIndex === 0}
              onClick={() => onPageIndexChange(Math.max(0, safeIndex - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">
              Sheet {safeIndex + 1} of {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next sheet"
              disabled={safeIndex >= pageCount - 1}
              onClick={() => onPageIndexChange(Math.min(pageCount - 1, safeIndex + 1))}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = insertNotePage(note.id, safeIndex + 1, "");
                onPageIndexChange(next);
              }}
            >
              <Plus className="size-3.5" />
              Sheet
            </Button>
            {pageCount > 1 && isPageEmpty(pageHtml) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const nextPages = pages.filter((_, i) => i !== safeIndex);
                  setNotePages(note.id, nextPages.length ? nextPages : [""]);
                  onPageIndexChange(Math.max(0, safeIndex - 1));
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
