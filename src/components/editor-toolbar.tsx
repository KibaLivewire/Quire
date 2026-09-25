import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  CheckSquare,
  Crop,
  Feather,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  ListTree,
  Search,
  SpellCheck,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import { toast } from "sonner";
import { FontPicker } from "@/components/font-picker";
import { ImageEditor } from "@/components/image-editor";
import { ReadBackControls } from "@/components/read-back-chip";
import { PageNotesControl, SelectionBookmarksControl } from "@/components/page-notes";
import { RibbonBookmarksControl } from "@/components/ribbon-bookmarks";
import { fetchSense, WordLookupCard } from "@/components/word-lookup";
import { checkGrammar, plainOffset, plainRange, sentenceAt, type GrammarIssue } from "@/lib/grammar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FONT_SIZES, HIGHLIGHTS, INK_COLORS } from "@/lib/fonts";
import { BORDER_META } from "@/lib/borders";
import { collectImageFiles, IMAGE_ACCEPT, insertImages, selectedImageSrc } from "@/lib/image";
import { isNativeApp, pickNativeImages } from "@/lib/native";
import { useNotebookStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import type { WordSense } from "@/lib/word-tools";
import { webSearchUrl } from "@/lib/word-tools";
import { cn, escapeHtml } from "@/lib/utils";

function ToolBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          onMouseDown={(event) => event.preventDefault()}
          className={cn("text-ink-muted", active && "bg-paper-inset text-ink")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FlowPick({
  label,
  active,
  onClick,
  kind,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  kind: "inline" | "wrap" | "break" | "behind" | "front";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "flex w-[4.6rem] flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] leading-tight",
        active ? "border-forest bg-paper-inset text-ink" : "border-rule text-ink-muted hover:text-ink",
      )}
    >
      <span className={cn("flow-icon", `is-${kind}`)} aria-hidden />
      {label}
    </button>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs transition-colors duration-150",
        active ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function selectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, " ").trim();
}

