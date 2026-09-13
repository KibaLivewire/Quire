import type { Note, Notebook } from "./types";

export const FOLDER_SWATCHES = [
  "#3d6b4f",
  "#4f6f8f",
  "#8a5a32",
  "#6b7c4a",
  "#8a3d45",
  "#c4a35a",
  "#2c4a6e",
  "#6b4a32",
  "#5c4d7a",
  "#3d6b6b",
  "#b0603a",
  "#2f2a26",
  "#d8c3a5",
  "#e8e2d6",
] as const;

const HUE_COLOR: Record<string, string> = {
  forest: "#3d6b4f",
  slate: "#8a93a0",
  umber: "#c4a35a",
  moss: "#8aa37a",
  wine: "#c45c58",
};

export function itemColor(item: { color?: string | null; hue?: string }): string {
  if (item.color) return item.color;
  if (item.hue && HUE_COLOR[item.hue]) return HUE_COLOR[item.hue];
  return "#8a93a0";
}

export function isAlive<T extends { deletedAt?: number | null }>(item: T): boolean {
  return !item.deletedAt;
}

export function childFolders(notebooks: Notebook[], parentId: string | null): Notebook[] {
  return notebooks
    .filter((nb) => isAlive(nb) && (nb.parentId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function descendantIds(notebooks: Notebook[], id: string): string[] {
  const kids = notebooks.filter((nb) => nb.parentId === id);
  return [id, ...kids.flatMap((kid) => descendantIds(notebooks, kid.id))];
}

export function isDescendant(notebooks: Notebook[], ancestorId: string, maybeId: string): boolean {
  return descendantIds(notebooks, ancestorId).includes(maybeId);
}

export function folderPath(notebooks: Notebook[], id: string | null): Notebook[] {
  const path: Notebook[] = [];
  let current = notebooks.find((nb) => nb.id === id) ?? null;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current);
    current = notebooks.find((nb) => nb.id === current?.parentId) ?? null;
  }
  return path;
}

export function noteBytes(note: Note): number {
  const body = note.pages?.length ? note.pages.join("") : note.content || "";
  return (note.title || "").length + body.length;
}

export function folderUpdated(notebooks: Notebook[], notes: Note[], folderId: string): number {
  const ids = new Set(descendantIds(notebooks, folderId));
  let latest = notebooks.find((nb) => nb.id === folderId)?.createdAt ?? 0;
  for (const note of notes) {
    if (ids.has(note.notebookId) && note.updatedAt > latest) latest = note.updatedAt;
  }
  return latest;
}

export function folderBytes(notebooks: Notebook[], notes: Note[], folderId: string): number {
  const ids = new Set(descendantIds(notebooks, folderId));
  return notes.reduce((sum, note) => (ids.has(note.notebookId) ? sum + noteBytes(note) : sum), 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export type DateFilter = "any" | "day" | "week" | "month" | "year";
export type SizeFilter = "any" | "small" | "medium" | "large";
export type SortKey = "updated" | "created" | "size" | "name";

export function inDateRange(ts: number, filter: DateFilter): boolean {
  if (filter === "any") return true;
  const age = Date.now() - ts;
  if (filter === "day") return age <= 86_400_000;
  if (filter === "week") return age <= 7 * 86_400_000;
  if (filter === "month") return age <= 30 * 86_400_000;
  return age <= 365 * 86_400_000;
}

export function inSizeRange(bytes: number, filter: SizeFilter): boolean {
  if (filter === "any") return true;
  if (filter === "small") return bytes < 1_500;
  if (filter === "medium") return bytes >= 1_500 && bytes < 40_000;
  return bytes >= 40_000;
}
