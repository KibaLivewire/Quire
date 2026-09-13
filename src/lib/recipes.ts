import type { BorderId, PageMeta, PageRecipeId, RibbonBookmark } from "./types";
import { PAGE_RECIPES } from "./types";

export const RECIPE_META: {
  id: PageRecipeId;
  label: string;
  tagline: string;
  border: BorderId;
}[] = [
  { id: "letter", label: "Letter", tagline: "A proper sheet", border: "folio" },
  { id: "journal", label: "Journal", tagline: "Notebook measure", border: "deckle" },
  { id: "poem", label: "Poem", tagline: "A single leaf", border: "gilt" },
  { id: "list", label: "List", tagline: "Errands & checks", border: "folio" },
  { id: "freewrite", label: "Freewrite", tagline: "Loose scrap", border: "none" },
];

export function isPageRecipeId(value: unknown): value is PageRecipeId {
  return typeof value === "string" && (PAGE_RECIPES as readonly string[]).includes(value);
}

export function defaultPageMeta(recipe: PageRecipeId = "freewrite"): PageMeta {
  const meta = RECIPE_META.find((item) => item.id === recipe) ?? RECIPE_META[4];
  return { recipe: meta.id, border: meta.border, ribbons: [] };
}

export function alignPageMeta(pages: string[], existing?: PageMeta[] | null): PageMeta[] {
  return pages.map((_, index) => {
    const prev = existing?.[index];
    if (prev && isPageRecipeId(prev.recipe)) {
      return {
        recipe: prev.recipe,
        border: prev.border ?? null,
        ribbons: Array.isArray(prev.ribbons) ? prev.ribbons : [],
      };
    }
    return defaultPageMeta("freewrite");
  });
}

export function pageMetaAt(note: { pages?: string[]; pageMeta?: PageMeta[]; content?: string }, pageIndex: number): PageMeta {
  const pages = note.pages?.length ? note.pages : [note.content || ""];
  const meta = alignPageMeta(pages, note.pageMeta);
  return meta[Math.min(Math.max(0, pageIndex), meta.length - 1)] ?? defaultPageMeta();
}

export function recipeBorder(meta: PageMeta, deskBorder: BorderId): BorderId {
  if (meta.border) return meta.border;
  const recipe = RECIPE_META.find((item) => item.id === meta.recipe);
  if (recipe) return recipe.border;
  return deskBorder;
}

export function recipeLabel(id: PageRecipeId): string {
  return RECIPE_META.find((item) => item.id === id)?.label ?? "Freewrite";
}

export function applyRecipeToMeta(prev: PageMeta | undefined, recipe: PageRecipeId): PageMeta {
  const base = defaultPageMeta(recipe);
  return {
    ...base,
    ribbons: prev?.ribbons ?? [],
  };
}

export function softCapRibbons(ribbons: RibbonBookmark[], max = 20): RibbonBookmark[] {
  if (ribbons.length <= max) return ribbons;
  return ribbons.slice(0, max);
}