export function EditorToolbar({
  editor,
  note,
  pageIndex,
}: {
  editor: Editor;
  note: Note;
  pageIndex: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [sense, setSense] = useState<WordSense | null>(null);
  const [looking, setLooking] = useState(false);
  const grammarBase = useRef(0);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [grammarBusy, setGrammarBusy] = useState(false);
  const suggestions = useNotebookStore((s) => s.prefs.suggestions);
  const grammarOn = useNotebookStore((s) => s.prefs.grammar);
  const dictionary = useNotebookStore((s) => s.prefs.dictionary);
  const pageOrientation = useNotebookStore((s) => s.prefs.pageOrientation) || "portrait";
  const pageBorder = useNotebookStore((s) => s.prefs.border);
  const showRuler = useNotebookStore((s) => s.prefs.showRuler) !== false;
  const quillOn = useNotebookStore((s) => s.prefs.quill) !== false;
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const setQuillOpen = useNotebookStore((s) => s.setQuillOpen);
  const pageMapOpen = useNotebookStore((s) => s.pageMapOpen);
  const setPageMapOpen = useNotebookStore((s) => s.setPageMapOpen);
  const inkOnly = useNotebookStore((s) => s.prefs.inkOnly);
  const savedWord = useRef("");

  useEffect(() => {
    function remember() {
      const text = selectedText(editor);
      if (text) savedWord.current = text;
    }
    editor.on("selectionUpdate", remember);
    editor.on("update", remember);
    return () => {
      editor.off("selectionUpdate", remember);
      editor.off("update", remember);
    };
  }, [editor]);

  const ui = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      h1: ed.isActive("heading", { level: 1 }),
      h2: ed.isActive("heading", { level: 2 }),
      h3: ed.isActive("heading", { level: 3 }),
      bullet: ed.isActive("bulletList"),
      ordered: ed.isActive("orderedList"),
      task: ed.isActive("taskList"),
      quote: ed.isActive("blockquote"),
      table: ed.isActive("table"),
      highlight: ed.getAttributes("highlight").color as string | undefined,
      font: ed.getAttributes("textStyle").fontFamily as string | undefined,
      size: ed.getAttributes("textStyle").fontSize as string | undefined,
      color: ed.getAttributes("textStyle").color as string | undefined,
      center: ed.isActive({ textAlign: "center" }),
      right: ed.isActive({ textAlign: "right" }),
      link: ed.isActive("link") || Boolean(ed.getAttributes("image").href),
      image: ed.isActive("image"),
      imageSrc: selectedImageSrc(ed),
      imageFit: (ed.getAttributes("image").fit as string | undefined) ?? null,
      imageSize: (ed.getAttributes("image").size as string | undefined) ?? null,
      imageAlign: (ed.getAttributes("image").align as string | undefined) ?? "center",
      imageWrap: (ed.getAttributes("image").wrap as string | undefined) ?? null,
      imageFlow: (ed.getAttributes("image").flow as string | undefined) || "inline",
      imageMargin: Number(ed.getAttributes("image").margin ?? 12),
      imageWatermark: (ed.getAttributes("image").watermark as string | undefined) ?? "",
      indent: Number(ed.getAttributes("paragraph").indent || ed.getAttributes("heading").indent || 0),
      lineHeight: (ed.getAttributes("paragraph").lineHeight || ed.getAttributes("heading").lineHeight) as string | null,
      paraSpace: (ed.getAttributes("paragraph").paraSpace || ed.getAttributes("heading").paraSpace) as string | null,
      canUndo: ed.can().undo(),
      canRedo: ed.can().redo(),
    }),
  });

  async function onPickImages(files: FileList | File[] | null) {
    const images = collectImageFiles(files);
    if (!images.length) {
      toast.error("Use a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    try {
      await insertImages(editor, images);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that image.");
    }
  }

  function applyLink(href: string) {
    const url = href.trim();
    if (!url) return;
    if (!/^(https?:\/\/|mailto:)/i.test(url) && !(url.startsWith("#") && !url.startsWith("#//"))) {
      toast.error("Use a web address or an email link.");
      return;
    }
    if (ui.image) {
      editor.chain().focus().updateAttributes("image", { href: url }).run();
    } else {
      editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
    }
  }

  function removeLink() {
    if (ui.image) {
      editor.chain().focus().updateAttributes("image", { href: null }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  }

  function linkToSearch() {
    const query = selectedText(editor) || editor.getAttributes("image").alt || "";
    if (!query) {
      toast.error("Select text or an image caption first.");
      return;
    }
    applyLink(webSearchUrl(query));
    setLinkOpen(false);
  }

  async function openLookup() {
    const word = selectedText(editor) || savedWord.current;
    setLookupOpen(true);
    if (!word) {
      setSense(null);
      return;
    }
    savedWord.current = word;
    setLooking(true);
    setSense(await fetchSense(word));
    setLooking(false);
  }

  function replaceSelection(next: string) {
    editor.chain().focus().insertContent(escapeHtml(next)).run();
    setLookupOpen(false);
  }

  function setBlock(patch: Record<string, unknown>) {
    editor.chain().focus().updateAttributes("paragraph", patch).updateAttributes("heading", patch).run();
  }

  function setImageLayout(patch: Record<string, string | number | null>) {
    editor.chain().updateAttributes("image", patch).run();
  }

  function bumpIndent(delta: number) {
    if (delta > 0 && editor.can().sinkListItem("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();
      return;
    }
    if (delta < 0 && editor.can().liftListItem("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();
      return;
    }
    const current = Number(ui.indent || 0);
    setBlock({ indent: Math.max(0, Math.min(8, current + delta)) });
  }

  async function runGrammar() {
    setGrammarOpen(true);
    setGrammarBusy(true);
    try {
      const full = editor.getText();
      const cursor = plainOffset(editor.state.doc, editor.state.selection.from);
      const sentence = sentenceAt(full, cursor);
      grammarBase.current = sentence.start;
      setGrammarIssues(await checkGrammar(sentence.text, dictionary));
    } catch {
      toast.error("Could not reach the grammar service.");
      setGrammarIssues([]);
    } finally {
      setGrammarBusy(false);
    }
  }

  function applyGrammarFix(issue: GrammarIssue, replacement: string) {
    const base = grammarBase.current;
    const { from, to } = plainRange(editor.state.doc, base + issue.offset, base + issue.offset + issue.length);
    if (from >= 0 && to > from) {
      editor.chain().focus().insertContentAt({ from, to }, escapeHtml(replacement)).run();
    } else {
      toast.error("Could not place that fix on the page.");
    }
  }

  return (
    <div className="border-b border-rule bg-paper-raised/90 backdrop-blur-sm">
      <div className="quire-toolbar-row flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolBtn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 />
        </ToolBtn>
        <ToolBtn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 />
        </ToolBtn>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolBtn label="Bold" active={ui.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold />
        </ToolBtn>
        <ToolBtn label="Italic" active={ui.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic />
        </ToolBtn>
        <ToolBtn
          label="Underline"
          active={ui.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolBtn>
        <ToolBtn label="Strikethrough" active={ui.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolBtn
          label="Heading 1"
          active={ui.h1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 />
        </ToolBtn>
        <ToolBtn
          label="Heading 2"
          active={ui.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolBtn>
        <ToolBtn
          label="Heading 3"
          active={ui.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolBtn
          label="Bulleted list"
          active={ui.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolBtn>
        <ToolBtn
          label="Numbered list"
          active={ui.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolBtn>
        <ToolBtn label="Checklist" active={ui.task} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <CheckSquare />
        </ToolBtn>
        <ToolBtn
          label="Quote"
          active={ui.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolBtn>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Table"
                  className={cn("text-ink-muted", ui.table && "bg-paper-inset text-ink")}
                >
                  <Table2 />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Table</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-48 p-1">
            {ui.table ? (
              <>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                  Add row
                </button>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                  Add column
                </button>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().deleteRow().run()}
                >
                  Delete row
                </button>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                >
                  Delete column
                </button>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().deleteTable().run()}
                >
                  Remove table
                </button>
              </>
            ) : (
              <button
                type="button"
                className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              >
                Insert 3×3 table
              </button>
            )}
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Highlight"
                  className={cn("text-ink-muted", ui.highlight && "bg-paper-inset text-ink")}
                >
                  <Highlighter />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Highlight</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-44">
            <p className="px-1 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">Highlight</p>
            <div className="grid grid-cols-5 gap-1.5">
              {HIGHLIGHTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold",
                    item.swatch,
                  )}
                  style={"color" in item ? { color: "var(--color-highlight-ink)" } : undefined}
                  onClick={() => {
                    if (item.id === "none" || !("color" in item)) {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().toggleHighlight({ color: item.color }).run();
                    }
                  }}
                >
                  {item.id === "none" ? "" : "A"}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <FontPicker editor={editor} current={ui.font} />

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Font size"
                  className="h-9 px-2 text-ink-muted"
                >
                  Size
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Font size</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-40 p-1">
            <button
              type="button"
              className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
              onClick={() => editor.chain().focus().unsetFontSize().run()}
            >
              Default
            </button>
            {FONT_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                className={cn(
                  "flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset",
                  ui.size === size.value && "bg-paper-inset",
                )}
                onClick={() => editor.chain().focus().setFontSize(size.value).run()}
              >
                {size.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Ink color" className="text-ink-muted">
                  <span
                    className="size-3.5 rounded-full border border-rule"
                    style={{ background: ui.color || "var(--color-ink)" }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Ink color</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-40">
            <p className="px-1 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">Ink</p>
            <div className="flex gap-1.5">
              {INK_COLORS.map((ink) => (
                <button
                  key={ink.id}
                  type="button"
                  aria-label={ink.label}
                  className={cn("size-7 rounded-md", ink.swatch)}
                  onClick={() => editor.chain().focus().setColor(ink.color).run()}
                />
              ))}
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-paper-inset"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Reset
            </button>
          </PopoverContent>
        </Popover>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Alignment" className="text-ink-muted">
                  {ui.center ? <AlignCenter /> : ui.right ? <AlignRight /> : <AlignLeft />}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Alignment</TooltipContent>
          </Tooltip>
          <PopoverContent className="flex w-auto gap-0.5 p-1">
            <ToolBtn label="Align left" active={!ui.center && !ui.right} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <AlignLeft />
            </ToolBtn>
            <ToolBtn label="Align center" active={ui.center} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <AlignCenter />
            </ToolBtn>
            <ToolBtn label="Align right" active={ui.right} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <AlignRight />
            </ToolBtn>
          </PopoverContent>
        </Popover>

        <ToolBtn label="Decrease indent" onClick={() => bumpIndent(-1)}>
          <IndentDecrease />
        </ToolBtn>
        <ToolBtn label="Increase indent" onClick={() => bumpIndent(1)}>
          <IndentIncrease />
        </ToolBtn>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-ink-muted" aria-label="Line spacing">
                  Spacing
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Line & paragraph spacing</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-52 p-2">
            <p className="px-1 pb-1 text-xs font-medium tracking-wide text-ink-subtle uppercase">Line</p>
            {[
              ["1", "Single"],
              ["1.15", "1.15"],
              ["1.5", "1.5"],
              ["2", "Double"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-paper-inset",
                  ui.lineHeight === value && "bg-paper-inset",
                )}
                onClick={() => setBlock({ lineHeight: value })}
              >
                {label}
              </button>
            ))}
            <p className="mt-2 px-1 pb-1 text-xs font-medium tracking-wide text-ink-subtle uppercase">Paragraph</p>
            {[
              ["tight", "Tight"],
              ["normal", "Normal"],
              ["loose", "Loose"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-paper-inset",
                  ui.paraSpace === value && "bg-paper-inset",
                )}
                onClick={() => setBlock({ paraSpace: value })}
              >
                {label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Page formatting"
                  className="h-9 gap-1.5 px-2 text-ink-muted"
                >
                  {pageOrientation === "landscape" ? <RectangleHorizontal /> : <RectangleVertical />}
                  Page
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Page formatting</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-72 p-3">
            <p className="px-0.5 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">
              Page formatting
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={pageOrientation === "portrait"}
                onClick={() => setPrefs({ pageOrientation: "portrait", pageWidth: 8.5, pageHeight: 11 })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-sm",
                  pageOrientation === "portrait" ? "border-forest bg-paper-inset text-ink" : "border-rule text-ink-muted hover:text-ink",
                )}
              >
                <span className="block h-14 w-10 rounded-sm bg-paper-raised shadow-[inset_0_0_0_1px_var(--color-rule)]" />
                Portrait
                <span className="text-[10px] text-ink-subtle">8.5 × 11 in</span>
              </button>
              <button
                type="button"
                aria-pressed={pageOrientation === "landscape"}
                onClick={() => setPrefs({ pageOrientation: "landscape", pageWidth: 11, pageHeight: 8.5 })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-sm",
                  pageOrientation === "landscape" ? "border-forest bg-paper-inset text-ink" : "border-rule text-ink-muted hover:text-ink",
                )}
              >
                <span className="block h-10 w-14 rounded-sm bg-paper-raised shadow-[inset_0_0_0_1px_var(--color-rule)]" />
                Landscape
                <span className="text-[10px] text-ink-subtle">11 × 8.5 in</span>
              </button>
            </div>
            <label className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-paper px-2 py-2 text-sm">
              Ruler
              <input
                type="checkbox"
                checked={showRuler}
                onChange={(event) => setPrefs({ showRuler: event.target.checked })}
              />
            </label>
            <p className="mt-3 px-0.5 pb-1.5 text-xs font-medium tracking-wide text-ink-subtle uppercase">Border</p>
            <div className="grid grid-cols-5 gap-1.5">
              {BORDER_META.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-pressed={pageBorder === item.id}
                  onClick={() => setPrefs({ border: item.id })}
                  className={cn(
                    "rounded-lg border p-1",
                    pageBorder === item.id ? "border-forest" : "border-rule hover:bg-paper-inset",
                  )}
                >
                  <span data-border={item.id} className="border-swatch !h-6" />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            void onPickImages(e.target.files);
            e.target.value = "";
          }}
        />
        <ToolBtn
          label="Insert image"
          onClick={() => {
            if (isNativeApp()) {
              void pickNativeImages()
                .then((files) => onPickImages(files))
                .catch((error) => toast.error(error instanceof Error ? error.message : "Could not add that image."));
              return;
            }
            fileRef.current?.click();
          }}
        >
          <ImagePlus />
        </ToolBtn>
        {ui.image ? (
          <ToolBtn label="Edit image" onClick={() => setEditOpen(true)}>
            <Crop />
          </ToolBtn>
        ) : null}

        <Popover
          open={linkOpen}
          onOpenChange={(open) => {
            setLinkOpen(open);
            if (open) {
              const href = ui.image
                ? String(editor.getAttributes("image").href ?? "")
                : String(editor.getAttributes("link").href ?? "");
              setLinkUrl(href);
            }
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Link"
                  className={cn("text-ink-muted", ui.link && "bg-paper-inset text-ink")}
                >
                  <Link2 />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Link</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-72 space-y-2">
            <p className="text-xs text-ink-muted">
              Link selected text or a picture. Use a web search for a quick look-up.
            </p>
            <Input
              placeholder="https://"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyLink(linkUrl);
                  setLinkOpen(false);
                }
              }}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={linkToSearch}>
                <Search className="size-3.5" />
                Search
              </Button>
              {ui.link ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    removeLink();
                    setLinkOpen(false);
                  }}
                >
                  Remove
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={() => {
                  applyLink(linkUrl);
                  setLinkOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {suggestions ? (
          <Popover open={lookupOpen} onOpenChange={setLookupOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Look up word"
                    className="text-ink-muted"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      const text = selectedText(editor);
                      if (text) savedWord.current = text;
                    }}
                    onClick={() => void openLookup()}
                  >
                    <BookOpen />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Look up word</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-96 max-h-96 overflow-y-auto">
              <WordLookupCard sense={sense} loading={looking} onReplace={replaceSelection} />
            </PopoverContent>
          </Popover>
        ) : null}

        {grammarOn ? (
          <Popover open={grammarOpen} onOpenChange={setGrammarOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Spelling and grammar"
                    className="text-ink-muted"
                    onClick={() => void runGrammar()}
                  >
                    <SpellCheck />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Spelling & grammar</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-80 max-h-80 overflow-y-auto">
              <p className="pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">Grammar</p>
              {grammarBusy ? <p className="text-sm text-ink-muted">Checking…</p> : null}
              {!grammarBusy && grammarIssues.length === 0 ? (
                <p className="text-sm text-ink-muted">No issues found, or the checker is offline.</p>
              ) : null}
              <ul className="space-y-2">
                {grammarIssues.map((issue, index) => (
                  <li key={`${issue.offset}-${index}`} className="rounded-lg bg-paper px-2 py-2">
                    <p className="text-sm text-ink">{issue.message}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {issue.replacements.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="rounded-full bg-paper-inset px-2 py-0.5 text-xs hover:text-ink"
                          onClick={() => applyGrammarFix(issue, item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : null}

        <ToolBtn label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus />
        </ToolBtn>
        <ToolBtn label="Page map" active={pageMapOpen} onClick={() => setPageMapOpen(!pageMapOpen)}>
          <ListTree />
        </ToolBtn>
        <SelectionBookmarksControl editor={editor} />
        <PageNotesControl editor={editor} />
        <RibbonBookmarksControl editor={editor} note={note} pageIndex={pageIndex} />
        <ReadBackControls editor={editor} />
        {quillOn ? (
          <ToolBtn label="Quill" onClick={() => setQuillOpen(true)}>
            <Feather />
          </ToolBtn>
        ) : null}

        <ImageEditor
          open={editOpen}
          src={ui.imageSrc}
          onOpenChange={setEditOpen}
          onApply={(result) => editor.chain().focus().updateAttributes("image", result).run()}
        />
      </div>

      {ui.image && !inkOnly ? (
        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-rule/70 px-2 py-1.5"
          onMouseDown={(event) => event.preventDefault()}
        >
          <span className="pr-1 text-xs font-medium tracking-wide text-ink-subtle uppercase">Picture</span>
          <Chip
            label="Fit"
            active={ui.imageFit === "fit"}
            onClick={() => setImageLayout({ fit: "fit", size: null, wrap: null })}
          />
          <Chip
            label="Stretch"
            active={ui.imageFit === "stretch"}
            onClick={() => setImageLayout({ fit: "stretch", size: null, wrap: null })}
          />
          <Chip
            label="Fill"
            active={ui.imageFit === "fill"}
            onClick={() => setImageLayout({ fit: "fill", size: null, wrap: null })}
          />
          <Chip
            label="Watermark"
            active={ui.imageFit === "watermark" || Boolean(ui.imageWatermark)}
            onClick={() =>
              setImageLayout({
                fit: "watermark",
                size: null,
                wrap: "left",
                watermark: ui.imageWatermark || "Quire",
              })
            }
          />
          <input
            type="text"
            value={ui.imageWatermark}
            placeholder="Watermark text"
            aria-label="Watermark text"
            className="h-7 w-36 rounded-md border border-rule bg-paper px-2 text-xs text-ink"
            onChange={(event) => setImageLayout({ watermark: event.target.value, fit: "watermark" })}
          />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Chip label="S" active={ui.imageSize === "small"} onClick={() => setImageLayout({ size: "small", fit: null })} />
          <Chip label="M" active={ui.imageSize === "medium"} onClick={() => setImageLayout({ size: "medium", fit: null })} />
          <Chip label="L" active={ui.imageSize === "large"} onClick={() => setImageLayout({ size: "large", fit: null })} />
          <Chip label="Full" active={ui.imageSize === "full"} onClick={() => setImageLayout({ size: "full", fit: null })} />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Chip
            label="Left"
            active={ui.imageAlign === "left"}
            onClick={() => setImageLayout({ align: "left", wrap: ui.imageFlow === "wrap" ? "left" : null })}
          />
          <Chip
            label="Center"
            active={ui.imageAlign === "center" && ui.imageFlow !== "wrap"}
            onClick={() => setImageLayout({ align: "center", wrap: null })}
          />
          <Chip
            label="Right"
            active={ui.imageAlign === "right"}
            onClick={() => setImageLayout({ align: "right", wrap: ui.imageFlow === "wrap" ? "right" : null })}
          />
        </div>
      ) : null}
      {ui.image ? (
        <div
          className="flex flex-wrap items-end gap-2 border-t border-rule/70 px-2 py-2"
          onMouseDown={(event) => event.preventDefault()}
        >
          <span className="w-full text-[10px] font-medium tracking-wide text-ink-subtle uppercase">
            With text
          </span>
          <FlowPick
            kind="inline"
            label="Inline with text"
            active={(ui.imageFlow || "inline") === "inline" && !ui.imageWrap}
            onClick={() => setImageLayout({ flow: "inline", wrap: null })}
          />
          <FlowPick
            kind="wrap"
            label="Wrap text"
            active={ui.imageFlow === "wrap" || ui.imageWrap === "left" || ui.imageWrap === "right"}
            onClick={() =>
              setImageLayout({
                flow: "wrap",
                wrap: ui.imageAlign === "right" ? "right" : "left",
                align: ui.imageAlign === "right" ? "right" : "left",
                fit: ui.imageFit === "fit" || ui.imageFit === "stretch" || ui.imageFit === "fill" ? null : ui.imageFit,
              })
            }
          />
          <FlowPick
            kind="break"
            label="Break text"
            active={ui.imageFlow === "break"}
            onClick={() => setImageLayout({ flow: "break", wrap: null })}
          />
          <FlowPick
            kind="behind"
            label="Behind text"
            active={ui.imageFlow === "behind"}
            onClick={() => setImageLayout({ flow: "behind", wrap: null })}
          />
          <FlowPick
            kind="front"
            label="In front of text"
            active={ui.imageFlow === "front"}
            onClick={() => setImageLayout({ flow: "front", wrap: null })}
          />
          <div className="ml-2 min-w-36">
            <p className="mb-1 text-[10px] font-medium tracking-wide text-ink-subtle uppercase">
              Text margin {ui.imageMargin}px
            </p>
            <Slider
              min={0}
              max={48}
              value={[ui.imageMargin || 0]}
              onValueChange={([value]) => setImageLayout({ margin: value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
