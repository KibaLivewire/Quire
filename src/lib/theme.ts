import { THEMES, type CustomTheme, type ThemeId } from "./types";

export const THEME_META: Record<
  ThemeId,
  { label: string; paper: string; ink: string; accent: string; desk: string; gathering: string }
> = {
  dark: {
    label: "Dark",
    paper: "#1a1714",
    ink: "#ece6dc",
    accent: "#8fa399",
    desk: "#0c0b0a",
    gathering: "Night finds the desk",
  },
  light: {
    label: "Light",
    paper: "#f3eee6",
    ink: "#1c1917",
    accent: "#3f534c",
    desk: "#241f1c",
    gathering: "Something warm for you",
  },
  navy: {
    label: "Navy",
    paper: "#122038",
    ink: "#e8eef6",
    accent: "#8eb4dc",
    desk: "#0a1220",
    gathering: "The tide is settling",
  },
  leather: {
    label: "Leather",
    paper: "#231710",
    ink: "#f3e6d4",
    accent: "#c4a574",
    desk: "#120d0a",
    gathering: "The desk is gathering",
  },
};

const CUSTOM_VARS = [
  "--color-paper",
  "--color-paper-raised",
  "--color-paper-inset",
  "--color-rule",
  "--color-ink",
  "--color-ink-muted",
  "--color-ink-subtle",
  "--color-leather",
  "--color-leather-raised",
  "--color-leather-hover",
  "--color-cream",
  "--color-forest",
  "--color-forest-fg",
  "--color-background",
  "--color-foreground",
  "--color-card",
  "--color-card-foreground",
  "--color-primary",
  "--color-primary-foreground",
  "--color-secondary",
  "--color-secondary-foreground",
  "--color-muted",
  "--color-muted-foreground",
  "--color-accent",
  "--color-accent-foreground",
  "--color-border",
  "--color-input",
  "--color-ring",
  "--color-popover",
  "--color-popover-foreground",
] as const;

function mix(a: string, b: string, t: number) {
  return `color-mix(in oklab, ${a} ${Math.round(t * 100)}%, ${b})`;
}

export function applyTheme(theme: string, customThemes: CustomTheme[] = []) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const builtin = (THEMES as readonly string[]).includes(theme) ? THEME_META[theme as ThemeId] : null;
  const personal = customThemes.find((item) => item.id === theme) ?? null;
  const meta = builtin ?? personal;
  if (!meta) return;

  const colorMeta = document.querySelector('meta[name="theme-color"]');
  colorMeta?.setAttribute("content", meta.desk);

  if (builtin) {
    root.setAttribute("data-theme", theme);
    for (const key of CUSTOM_VARS) root.style.removeProperty(key);
    return;
  }

  root.setAttribute("data-theme", "custom");
  const inkMuted = mix(meta.ink, meta.paper, 0.62);
  const inkSubtle = mix(meta.ink, meta.paper, 0.45);
  const raised = mix(meta.paper, meta.ink, 0.92);
  const inset = mix(meta.paper, meta.desk, 0.86);
  const rule = mix(meta.ink, meta.paper, 0.22);
  root.style.setProperty("--color-paper", meta.paper);
  root.style.setProperty("--color-paper-raised", raised);
  root.style.setProperty("--color-paper-inset", inset);
  root.style.setProperty("--color-rule", rule);
  root.style.setProperty("--color-ink", meta.ink);
  root.style.setProperty("--color-ink-muted", inkMuted);
  root.style.setProperty("--color-ink-subtle", inkSubtle);
  root.style.setProperty("--color-leather", meta.desk);
  root.style.setProperty("--color-leather-raised", mix(meta.desk, meta.paper, 0.82));
  root.style.setProperty("--color-leather-hover", mix(meta.desk, meta.paper, 0.7));
  root.style.setProperty("--color-cream", meta.ink);
  root.style.setProperty("--color-forest", meta.accent);
  root.style.setProperty("--color-forest-fg", meta.desk);
  root.style.setProperty("--color-background", meta.paper);
  root.style.setProperty("--color-foreground", meta.ink);
  root.style.setProperty("--color-card", raised);
  root.style.setProperty("--color-card-foreground", meta.ink);
  root.style.setProperty("--color-primary", meta.accent);
  root.style.setProperty("--color-primary-foreground", meta.desk);
  root.style.setProperty("--color-secondary", inset);
  root.style.setProperty("--color-secondary-foreground", meta.ink);
  root.style.setProperty("--color-muted", inset);
  root.style.setProperty("--color-muted-foreground", inkMuted);
  root.style.setProperty("--color-accent", inset);
  root.style.setProperty("--color-accent-foreground", meta.ink);
  root.style.setProperty("--color-border", rule);
  root.style.setProperty("--color-input", rule);
  root.style.setProperty("--color-ring", meta.accent);
  root.style.setProperty("--color-popover", raised);
  root.style.setProperty("--color-popover-foreground", meta.ink);
}

export function allThemes(customThemes: CustomTheme[]) {
  return [
    ...THEMES.map((id) => ({ id, ...THEME_META[id], builtin: true as const })),
    ...customThemes.map((item) => ({ ...item, builtin: false as const })),
  ];
}

