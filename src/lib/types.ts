export const NOTEBOOK_HUES = ["forest", "slate", "umber", "moss", "wine"] as const;
export type NotebookHue = (typeof NOTEBOOK_HUES)[number];

export const THEMES = ["dark", "light", "navy", "leather"] as const;
export type ThemeId = (typeof THEMES)[number];

export const BORDERS = [
  "none",
  "hairline",
  "double",
  "folio",
  "gilt",
  "stitch",
  "vine",
  "deckle",
  "manuscript",
  "mat",
] as const;
export type BorderId = (typeof BORDERS)[number];

export type Notebook = {
  id: string;
  name: string;
  hue: NotebookHue;
  createdAt: number;
};

export type Note = {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  pages: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Prefs = {
  theme: ThemeId;
  border: BorderId;
  zoom: number;
  showWordCount: boolean;
  spellcheck: boolean;
  suggestions: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  border: "folio",
  zoom: 1,
  showWordCount: true,
  spellcheck: true,
  suggestions: true,
};
