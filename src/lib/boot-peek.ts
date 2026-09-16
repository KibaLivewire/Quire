import type { ThemeId } from "./types";
import { THEMES } from "./types";

const KEY = "quire-boot";

export type BootPeek = {
  theme: ThemeId;
  bootLeaves: boolean;
};

export function peekBoot(): BootPeek {
  const fallback: BootPeek = { theme: "dark", bootLeaves: true };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<BootPeek>;
    const theme = THEMES.includes(parsed.theme as ThemeId) ? (parsed.theme as ThemeId) : "dark";
    return { theme, bootLeaves: parsed.bootLeaves !== false };
  } catch {
    return fallback;
  }
}

export function rememberBoot(prefs: { theme?: string; bootLeaves?: boolean }) {
  if (typeof window === "undefined") return;
  const current = peekBoot();
  const theme = THEMES.includes(prefs.theme as ThemeId) ? (prefs.theme as ThemeId) : current.theme;
  const next: BootPeek = {
    theme,
    bootLeaves: prefs.bootLeaves !== false,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}
