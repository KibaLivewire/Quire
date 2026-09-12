import { useState } from "react";
import { MoreHorizontal, Plus, Settings } from "lucide-react";
import { QuireMark } from "@/components/quire-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useNotebookStore } from "@/lib/store";
import type { NotebookHue } from "@/lib/types";
import { cn } from "@/lib/utils";

const HUE_DOT: Record<NotebookHue, string> = {
  forest: "bg-forest",
  slate: "bg-cream/40",
  umber: "bg-highlight-butter",
  moss: "bg-highlight-sage",
  wine: "bg-destructive",
};

export function NotebookRail({
  onSelect,
  onOpenSettings,
  className,
}: {
  onSelect?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}) {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
  const createNotebook = useNotebookStore((s) => s.createNotebook);
  const renameNotebook = useNotebookStore((s) => s.renameNotebook);
  const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleting = notebooks.find((nb) => nb.id === deleteId);

  function submitCreate() {
    const name = createName.trim() || "Untitled notebook";
    createNotebook(name);
    setCreateName("");
    setCreateOpen(false);
    onSelect?.();
  }

  function submitRename() {
    if (!renameId) return;
    renameNotebook(renameId, renameName);
    setRenameId(null);
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col bg-leather text-cream safe-pad",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <QuireMark className="text-cream" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-semibold tracking-tight">Quire</p>
          <p className="text-xs text-cream/45">A private notebook</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-cream/40 uppercase">Notebooks</p>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {notebooks.map((nb) => {
            const active = nb.id === activeNotebookId;
            return (
              <div key={nb.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setActiveNotebook(nb.id);
                    onSelect?.();
                  }}
                  className={cn(
                    "flex h-11 w-full items-center gap-2.5 rounded-lg pr-10 pl-2.5 text-left text-sm transition-colors duration-150",
                    active
                      ? "bg-leather-hover text-cream"
                      : "text-cream/70 hover:bg-leather-hover/80 hover:text-cream",
                  )}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", HUE_DOT[nb.hue])} />
                  <span className="min-w-0 flex-1 truncate">{nb.name}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`More for ${nb.name}`}
                      className={cn(
                        "absolute top-1 right-1 inline-flex size-9 items-center justify-center rounded-md text-cream/50 transition-colors duration-150 hover:bg-leather-raised hover:text-cream",
                        "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                      )}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onSelect={() => {
                        setRenameId(nb.id);
                        setRenameName(nb.name);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteId(nb.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-1 p-3">
        {onOpenSettings ? (
          <Button
            variant="inverse"
            className="h-11 w-full justify-start text-cream/80"
            onClick={onOpenSettings}
          >
            <Settings className="size-4" />
            Desk
          </Button>
        ) : null}
        <Button
          variant="inverse"
          className="h-11 w-full justify-start text-cream/80"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          New notebook
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New notebook</DialogTitle>
            <DialogDescription>A shelf for a corner of your life.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameId)} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename notebook</DialogTitle>
            <DialogDescription>The name appears in the shelf.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This notebook and every page in it will be removed from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteNotebook(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
