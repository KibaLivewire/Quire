import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Menu, Pin, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotebookStore } from "@/lib/store";
import { cn, plainText } from "@/lib/utils";

export function NoteList({
  onOpenNote,
  onOpenNotebooks,
  className,
}: {
  onOpenNote?: () => void;
  onOpenNotebooks?: () => void;
  className?: string;
}) {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const notes = useNotebookStore((s) => s.notes);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const activeNoteId = useNotebookStore((s) => s.activeNoteId);
  const setActiveNote = useNotebookStore((s) => s.setActiveNote);
  const createNote = useNotebookStore((s) => s.createNote);
  const [query, setQuery] = useState("");

  const notebook = notebooks.find((nb) => nb.id === activeNotebookId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((note) => note.notebookId === activeNotebookId)
      .filter((note) => {
        if (!q) return true;
        return (
          note.title.toLowerCase().includes(q) ||
          plainText(note.content).toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
      );
  }, [notes, activeNotebookId, query]);

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-rule bg-paper-raised safe-pad",
        className,
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-4 pb-3">
        {onOpenNotebooks ? (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Notebooks"
            onClick={onOpenNotebooks}
          >
            <Menu className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight font-semibold tracking-tight text-ink">
            {notebook?.name ?? "Pages"}
          </p>
          <p className="text-xs text-ink-subtle">
            {filtered.length} {filtered.length === 1 ? "page" : "pages"}
          </p>
        </div>
        <Button
          size="icon"
          aria-label="New page"
          onClick={() => {
            createNote();
            onOpenNote?.();
          }}
        >
          <Plus className="size-4" />
        </Button>
      </header>

      <div className="px-3 pb-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages"
            className="h-10 bg-paper pl-9"
            aria-label="Search pages"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="font-display text-base font-medium text-ink">No pages yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              {query ? "Nothing matches that search." : "Start a page in this notebook."}
            </p>
            {!query ? (
              <Button
                className="mt-4"
                onClick={() => {
                  createNote();
                  onOpenNote?.();
                }}
              >
                New page
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((note) => {
              const active = note.id === activeNoteId;
              const snippet = plainText(note.content);
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNote(note.id);
                      onOpenNote?.();
                    }}
                    className={cn(
                      "flex w-full flex-col rounded-xl px-3 py-3 text-left transition-colors duration-150",
                      active ? "bg-paper-inset" : "hover:bg-paper",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">
                        {note.title || "Untitled"}
                      </span>
                      {note.pinned ? (
                        <Pin className="mt-0.5 size-3.5 shrink-0 fill-current text-ink-muted" />
                      ) : null}
                    </span>
                    {snippet ? (
                      <span className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink-muted">
                        {snippet}
                      </span>
                    ) : null}
                    <span className="mt-1.5 text-xs text-ink-subtle tabular-nums" suppressHydrationWarning>
                      {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
