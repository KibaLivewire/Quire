import { THEMES, type CustomTheme, type ThemeId } from "./types";

const KEY = "quire-boot";

export type BootPeek = {
  theme: string;
  bootLeaves: boolean;
  custom: CustomTheme | null;
};

function isThemeId(value: string): value is ThemeId {
  return (THEMES as readonly string[]).includes(value);
}

function isCustom(value: unknown): value is CustomTheme {
  if (!value || typeof value !== "object") return false;
  const item = value as CustomTheme;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.desk === "string" &&
    typeof item.paper === "string" &&
    typeof item.ink === "string" &&
    typeof item.accent === "string"
  );
}

export function peekBoot(): BootPeek {
  const fallback: BootPeek = { theme: "dark", bootLeaves: true, custom: null };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<BootPeek>;
    const theme = typeof parsed.theme === "string" && parsed.theme ? parsed.theme : "dark";
    const custom = isCustom(parsed.custom) ? parsed.custom : null;
    if (!isThemeId(theme) && !(custom && custom.id === theme)) {
      return { theme: "dark", bootLeaves: parsed.bootLeaves !== false, custom: null };
    }
    return { theme, bootLeaves: parsed.bootLeaves !== false, custom: isThemeId(theme) ? null : custom };
  } catch {
    return fallback;
  }
}

export function rememberBoot(prefs: { theme?: string; bootLeaves?: boolean; customThemes?: CustomTheme[] }) {
  if (typeof window === "undefined") return;
  const current = peekBoot();
  const theme = typeof prefs.theme === "string" && prefs.theme ? prefs.theme : current.theme;
  const fromList = prefs.customThemes?.find((item) => item.id === theme) ?? null;
  const custom = isThemeId(theme) ? null : fromList ?? (current.custom?.id === theme ? current.custom : null);
  const safeTheme = isThemeId(theme) || custom ? theme : current.theme;
  const next: BootPeek = {
    theme: safeTheme,
    bootLeaves: prefs.bootLeaves !== false,
    custom: isThemeId(safeTheme) ? null : custom,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}
