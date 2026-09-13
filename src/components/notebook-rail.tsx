import { useMemo, useState } from "react";
import { ChevronRight, MoreHorizontal, Plus, Settings } from "lucide-react";
import { ColorSwatches } from "@/components/color-swatches";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { childFolders, descendantIds, itemColor } from "@/lib/folders";
import { useNotebookStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";
import { cn } from "@/lib/utils";

function FolderRow({
  folder,
  depth,
  expanded,
  toggle,
  onSelect,
  onRename,
  onColor,
  onDelete,
  onCreateInside,
}: {
  folder: Notebook;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onSelect?: () => void;
  onRename: (folder: Notebook) => void;
  onColor: (folder: Notebook) => void;
  onDelete: (id: string) => void;
  onCreateInside: (parentId: string) => void;
}) {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
  const moveNotebook = useNotebookStore((s) => s.moveNotebook);
  const kids = childFolders(notebooks, folder.id);
  const open = expanded.has(folder.id);
  const active = folder.id === activeNotebookId;
  const blocked = new Set(descendantIds(notebooks, folder.id));
  const moveTargets = notebooks.filter((nb) => !blocked.has(nb.id));

  return (
    <div>
      <div className="group relative">
        <button
          type="button"
          onClick={() => {
            setActiveNotebook(folder.id);
            onSelect?.();
          }}
          style={{ paddingLeft: 8 + depth * 14 }}
          className={cn(
            "flex h-10 w-full items-center gap-1.5 rounded-lg pr-10 text-left text-sm transition-colors duration-150",
            active ? "bg-leather-hover text-cream" : "text-cream/70 hover:bg-leather-hover/80 hover:text-cream",
          )}
        >
          {kids.length ? (
            <span
              role="button"
              tabIndex={0}
              aria-label={open ? "Collapse" : "Expand"}
              onClick={(event) => {
                event.stopPropagation();
                toggle(folder.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  toggle(folder.id);
                }
              }}
              className="inline-flex size-5 items-center justify-center rounded text-cream/50 hover:text-cream"
            >
              <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
            </span>
          ) : (
            <span className="size-5" />
          )}
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: itemColor(folder) }} />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More for ${folder.name}`}
              className={cn(
                "absolute top-0.5 right-1 inline-flex size-9 items-center justify-center rounded-md text-cream/50 transition-colors duration-150 hover:bg-leather-raised hover:text-cream",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
              )}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => onCreateInside(folder.id)}>New folder inside</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(folder)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onColor(folder)}>Color</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move into</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => moveNotebook(folder.id, null)}>Top level</DropdownMenuItem>
                {moveTargets.map((target) => (
                  <DropdownMenuItem key={target.id} onSelect={() => moveNotebook(folder.id, target.id)}>
                    {target.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(folder.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open
        ? kids.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onSelect={onSelect}
              onRename={onRename}
              onColor={onColor}
              onDelete={onDelete}
              onCreateInside={onCreateInside}
            />
          ))
        : null}
    </div>
  );
}

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
  const createNotebook = useNotebookStore((s) => s.createNotebook);
  const renameNotebook = useNotebookStore((s) => s.renameNotebook);
  const colorNotebook = useNotebookStore((s) => s.colorNotebook);
  const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);

  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [colorId, setColorId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(notebooks.map((nb) => nb.id)));

  const roots = useMemo(() => childFolders(notebooks, null), [notebooks]);
  const deleting = notebooks.find((nb) => nb.id === deleteId);
  const coloring = notebooks.find((nb) => nb.id === colorId);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId: string | null) {
    setCreateParent(parentId);
    setCreateName("");
    setCreateOpen(true);
  }

  function submitCreate() {
    const name = createName.trim() || "Untitled folder";
    const id = createNotebook(name, createParent);
    if (createParent) setExpanded((prev) => new Set(prev).add(createParent));
    setCreateName("");
    setCreateOpen(false);
    setExpanded((prev) => new Set(prev).add(id));
    onSelect?.();
  }

  function submitRename() {
    if (!renameId) return;
    renameNotebook(renameId, renameName);
    setRenameId(null);
  }

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-leather text-cream safe-pad", className)}>
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <QuireMark className="text-cream" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-semibold tracking-tight">Quire</p>
          <p className="text-xs text-cream/45">A private notebook</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-cream/40 uppercase">Folders</p>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {roots.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              onSelect={onSelect}
              onRename={(item) => {
                setRenameId(item.id);
                setRenameName(item.name);
              }}
              onColor={(item) => setColorId(item.id)}
              onDelete={setDeleteId}
              onCreateInside={(parentId) => openCreate(parentId)}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto space-y-1 p-3">
        {onOpenSettings ? (
          <Button variant="inverse" className="h-11 w-full justify-start text-cream/80" onClick={onOpenSettings}>
            <Settings className="size-4" />
            Desk
          </Button>
        ) : null}
        <Button variant="inverse" className="h-11 w-full justify-start text-cream/80" onClick={() => openCreate(null)}>
          <Plus className="size-4" />
          New folder
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createParent ? "Folder inside" : "New folder"}</DialogTitle>
            <DialogDescription>
              {createParent
                ? "This folder lives inside the one you picked."
                : "A shelf for a corner of your life."}
            </DialogDescription>
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
            <DialogTitle>Rename folder</DialogTitle>
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

      <Dialog open={Boolean(colorId)} onOpenChange={(open) => !open && setColorId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder color</DialogTitle>
            <DialogDescription>Pick a swatch or a custom color.</DialogDescription>
          </DialogHeader>
          <ColorSwatches
            value={coloring ? itemColor(coloring) : null}
            onChange={(color) => {
              if (colorId) colorNotebook(colorId, color);
            }}
          />
          <DialogFooter>
            <Button onClick={() => setColorId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This folder, folders inside it, and every page they hold will be removed from this device.
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
