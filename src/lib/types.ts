export const NOTEBOOK_HUES = ["forest", "slate", "umber", "moss", "wine"] as const;
export type NotebookHue = (typeof NOTEBOOK_HUES)[number];

export const THEMES = ["dark", "light", "navy", "leather"] as const;
export type ThemeId = (typeof THEMES)[number];

export const PAGE_ORIENTATIONS = ["portrait", "landscape"] as const;
export type PageOrientation = (typeof PAGE_ORIENTATIONS)[number];

export type CustomTheme = {
  id: string;
  label: string;
  desk: string;
  paper: string;
  ink: string;
  accent: string;
};

export type QuirePlugin = {
  id: string;
  name: string;
  version?: string;
  author?: string;
  css?: string;
  themes?: CustomTheme[];
};

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
  theme: string;
  border: BorderId;
  zoom: number;
  showWordCount: boolean;
  spellcheck: boolean;
  suggestions: boolean;
  grammar: boolean;
  pageOrientation: PageOrientation;
  pageWidth: number;
  pageHeight: number;
  customThemes: CustomTheme[];
  plugins: QuirePlugin[];
};

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  border: "folio",
  zoom: 1,
  showWordCount: true,
  spellcheck: true,
  suggestions: true,
  grammar: true,
  pageOrientation: "portrait",
  pageWidth: 8.5,
  pageHeight: 11,
  customThemes: [],
  plugins: [],
};
