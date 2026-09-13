import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isPageEmpty, notePages } from "@/lib/pages";
import { RECIPE_META } from "@/lib/recipes";
import {
  openRecipeChooser,
  registerRecipeChooser,
  type RecipeChooserRequest,
} from "@/lib/recipe-chooser";
import { useNotebookStore } from "@/lib/store";
import type { PageRecipeId } from "@/lib/types";
import { cn } from "@/lib/utils";

function RecipeIcon({ id }: { id: PageRecipeId }) {
  const common = "stroke-current fill-none stroke-[1.4]";
  if (id === "letter") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="7" y="4" width="18" height="24" rx="1.5" className={common} />
        <path d="M10 10h12M10 14h12M10 18h8" className={common} />
      </svg>
    );
  }
  if (id === "journal") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="6" y="5" width="20" height="22" rx="1.5" className={common} />
        <path d="M11 5v22M15 10h8M15 14h8M15 18h6" className={common} />
      </svg>
    );
  }
  if (id === "poem") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path d="M16 5c4 3 8 7 8 12a8 8 0 1 1-16 0c0-5 4-9 8-12z" className={common} />
        <path d="M16 14v10" className={common} />
      </svg>
    );
  }
  if (id === "list") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="6" y="6" width="20" height="20" rx="2" className={common} />
        <path d="M11 12h2M15 12h8M11 16h2M15 16h8M11 20h2M15 20h6" className={common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <path d="M8 8c2-2 6-2 9 0l7 6c2 2 1 6-1 8l-6 5c-3 2-7 1-9-1L6 18c-2-3-1-7 2-10z" className={common} />
    </svg>
  );
}

export function RecipeChooserHost() {
  const [request, setRequest] = useState<RecipeChooserRequest | null>(null);
  const [pending, setPending] = useState<PageRecipeId | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const createNote = useNotebookStore((s) => s.createNote);
  const setPageRecipe = useNotebookStore((s) => s.setPageRecipe);
  const lastPageRecipe = useNotebookStore((s) => s.prefs.lastPageRecipe) || "freewrite";

  useEffect(() => registerRecipeChooser(setRequest), []);

  function close() {
    setRequest(null);
    setPending(null);
    setConfirmOpen(false);
  }

  function pageHasContent(noteId: string, pageIndex: number) {
    const note = useNotebookStore.getState().notes.find((item) => item.id === noteId);
    if (!note) return false;
    const html = notePages(note)[pageIndex] || "";
    return !isPageEmpty(html);
  }

  function apply(recipe: PageRecipeId) {
    if (!request) return;
    if (request.mode === "create") {
      createNote(request.notebookId, recipe);
      toast(`Started as ${RECIPE_META.find((item) => item.id === recipe)?.label ?? "page"}`);
      close();
      return;
    }
    setPageRecipe(request.noteId, request.pageIndex, recipe);
    toast("Recipe changed");
    close();
  }

  function onPick(recipe: PageRecipeId) {
    if (!request) return;
    if (request.mode === "change" && pageHasContent(request.noteId, request.pageIndex)) {
      setPending(recipe);
      setConfirmOpen(true);
      return;
    }
    apply(recipe);
  }

  return (
    <>
      <Dialog open={Boolean(request)} onOpenChange={(open) => (!open ? close() : undefined)}>
        <DialogContent className="w-[min(calc(100%-1.5rem),32rem)] recipe-chooser">
          <DialogHeader>
            <DialogTitle>What are you writing?</DialogTitle>
            <DialogDescription className="sr-only">Choose a page recipe</DialogDescription>
          </DialogHeader>
          <div className="recipe-chooser-grid">
            {RECIPE_META.map((item) => {
              const last = item.id === lastPageRecipe;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn("recipe-card", last && "is-last")}
                  onClick={() => onPick(item.id)}
                >
                  <span className="recipe-card-icon text-ink-muted">
                    <RecipeIcon id={item.id} />
                  </span>
                  <span className="font-display text-base text-ink">{item.label}</span>
                  <span className="text-xs text-ink-muted italic">{item.tagline}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reshape this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This changes the page’s look and type rhythm. Your words stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPending(null);
                setConfirmOpen(false);
              }}
            >
              Keep as-is
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending);
              }}
            >
              Reshape
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { openRecipeChooser };
