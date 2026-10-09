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
  const kidsByParent = new Map<string, string[]>();
  for (const nb of notebooks) {
    const parent = nb.parentId;
    if (!parent || parent === nb.id) continue;
    const list = kidsByParent.get(parent);
    if (list) list.push(nb.id);
    else kidsByParent.set(parent, [nb.id]);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    out.push(current);
    const kids = kidsByParent.get(current);
    if (!kids) continue;
    for (let i = kids.length - 1; i >= 0; i -= 1) stack.push(kids[i]!);
  }
  return out;
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

function countedFolderIds(notebooks: Notebook[], folderId: string): Set<string> {
  const ids = new Set<string>();
  for (const id of descendantIds(notebooks, folderId)) {
    if (id !== folderId) {
      const folder = notebooks.find((nb) => nb.id === id);
      if (!folder || !isAlive(folder)) continue;
    }
    ids.add(id);
  }
  return ids;
}

export function noteBytes(note: Note): number {
  const body = note.pages?.length ? note.pages.join("") : note.content || "";
  return (note.title || "").length + body.length;
}

export function folderUpdated(notebooks: Notebook[], notes: Note[], folderId: string): number {
  const ids = countedFolderIds(notebooks, folderId);
  let latest = notebooks.find((nb) => nb.id === folderId)?.createdAt ?? 0;
  for (const note of notes) {
    if (!isAlive(note) || !ids.has(note.notebookId)) continue;
    if (note.updatedAt > latest) latest = note.updatedAt;
  }
  return latest;
}

export function folderBytes(notebooks: Notebook[], notes: Note[], folderId: string): number {
  const ids = countedFolderIds(notebooks, folderId);
  return notes.reduce((sum, note) => (isAlive(note) && ids.has(note.notebookId) ? sum + noteBytes(note) : sum), 0);
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
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "week") start.setDate(start.getDate() - 6);
  else if (filter === "month") start.setMonth(start.getMonth() - 1);
  else if (filter === "year") start.setFullYear(start.getFullYear() - 1);
  return ts >= start.getTime();
}

export function inSizeRange(bytes: number, filter: SizeFilter): boolean {
  if (filter === "any") return true;
  if (filter === "small") return bytes < 1_500;
  if (filter === "medium") return bytes >= 1_500 && bytes < 40_000;
  return bytes >= 40_000;
}
