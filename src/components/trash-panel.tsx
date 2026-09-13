import { formatDistanceToNow } from "date-fns";
import { FileText, Folder, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isAlive } from "@/lib/folders";
import { useNotebookStore } from "@/lib/store";

const DAY = 24 * 60 * 60 * 1000;

export function TrashPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const notes = useNotebookStore((s) => s.notes);
  const restoreNote = useNotebookStore((s) => s.restoreNote);
  const restoreNotebook = useNotebookStore((s) => s.restoreNotebook);
  const purgeForever = useNotebookStore((s) => s.purgeForever);
  const emptyTrash = useNotebookStore((s) => s.emptyTrash);

  const deadFolders = notebooks.filter((nb) => !isAlive(nb));
  const deadNotes = notes.filter((note) => !isAlive(note));

  function daysLeft(deletedAt: number | null) {
    if (!deletedAt) return 30;
    return Math.max(0, Math.ceil((deletedAt + 30 * DAY - Date.now()) / DAY));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100%-1.5rem),32rem)] max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trash</DialogTitle>
          <DialogDescription>Pages and folders wait here for 30 days, then they are gone.</DialogDescription>
        </DialogHeader>
        {deadFolders.length === 0 && deadNotes.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Trash is empty. Nothing to be afraid of.</p>
        ) : (
          <ul className="space-y-1">
            {deadFolders.map((folder) => (
              <li key={folder.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper">
                <Folder className="size-4 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{folder.name}</span>
                  <span className="text-[11px] text-ink-subtle">{daysLeft(folder.deletedAt)} days left</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => restoreNotebook(folder.id)}>
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete forever" onClick={() => purgeForever("folder", folder.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
            {deadNotes.map((note) => (
              <li key={note.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper">
                <FileText className="size-4 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{note.title || "Untitled"}</span>
                  <span className="text-[11px] text-ink-subtle">
                    {formatDistanceToNow(note.deletedAt || note.updatedAt, { addSuffix: true })} · {daysLeft(note.deletedAt)} days left
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => restoreNote(note.id)}>
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete forever" onClick={() => purgeForever("note", note.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {deadFolders.length || deadNotes.length ? (
          <Button variant="outline" className="mt-3" onClick={() => emptyTrash()}>
            Empty trash
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
