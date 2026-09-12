export const FONT_CATEGORIES = ["serif", "sans", "display", "handwriting", "mono"] as const;
export type FontCategory = (typeof FONT_CATEGORIES)[number];

export type WebFont = {
  family: string;
  category: FontCategory;
};

export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  serif: "Serif",
  sans: "Sans",
  display: "Display",
  handwriting: "Script",
  mono: "Mono",
};

export const FONT_CATEGORY_FALLBACK: Record<FontCategory, string> = {
  serif: "Georgia, serif",
  sans: "system-ui, sans-serif",
  display: "Georgia, serif",
  handwriting: "cursive",
  mono: "ui-monospace, monospace",
};

/** Curated free families from Google Fonts, searchable by name and category. */
export const WEB_FONTS: WebFont[] = [
  { family: "Newsreader", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Source Serif 4", category: "serif" },
  { family: "Merriweather", category: "serif" },
  { family: "Playfair Display", category: "serif" },
  { family: "EB Garamond", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "PT Serif", category: "serif" },
  { family: "Noto Serif", category: "serif" },
  { family: "Crimson Text", category: "serif" },
  { family: "Spectral", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "Cardo", category: "serif" },
  { family: "Bitter", category: "serif" },
  { family: "Roboto Serif", category: "serif" },
  { family: "Fraunces", category: "serif" },
  { family: "Literata", category: "serif" },
  { family: "IBM Plex Serif", category: "serif" },
  { family: "Zilla Slab", category: "serif" },
  { family: "Domine", category: "serif" },
  { family: "Alegreya", category: "serif" },
  { family: "Vollkorn", category: "serif" },
  { family: "Old Standard TT", category: "serif" },
  { family: "Unna", category: "serif" },
  { family: "Oranienbaum", category: "serif" },
  { family: "Instrument Serif", category: "serif" },
  { family: "Young Serif", category: "serif" },
  { family: "Libre Caslon Text", category: "serif" },
  { family: "Tinos", category: "serif" },
  { family: "Arvo", category: "serif" },
  { family: "Rokkitt", category: "serif" },
  { family: "Crete Round", category: "serif" },
  { family: "Josefin Slab", category: "serif" },
  { family: "Faustina", category: "serif" },
  { family: "Gelasio", category: "serif" },
  { family: "Lusitana", category: "serif" },
  { family: "Amiri", category: "serif" },
  { family: "Noto Serif Display", category: "serif" },
  { family: "Source Sans 3", category: "sans" },
  { family: "Inter", category: "sans" },
  { family: "IBM Plex Sans", category: "sans" },
  { family: "Open Sans", category: "sans" },
  { family: "Roboto", category: "sans" },
  { family: "Work Sans", category: "sans" },
  { family: "Nunito Sans", category: "sans" },
  { family: "Nunito", category: "sans" },
  { family: "Lato", category: "sans" },
  { family: "Montserrat", category: "sans" },
  { family: "Poppins", category: "sans" },
  { family: "Raleway", category: "sans" },
  { family: "DM Sans", category: "sans" },
  { family: "Outfit", category: "sans" },
  { family: "Figtree", category: "sans" },
  { family: "Karla", category: "sans" },
  { family: "Manrope", category: "sans" },
  { family: "Urbanist", category: "sans" },
  { family: "Plus Jakarta Sans", category: "sans" },
  { family: "Space Grotesk", category: "sans" },
  { family: "Public Sans", category: "sans" },
  { family: "Libre Franklin", category: "sans" },
  { family: "Mulish", category: "sans" },
  { family: "Rubik", category: "sans" },
  { family: "Albert Sans", category: "sans" },
  { family: "Atkinson Hyperlegible", category: "sans" },
  { family: "PT Sans", category: "sans" },
  { family: "Noto Sans", category: "sans" },
  { family: "Cabin", category: "sans" },
  { family: "Barlow", category: "sans" },
  { family: "Josefin Sans", category: "sans" },
  { family: "Questrial", category: "sans" },
  { family: "Archivo", category: "sans" },
  { family: "Red Hat Display", category: "sans" },
  { family: "Schibsted Grotesk", category: "sans" },
  { family: "Instrument Sans", category: "sans" },
  { family: "Be Vietnam Pro", category: "sans" },
  { family: "Lexend", category: "sans" },
  { family: "Cinzel", category: "display" },
  { family: "Abril Fatface", category: "display" },
  { family: "Bebas Neue", category: "display" },
  { family: "Anton", category: "display" },
  { family: "Oswald", category: "display" },
  { family: "Righteous", category: "display" },
  { family: "Fredoka", category: "display" },
  { family: "Comfortaa", category: "display" },
  { family: "Alfa Slab One", category: "display" },
  { family: "Unbounded", category: "display" },
  { family: "Syne", category: "display" },
  { family: "Staatliches", category: "display" },
  { family: "Yeseva One", category: "display" },
  { family: "Prata", category: "display" },
  { family: "Bodoni Moda", category: "display" },
  { family: "Cinzel Decorative", category: "display" },
  { family: "Poiret One", category: "display" },
  { family: "Limelight", category: "display" },
  { family: "Ultra", category: "display" },
  { family: "Big Shoulders Display", category: "display" },
  { family: "Bungee", category: "display" },
  { family: "Passion One", category: "display" },
  { family: "Rye", category: "display" },
  { family: "UnifrakturMaguntia", category: "display" },
  { family: "Caveat", category: "handwriting" },
  { family: "Dancing Script", category: "handwriting" },
  { family: "Great Vibes", category: "handwriting" },
  { family: "Pacifico", category: "handwriting" },
  { family: "Satisfy", category: "handwriting" },
  { family: "Sacramento", category: "handwriting" },
  { family: "Indie Flower", category: "handwriting" },
  { family: "Patrick Hand", category: "handwriting" },
  { family: "Shadows Into Light", category: "handwriting" },
  { family: "Homemade Apple", category: "handwriting" },
  { family: "Alex Brush", category: "handwriting" },
  { family: "Allura", category: "handwriting" },
  { family: "Amatic SC", category: "handwriting" },
  { family: "Architects Daughter", category: "handwriting" },
  { family: "Kalam", category: "handwriting" },
  { family: "Handlee", category: "handwriting" },
  { family: "Covered By Your Grace", category: "handwriting" },
  { family: "Nothing You Could Do", category: "handwriting" },
  { family: "Marck Script", category: "handwriting" },
  { family: "Pinyon Script", category: "handwriting" },
  { family: "Tangerine", category: "handwriting" },
  { family: "Parisienne", category: "handwriting" },
  { family: "La Belle Aurore", category: "handwriting" },
  { family: "Special Elite", category: "handwriting" },
  { family: "Gochi Hand", category: "handwriting" },
  { family: "IBM Plex Mono", category: "mono" },
  { family: "Source Code Pro", category: "mono" },
  { family: "JetBrains Mono", category: "mono" },
  { family: "Fira Code", category: "mono" },
  { family: "Roboto Mono", category: "mono" },
  { family: "Space Mono", category: "mono" },
  { family: "Inconsolata", category: "mono" },
  { family: "Ubuntu Mono", category: "mono" },
  { family: "Anonymous Pro", category: "mono" },
  { family: "Cutive Mono", category: "mono" },
  { family: "DM Mono", category: "mono" },
  { family: "Overpass Mono", category: "mono" },
  { family: "PT Mono", category: "mono" },
  { family: "Noto Sans Mono", category: "mono" },
  { family: "Courier Prime", category: "mono" },
  { family: "Share Tech Mono", category: "mono" },
  { family: "VT323", category: "mono" },
  { family: "Red Hat Mono", category: "mono" },
  { family: "Azeret Mono", category: "mono" },
  { family: "Fragment Mono", category: "mono" },
  { family: "Spline Sans Mono", category: "mono" },
];

const loaded = new Set<string>();

export function fontCssFamily(font: WebFont): string {
  return `"${font.family}", ${FONT_CATEGORY_FALLBACK[font.category]}`;
}

export function loadGoogleFont(family: string) {
  if (typeof document === "undefined" || loaded.has(family)) return;
  loaded.add(family);
  const id = `gf-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&display=swap`;
  document.head.appendChild(link);
}

export function filterFonts(query: string, category: FontCategory | "all"): WebFont[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: WebFont[] = [];
  for (const font of WEB_FONTS) {
    if (seen.has(font.family)) continue;
    if (category !== "all" && font.category !== category) continue;
    if (q && !font.family.toLowerCase().includes(q) && !font.category.includes(q)) continue;
    seen.add(font.family);
    out.push(font);
  }
  return out;
}
