import { useRef, useState } from "react";
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
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Search,
  Strikethrough,
  Underline,
} from "lucide-react";
import { toast } from "sonner";
import { FontPicker } from "@/components/font-picker";
import { ImageEditor } from "@/components/image-editor";
import { fetchSense, WordLookupCard } from "@/components/word-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FONT_SIZES, HIGHLIGHTS, INK_COLORS } from "@/lib/fonts";
import { collectImageFiles, IMAGE_ACCEPT, insertImages, selectedImageSrc } from "@/lib/image";
import { useNotebookStore } from "@/lib/store";
import type { WordSense } from "@/lib/word-tools";
import { webSearchUrl } from "@/lib/word-tools";
import { cn } from "@/lib/utils";

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
          className={cn("text-ink-muted", active && "bg-paper-inset text-ink")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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

export function EditorToolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [sense, setSense] = useState<WordSense | null>(null);
  const [looking, setLooking] = useState(false);
  const suggestions = useNotebookStore((s) => s.prefs.suggestions);

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
    }),
  });

  async function onPickImages(files: FileList | null) {
    const images = collectImageFiles(files);
    if (!images.length) {
      toast.error("Use a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    try {
      await insertImages(editor, images);
    } catch {
      toast.error("Could not add that image.");
    }
  }

  function applyLink(href: string) {
    const url = href.trim();
    if (!url) return;
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
    const word = selectedText(editor);
    setLookupOpen(true);
    if (!word) {
      setSense(null);
      return;
    }
    setLooking(true);
    setSense(await fetchSense(word));
    setLooking(false);
  }

  function replaceSelection(next: string) {
    editor.chain().focus().insertContent(next).run();
    setLookupOpen(false);
  }

  function setImageLayout(patch: Record<string, string | null>) {
    editor.chain().focus().updateAttributes("image", patch).run();
  }

  return (
    <div className="border-b border-rule bg-paper-raised/90 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
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
        <ToolBtn label="Insert image" onClick={() => fileRef.current?.click()}>
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
                    onClick={() => void openLookup()}
                  >
                    <BookOpen />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Look up word</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-80">
              <WordLookupCard sense={sense} loading={looking} onReplace={replaceSelection} />
            </PopoverContent>
          </Popover>
        ) : null}

        <ToolBtn label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus />
        </ToolBtn>

        <ImageEditor
          open={editOpen}
          src={ui.imageSrc}
          onOpenChange={setEditOpen}
          onApply={(next) => editor.chain().focus().updateAttributes("image", { src: next }).run()}
        />
      </div>

      {ui.image ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule/70 px-2 py-1.5">
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
            active={ui.imageFit === "watermark"}
            onClick={() => setImageLayout({ fit: "watermark", size: null, align: "right", wrap: null })}
          />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Chip label="S" active={ui.imageSize === "small"} onClick={() => setImageLayout({ size: "small", fit: null })} />
          <Chip label="M" active={ui.imageSize === "medium"} onClick={() => setImageLayout({ size: "medium", fit: null })} />
          <Chip label="L" active={ui.imageSize === "large"} onClick={() => setImageLayout({ size: "large", fit: null })} />
          <Chip label="Full" active={ui.imageSize === "full"} onClick={() => setImageLayout({ size: "full", fit: null })} />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Chip
            label="Left"
            active={ui.imageAlign === "left" && !ui.imageWrap}
            onClick={() => setImageLayout({ align: "left", wrap: null })}
          />
          <Chip
            label="Center"
            active={ui.imageAlign === "center" && !ui.imageWrap}
            onClick={() => setImageLayout({ align: "center", wrap: null })}
          />
          <Chip
            label="Right"
            active={ui.imageAlign === "right" && !ui.imageWrap}
            onClick={() => setImageLayout({ align: "right", wrap: null })}
          />
          <Chip
            label="Wrap left"
            active={ui.imageWrap === "left"}
            onClick={() =>
              setImageLayout({
                wrap: "left",
                align: "left",
                fit: ui.imageFit === "fit" || ui.imageFit === "stretch" || ui.imageFit === "fill" ? null : ui.imageFit,
              })
            }
          />
          <Chip
            label="Wrap right"
            active={ui.imageWrap === "right"}
            onClick={() =>
              setImageLayout({
                wrap: "right",
                align: "right",
                fit: ui.imageFit === "fit" || ui.imageFit === "stretch" || ui.imageFit === "fill" ? null : ui.imageFit,
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
