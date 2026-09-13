import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, Filter, Folder, Menu, Pin, Plus, Search } from "lucide-react";
import { ColorSwatches } from "@/components/color-swatches";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  childFolders,
  folderBytes,
  folderPath,
  folderUpdated,
  formatBytes,
  inDateRange,
  inSizeRange,
  isAlive,
  itemColor,
  noteBytes,
  type DateFilter,
  type SizeFilter,
  type SortKey,
} from "@/lib/folders";
import { useNotebookStore } from "@/lib/store";
import { cn, plainText } from "@/lib/utils";

const DATE_OPTS: { id: DateFilter; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
];

const SIZE_OPTS: { id: SizeFilter; label: string }[] = [
  { id: "any", label: "Any size" },
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

const SORT_OPTS: { id: SortKey; label: string }[] = [
  { id: "updated", label: "Last updated" },
  { id: "created", label: "Date created" },
  { id: "size", label: "File size" },
  { id: "name", label: "Name" },
];

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
  const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
  const setActiveNote = useNotebookStore((s) => s.setActiveNote);
  const createNote = useNotebookStore((s) => s.createNote);
  const createNotebook = useNotebookStore((s) => s.createNotebook);
  const updateNote = useNotebookStore((s) => s.updateNote);

  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<DateFilter>("any");
  const [updated, setUpdated] = useState<DateFilter>("any");
  const [size, setSize] = useState<SizeFilter>("any");
  const [sort, setSort] = useState<SortKey>("updated");
  const [colorNoteId, setColorNoteId] = useState<string | null>(null);

  const notebook = notebooks.find((nb) => nb.id === activeNotebookId);
  const path = folderPath(notebooks, activeNotebookId);
  const searching = Boolean(query.trim()) || created !== "any" || updated !== "any" || size !== "any";
  const nested = childFolders(notebooks, activeNotebookId);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = searching ? notes.filter(isAlive) : notes.filter((note) => note.notebookId === activeNotebookId && isAlive(note));
    const list = pool.filter((note) => {
      const bytes = noteBytes(note);
      if (!inDateRange(note.createdAt, created)) return false;
      if (!inDateRange(note.updatedAt, updated)) return false;
      if (!inSizeRange(bytes, size)) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        plainText(note.content).toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      if (!searching) {
        const pin = Number(b.pinned) - Number(a.pinned);
        if (pin) return pin;
      }
      if (sort === "created") return b.createdAt - a.createdAt;
      if (sort === "size") return noteBytes(b) - noteBytes(a);
      if (sort === "name") return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, activeNotebookId, query, created, updated, size, sort, searching]);

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = searching ? notebooks.filter(isAlive) : nested;
    return pool
      .filter((folder) => {
        const bytes = folderBytes(notebooks, notes, folder.id);
        if (!inDateRange(folder.createdAt, created)) return false;
        if (!inDateRange(folderUpdated(notebooks, notes, folder.id), updated)) return false;
        if (!inSizeRange(bytes, size)) return false;
        if (!q) return true;
        return folder.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [notebooks, notes, nested, query, created, updated, size, searching]);

  const coloring = notes.find((note) => note.id === colorNoteId);

  return (
    <section className={cn("flex h-full min-h-0 flex-col border-r border-rule bg-paper-raised safe-pad", className)}>
      <header className="flex items-center gap-2 px-3 pt-4 pb-3">
        {onOpenNotebooks ? (
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Folders" onClick={onOpenNotebooks}>
            <Menu className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight font-semibold tracking-tight text-ink">
            {notebook?.name ?? "Pages"}
          </p>
          <p className="truncate text-xs text-ink-subtle">
            {path.length > 1 ? path.map((item) => item.name).join(" / ") : null}
            {path.length > 1 ? " · " : null}
            {filteredNotes.length} {filteredNotes.length === 1 ? "page" : "pages"}
            {filteredFolders.length ? ` · ${filteredFolders.length} folders` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" aria-label="New">
              <Plus className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                createNote();
                onOpenNote?.();
              }}
            >
              New page
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                createNotebook("Untitled folder", activeNotebookId);
              }}
            >
              New folder inside
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex items-center gap-2 px-3 pb-3">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search folders and pages"
            className="h-10 bg-paper pl-9"
            aria-label="Search folders and pages"
          />
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Filters"
              className={cn(searching && "border-forest text-forest")}
            >
              <Filter className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <p className="mb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">Filters</p>
            <label className="mb-2 block text-xs text-ink-muted">
              Date created
              <select
                className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-2 text-sm text-ink"
                value={created}
                onChange={(e) => setCreated(e.target.value as DateFilter)}
              >
                {DATE_OPTS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-2 block text-xs text-ink-muted">
              Last updated
              <select
                className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-2 text-sm text-ink"
                value={updated}
                onChange={(e) => setUpdated(e.target.value as DateFilter)}
              >
                {DATE_OPTS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-2 block text-xs text-ink-muted">
              File size
              <select
                className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-2 text-sm text-ink"
                value={size}
                onChange={(e) => setSize(e.target.value as SizeFilter)}
              >
                {SIZE_OPTS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ink-muted">
              Sort by
              <select
                className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-2 text-sm text-ink"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORT_OPTS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {filteredFolders.length === 0 && filteredNotes.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="font-display text-base font-medium text-ink">Nothing here</p>
            <p className="mt-1 text-sm text-ink-muted">
              {searching ? "Nothing matches that search." : "Start a page or a folder in here."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filteredFolders.map((folder) => {
              const bytes = folderBytes(notebooks, notes, folder.id);
              const trail = folderPath(notebooks, folder.id)
                .map((item) => item.name)
                .join(" / ");
              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNotebook(folder.id);
                      setQuery("");
                    }}
                    className="flex w-full items-start gap-2.5 rounded-xl px-3 py-3 text-left hover:bg-paper"
                  >
                    <Folder className="mt-0.5 size-4 shrink-0" style={{ color: itemColor(folder) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{folder.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                        {searching ? trail : "Folder"} · {formatBytes(bytes)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filteredNotes.map((note) => {
              const active = note.id === activeNoteId;
              const snippet = plainText(note.content);
              const trail = folderPath(notebooks, note.notebookId)
                .map((item) => item.name)
                .join(" / ");
              const bytes = noteBytes(note);
              return (
                <li key={note.id}>
                  <div
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl px-3 py-3 text-left transition-colors duration-150",
                      active ? "bg-paper-inset" : "hover:bg-paper",
                    )}
                    style={note.color ? { boxShadow: `inset 3px 0 0 ${note.color}` } : undefined}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setActiveNotebook(note.notebookId);
                        setActiveNote(note.id);
                        onOpenNote?.();
                      }}
                    >
                      <span className="flex items-start gap-2">
                        <FileText className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">
                          {note.title || "Untitled"}
                        </span>
                        {note.pinned ? (
                          <Pin className="mt-0.5 size-3.5 shrink-0 fill-current text-ink-muted" />
                        ) : null}
                      </span>
                      {snippet ? (
                        <span className="mt-0.5 ml-6 line-clamp-2 text-sm leading-snug text-ink-muted">
                          {snippet}
                        </span>
                      ) : null}
                      <span className="mt-1.5 ml-6 block text-xs text-ink-subtle tabular-nums" suppressHydrationWarning>
                        {searching ? `${trail} · ` : null}
                        {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                        {` · ${formatBytes(bytes)}`}
                      </span>
                    </button>
                    <Popover open={colorNoteId === note.id} onOpenChange={(open) => setColorNoteId(open ? note.id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="Page color"
                          className="mt-0.5 size-4 shrink-0 rounded-full border border-rule"
                          style={{ background: note.color || "transparent" }}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-52 p-2" align="end">
                        <p className="mb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">Page color</p>
                        <ColorSwatches
                          value={coloring?.color}
                          onChange={(color) => updateNote(note.id, { color })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
