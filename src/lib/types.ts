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

export const PAGE_RECIPES = ["letter", "journal", "poem", "list", "freewrite"] as const;
export type PageRecipeId = (typeof PAGE_RECIPES)[number];

export type RibbonBookmark = {
  id: string;
  /** TipTap document position at place time */
  pos: number;
  label: string;
  createdAt: number;
  /** ~32 chars around place time for recovery */
  snippet?: string;
};

export type PageDraft = {
  id: string;
  createdAt: number;
  html: string;
  source: "auto" | "manual" | "pre-restore";
  sniff: string;
};

export type PageMeta = {
  recipe: PageRecipeId;
  /** Optional page-local border; falls back to recipe default then prefs.border */
  border?: BorderId | null;
  ribbons?: RibbonBookmark[];
  /** Local earlier drafts for this page (IndexedDB via zustand persist) */
  drafts?: PageDraft[];
};

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
  pageMeta?: PageMeta[];
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
  ambient: boolean;
  ambientVolume: number;
  bootLeaves: boolean;
  quill: boolean;
  quillGreeting: boolean;
  welcomeVersion: number;
  /** Bias recipe chooser highlight only */
  lastPageRecipe?: PageRecipeId;
  /** Just paper and typing — hides borders and extra chrome */
  inkOnly: boolean;
  /** Remember page map open (optional); default closed */
  pageMapOpen?: boolean;
  /** speechSynthesis voice.voiceURI */
  ttsVoiceURI?: string;
  /** default 1, clamp ~0.8–1.2 */
  ttsRate?: number;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  border: "folio",
  zoom: 1,
  showWordCount: true,
  spellcheck: true,
  suggestions: true,
  grammar: false,
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
  ambient: true,
  ambientVolume: 0.22,
  bootLeaves: true,
  quill: true,
  quillGreeting: true,
  welcomeVersion: 0,
  lastPageRecipe: "freewrite",
  inkOnly: false,
  pageMapOpen: false,
  ttsRate: 1,
};
