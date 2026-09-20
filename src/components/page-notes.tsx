import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BookmarkPlus, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  applyPageBookmark,
  applyPageNote,
  BOOKMARK_TONES,
  collectPageBookmarks,
  collectPageNotes,
  jumpToRange,
  removeMarkById,
  updatePageNoteBody,
  type BookmarkTone,
} from "@/lib/page-marks";
import { cn } from "@/lib/utils";

function selected(editor: Editor) {
  const { from, to } = editor.state.selection;
  return from !== to;
}

export function SelectionBookmarksControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const bookmarks = useEditorState({
    editor,
    selector: ({ editor: ed }) => collectPageBookmarks(ed),
  });

  function paint(color: BookmarkTone) {
    if (!selected(editor)) {
      toast.error("Select a letter, word, or passage first.");
      return;
    }
    applyPageBookmark(editor, color);
    toast("Bookmark placed");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Color bookmarks"
              className={cn("text-ink-muted", bookmarks.length > 0 && "text-ink")}
              onMouseDown={(event) => event.preventDefault()}
            >
              <BookmarkPlus className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Color bookmark</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72" align="end">
        <p className="font-display text-sm text-ink">Bookmarks</p>
        <p className="mt-0.5 text-xs text-ink-muted">Color a selected word or sentence so you can find it again.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BOOKMARK_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              aria-label={tone.label}
              className={cn("quire-bookmark-chip", `is-${tone.id}`)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => paint(tone.id)}
            >
              {tone.label}
            </button>
          ))}
        </div>
        {bookmarks.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No color bookmarks on this sheet.</p>
        ) : (
          <ul className="mt-3 max-h-52 space-y-1 overflow-y-auto">
            {bookmarks.map((item) => (
              <li key={item.id} className="flex items-center gap-1 rounded-lg bg-paper px-2 py-1.5">
                <span className={cn("quire-bookmark-dot", `is-${item.color}`)} aria-hidden />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm text-ink"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    jumpToRange(editor, item.from, item.to);
                    setOpen(false);
                  }}
                >
                  {item.snippet || "Bookmark"}
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => removeMarkById(editor, "pageBookmark", item.id)}
                >
                  Untie
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PageNotesControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const notes = useEditorState({
    editor,
    selector: ({ editor: ed }) => collectPageNotes(ed),
  });

  useEffect(() => {
    function onOpen(event: Event) {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      setOpen(true);
      if (id) setActiveId(id);
    }
    window.addEventListener("quire-open-note", onOpen);
    return () => window.removeEventListener("quire-open-note", onOpen);
  }, []);

  function add() {
    if (!selected(editor)) {
      toast.error("Select a letter, word, or passage first.");
      return;
    }
    if (!draft.trim()) {
      toast.error("Write the note first.");
      return;
    }
    if (applyPageNote(editor, draft)) {
      setDraft("");
      toast("Note added");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Page notes"
              className={cn("text-ink-muted", notes.length > 0 && "text-ink")}
              onMouseDown={(event) => event.preventDefault()}
            >
              <StickyNote className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notes</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="end">
        <p className="font-display text-sm text-ink">Notes</p>
        <p className="mt-0.5 text-xs text-ink-muted">A number in brackets sits beside the passage. Hover it to read the note.</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a note for the selection…"
          aria-label="New note"
          rows={3}
          className="mt-2 w-full resize-none rounded-md border border-rule bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        <Button type="button" size="sm" className="mt-2" onClick={add}>
          Add note
        </Button>
        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No notes on this sheet.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {notes.map((item) => (
              <li
                key={item.id}
                className={cn("rounded-lg bg-paper px-2 py-2", activeId === item.id && "ring-1 ring-forest/40")}
              >
                <button
                  type="button"
                  className="flex w-full items-baseline gap-2 text-left"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    jumpToRange(editor, item.from, item.to);
                    setActiveId(item.id);
                  }}
                >
                  <span className="font-medium text-forest tabular-nums">[{item.index}]</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.snippet || "Passage"}</span>
                </button>
                <textarea
                  value={item.body}
                  aria-label={`Note ${item.index}`}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-md border border-rule bg-paper-raised px-2 py-1.5 text-sm text-ink"
                  onChange={(event) => updatePageNoteBody(editor, item.id, event.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 px-2"
                  onClick={() => removeMarkById(editor, "pageNote", item.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
