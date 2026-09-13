import type { PageRecipeId } from "./types";

export type RecipeChooserRequest =
  | { mode: "create"; notebookId?: string }
  | { mode: "change"; noteId: string; pageIndex: number };

type Opener = (request: RecipeChooserRequest) => void;

let opener: Opener | null = null;

export function registerRecipeChooser(handler: Opener) {
  opener = handler;
  return () => {
    if (opener === handler) opener = null;
  };
}

export function openRecipeChooser(request: RecipeChooserRequest = { mode: "create" }) {
  opener?.(request);
}

export type RecipePick = PageRecipeId;
