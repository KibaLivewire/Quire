import type { CustomTheme, QuirePlugin } from "./types";

export function parsePlugin(raw: unknown): QuirePlugin | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return null;
  const css = typeof data.css === "string" ? data.css : "";
  const themes = Array.isArray(data.themes)
    ? data.themes
        .map((item) => parseTheme(item))
        .filter((item): item is CustomTheme => Boolean(item))
    : [];
  return {
    id: typeof data.id === "string" && data.id ? data.id : crypto.randomUUID(),
    name: name.slice(0, 80),
    version: typeof data.version === "string" ? data.version.slice(0, 24) : undefined,
    author: typeof data.author === "string" ? data.author.slice(0, 80) : undefined,
    css: css.slice(0, 80_000),
    themes,
  };
}

export function parseTheme(raw: unknown): CustomTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const label = typeof data.label === "string" ? data.label.trim() : "";
  const desk = color(data.desk);
  const paper = color(data.paper);
  const ink = color(data.ink);
  const accent = color(data.accent);
  if (!label || !desk || !paper || !ink || !accent) return null;
  return {
    id: typeof data.id === "string" && data.id ? data.id : crypto.randomUUID(),
    label: label.slice(0, 40),
    desk,
    paper,
    ink,
    accent,
  };
}

function color(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(next) ? next : null;
}

export function pluginTemplate(): string {
  return `${JSON.stringify(
    {
      name: "My Quire add-on",
      version: "1.0.0",
      author: "",
      css: "/* Optional CSS for the desk */",
      themes: [
        {
          label: "Midnight",
          desk: "#0b1020",
          paper: "#141c32",
          ink: "#e8eef6",
          accent: "#8eb4dc",
        },
      ],
    },
    null,
    2,
  )}\n`;
}
