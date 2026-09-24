import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { EditorContextMenu } from "@/components/editor-context-menu";
import { EditorToolbar } from "@/components/editor-toolbar";
import { PageMapPanel } from "@/components/page-map";
import { PageSheet } from "@/components/page-sheet";
import { ReadBackControls, useStopReadingOnPageChange } from "@/components/read-back-chip";
import { RibbonMarginMarks } from "@/components/ribbon-bookmarks";
import { Button } from "@/components/ui/button";
import { applyDevice, pageFitScale, readDevice } from "@/lib/device";
import { editorExtensions } from "@/lib/editor-extensions";
import { collectImageFiles, insertImages } from "@/lib/image";
import { isHttpUrl, openExternal } from "@/lib/desktop";
import { copyEditorSelection, pasteEditor, registerEditorCommands, setActiveEditor } from "@/lib/editor-commands";
import { isPageEmpty, notePages, splitOverflow } from "@/lib/pages";
import { pageMetaAt, recipeBorder, recipeLabel } from "@/lib/recipes";
import { openRecipeChooser } from "@/lib/recipe-chooser";
import { cancelPendingEdits, flushPendingEdits } from "@/lib/pending-save";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useNotebookStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { cn, debounce } from "@/lib/utils";

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
  const focusMode = useNotebookStore((s) => s.focusMode);
  const inkOnly = Boolean(prefs.inkOnly);
  const insertNotePage = useNotebookStore((s) => s.insertNotePage);
  const setNotePages = useNotebookStore((s) => s.setNotePages);
  const pages = notePages(note);
  const pageCount = Math.max(1, pages.length);
  const safeIndex = Math.min(pageIndex, pageCount - 1);
  const pageHtml = pages[safeIndex] ?? "";
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  useStopReadingOnPageChange(note.id, safeIndex);
  const meta = pageMetaAt(note, safeIndex);
  const effectiveBorder = inkOnly ? "none" : recipeBorder(meta, prefs.border);
  const showRuler = !inkOnly && prefs.showRuler !== false;

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
        const link = target?.closest("a[href]") as HTMLAnchorElement | null;
        if (link?.href && (event.metaKey || event.ctrlKey || event.altKey)) {
          event.preventDefault();
          void openExternal(link.href);
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
    setActiveEditor(editor);
    return () => setActiveEditor(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const session = useNotebookStore.getState().session;
    if (session.noteId === note.id && session.pageIndex === safeIndex && session.cursor > 0) {
      const max = editor.state.doc.content.size;
      editor.commands.setTextSelection(Math.min(session.cursor, Math.max(1, max)));
    }
  }, [editor, note.id, safeIndex]);

  useEffect(() => {
    if (!editor) return;
    const current = editor;
    const saveCursor = debounce(() => {
      useNotebookStore.getState().setSession({
        noteId: note.id,
        notebookId: note.notebookId,
        pageIndex: safeIndex,
        cursor: current.state.selection.from,
      });
    }, 350);
    function typewriter() {
      const state = useNotebookStore.getState();
      if (!state.focusMode || !state.prefs.typewriter) return;
      const scroller = sheetRef.current?.closest(".overflow-auto") as HTMLElement | null;
      if (!scroller) return;
      const coords = current.view.coordsAtPos(current.state.selection.from);
      const box = scroller.getBoundingClientRect();
      scroller.scrollTop += coords.top - box.top - box.height * 0.42;
    }
    current.on("selectionUpdate", saveCursor);
    current.on("selectionUpdate", typewriter);
    return () => {
      current.off("selectionUpdate", saveCursor);
      current.off("selectionUpdate", typewriter);
    };
  }, [editor, note.id, note.notebookId, safeIndex]);

  useEffect(() => {
    if (!editor) return;
    return registerEditorCommands((command) => {
      if (command === "undo") return editor.chain().focus().undo().run();
      if (command === "redo") return editor.chain().focus().redo().run();
      if (command === "bold") return editor.chain().focus().toggleBold().run();
      if (command === "italic") return editor.chain().focus().toggleItalic().run();
      if (command === "underline") return editor.chain().focus().toggleUnderline().run();
      if (command === "selectAll") return editor.chain().focus().selectAll().run();
      if (command === "copy") {
        void copyEditorSelection(editor, false);
        return true;
      }
      if (command === "cut") {
        void copyEditorSelection(editor, true);
        return true;
      }
      if (command === "paste") {
        void pasteEditor(editor);
        return true;
      }
      return false;
    });
  }, [editor]);

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

  const [linkChip, setLinkChip] = useState<{ href: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    function onMove(event: MouseEvent) {
      const hit = (event.target as HTMLElement | null)?.closest?.("a[href], img[data-href]") as HTMLElement | null;
      if (!hit) {
        setLinkChip(null);
        return;
      }
      const href = hit.getAttribute("href") || hit.getAttribute("data-href") || "";
      if (!isHttpUrl(href)) {
        setLinkChip(null);
        return;
      }
      const rect = hit.getBoundingClientRect();
      setLinkChip({ href, x: rect.left, y: rect.top });
    }
    function onLeave() {
      setLinkChip(null);
    }
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [editor]);

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
        cancelPendingEdits();
        const current = [...pagesRef.current];
        current[safeIndex] = editor.getHTML();
        const nextIndex = safeIndex + 1;
        const keptIndex = safeIndex;
        if (current[nextIndex]) {
          current[nextIndex] = `${moved.html}${current[nextIndex]}`;
          setNotePages(note.id, current, { prependAt: nextIndex, shift: moved.size });
        } else {
          current.splice(nextIndex, 0, moved.html);
          setNotePages(note.id, current, { insertAt: nextIndex });
        }
        const kept = editor.getHTML();
        splittingRef.current = false;
        onChangeRef.current(kept, keptIndex);
        if (editor.view.hasFocus()) onPageIndexChange(nextIndex);
        setOversized(false);
      } else {
        setOversized(true);
        splittingRef.current = false;
      }
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
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => {
      window.clearTimeout(timer);
      editor.off("update", checkOverflow);
      editor.view.dom.removeEventListener("load", onLoad, true);
      ro.disconnect();
    };
  }, [editor, note.id, safeIndex, onPageIndexChange, setNotePages, prefs.pageOrientation, prefs.pageWidth, prefs.pageHeight]);

  const zoom = prefs.zoom;
  const pageWidth = Number(prefs.pageWidth) > 0 ? Number(prefs.pageWidth) : 8.5;
  const pageHeight = Number(prefs.pageHeight) > 0 ? Number(prefs.pageHeight) : 11;
  const deskRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [phone, setPhone] = useState(false);
  const spreadOn = Boolean(prefs.spread) && !phone;

  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;
    function measure() {
      const box = deskRef.current;
      if (!box) return;
      const device = applyDevice(readDevice());
      setPhone(device.kind === "phone");
      const useSpread = Boolean(prefs.spread) && device.kind !== "phone";
      setFit(
        pageFitScale(
          box.clientWidth,
          box.clientHeight,
          useSpread ? pageWidth * 2 + 0.45 : pageWidth,
          pageHeight,
          device.kind,
        ),
      );
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(desk);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [pageWidth, pageHeight, prefs.pageOrientation, prefs.spread]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editor && !focusMode ? (
        <EditorToolbar editor={editor} note={note} pageIndex={safeIndex} />
      ) : focusMode ? (
        <div className="flex items-center justify-end gap-2 border-b border-rule/40 bg-transparent px-2 py-1">
          <ReadBackControls editor={editor} />
        </div>
      ) : (
        <div className="h-12 border-b border-rule bg-paper-raised" />
      )}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <div ref={deskRef} className="min-h-0 flex-1 overflow-auto">
        <div
          className="mx-auto flex w-full max-w-full flex-col items-center px-3 pt-4 pb-16 md:px-6 md:pt-5"
          style={{ zoom: fit * zoom } as React.CSSProperties}
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
            style={{ maxWidth: spreadOn ? `${pageWidth * 2 + 0.45}in` : `${pageWidth}in` }}
          />
          {!focusMode && !inkOnly ? (
            <button
              type="button"
              className="recipe-chip mb-2"
              title="Page recipe"
              onClick={() => openRecipeChooser({ mode: "change", noteId: note.id, pageIndex: safeIndex })}
            >
              {recipeLabel(meta.recipe)}
            </button>
          ) : null}
          <div className={cn("flex items-start justify-center gap-4", spreadOn && "quire-spread")}>
          <div className="relative">
          <PageSheet
            border={effectiveBorder}
            oversized={oversized}
            width={pageWidth}
            height={pageHeight}
            showRuler={showRuler}
            className={cn("print-sheet", `is-recipe-${meta.recipe}`)}
          >
            <div
              ref={sheetRef}
              data-recipe={meta.recipe}
              className={cn(
                "paper-body px-6 py-6 md:px-8",
                `recipe-${meta.recipe}`,
                oversized && "is-oversized",
                focusMode && prefs.typewriter && "is-typewriter",
              )}
            >
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="quire-doc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageHtml) }} />
              )}
            </div>
          </PageSheet>
          <RibbonMarginMarks editor={editor} note={note} pageIndex={safeIndex} sheetHeight={pageHeight} />
          </div>
          {spreadOn ? (
            <PageSheet
              border={effectiveBorder}
              oversized={false}
              width={pageWidth}
              height={pageHeight}
              showRuler={false}
              className={cn("print-sheet is-facing", `is-recipe-${meta.recipe}`)}
            >
              <div
                data-recipe={meta.recipe}
                className={cn("paper-body px-6 py-6 md:px-8", `recipe-${meta.recipe}`)}
              >
                {pages[safeIndex + 1] ? (
                  <div className="quire-doc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(pages[safeIndex + 1] || "") }} />
                ) : (
                  <p className="pt-8 text-center text-sm text-ink-subtle">Facing page</p>
                )}
              </div>
            </PageSheet>
          ) : null}
          </div>
          {linkChip ? (
            <div
              className="link-chip"
              style={{ left: Math.max(8, linkChip.x), top: Math.max(8, linkChip.y - 36) }}
            >
              <span className="min-w-0 truncate">{linkChip.href}</span>
              <Button size="sm" className="h-7 px-2" onClick={() => void openExternal(linkChip.href)}>
                Open
              </Button>
            </div>
          ) : null}
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
              <span className="text-ink-subtle">
                {" "}
                · {pageWidth} × {pageHeight} in
              </span>
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
                const next = insertNotePage(note.id, safeIndex + 1, undefined, meta.recipe);
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
                  flushPendingEdits();
                  const live = useNotebookStore.getState().notes.find((item) => item.id === note.id);
                  const livePages = live ? notePages(live) : pagesRef.current;
                  const nextPages = livePages.filter((_, i) => i !== safeIndex);
                  setNotePages(note.id, nextPages.length ? nextPages : [""], { removeAt: safeIndex });
                  onPageIndexChange(Math.max(0, safeIndex - 1));
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {editor ? <EditorContextMenu editor={editor} /> : null}
      <PageMapPanel editor={editor} />
      </div>
    </div>
  );
}
