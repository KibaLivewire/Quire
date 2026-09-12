export const FONT_SIZES = [
  { id: "sm", label: "Small", value: "0.95rem" },
  { id: "md", label: "Body", value: "1.125rem" },
  { id: "lg", label: "Large", value: "1.35rem" },
  { id: "xl", label: "Display", value: "1.75rem" },
] as const;

export const HIGHLIGHTS = [
  { id: "none", label: "None", swatch: "bg-paper-raised border border-rule" },
  { id: "butter", label: "Butter", color: "#f3e2a0", swatch: "bg-highlight-butter" },
  { id: "sage", label: "Sage", color: "#cfe0c3", swatch: "bg-highlight-sage" },
  { id: "blush", label: "Blush", color: "#f0cfc8", swatch: "bg-highlight-blush" },
  { id: "sky", label: "Sky", color: "#c9dcea", swatch: "bg-highlight-sky" },
] as const;

export const INK_COLORS = [
  { id: "ink", label: "Ink", color: "var(--color-ink)", swatch: "bg-ink" },
  { id: "muted", label: "Graphite", color: "var(--color-ink-muted)", swatch: "bg-ink-muted" },
  { id: "forest", label: "Accent", color: "var(--color-forest)", swatch: "bg-forest" },
  { id: "wine", label: "Wine", color: "#c45c4e", swatch: "bg-destructive" },
] as const;
