import type { ThemeId } from "./types";

export const THEME_META: Record<
  ThemeId,
  { label: string; paper: string; ink: string; accent: string; desk: string }
> = {
  dark: {
    label: "Dark",
    paper: "#1a1714",
    ink: "#ece6dc",
    accent: "#8fa399",
    desk: "#0c0b0a",
  },
  light: {
    label: "Light",
    paper: "#f3eee6",
    ink: "#1c1917",
    accent: "#3f534c",
    desk: "#241f1c",
  },
  navy: {
    label: "Navy",
    paper: "#122038",
    ink: "#e8eef6",
    accent: "#8eb4dc",
    desk: "#0a1220",
  },
  leather: {
    label: "Leather",
    paper: "#231710",
    ink: "#f3e6d4",
    accent: "#c4a574",
    desk: "#120d0a",
  },
};

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEME_META[theme].desk);
}
