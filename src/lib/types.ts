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
  parentId: string | null;
  color: string | null;
  createdAt: number;
  deletedAt: number | null;
};

export type Note = {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  pages: string[];
  pinned: boolean;
  color: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type Session = {
  notebookId: string | null;
  noteId: string | null;
  pageIndex: number;
  cursor: number;
};

export const DEFAULT_SESSION: Session = {
  notebookId: null,
  noteId: null,
  pageIndex: 0,
  cursor: 0,
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
  showRuler: boolean;
  customThemes: CustomTheme[];
  plugins: QuirePlugin[];
  typewriter: boolean;
  wordGoal: number;
  wordsToday: number;
  wordsDate: string;
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
  showRuler: true,
  customThemes: [],
  plugins: [],
  typewriter: true,
  wordGoal: 500,
  wordsToday: 0,
  wordsDate: "",
};
