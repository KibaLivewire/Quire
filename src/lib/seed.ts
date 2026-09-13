import type { Note, Notebook } from "./types";
import { WELCOME_HTML } from "./welcome";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-12T12:00:00.000Z");

function daysAgo(days: number, hours = 0): number {
  return NOW - days * DAY - hours * 60 * 60 * 1000;
}

function note(partial: Omit<Note, "pages" | "content" | "color" | "deletedAt"> & { content: string; color?: string | null }): Note {
  return { ...partial, pages: [partial.content], color: partial.color ?? null, deletedAt: null };
}

export const SEED_NOTEBOOKS: Notebook[] = [
  { id: "nb_personal", name: "Personal", hue: "forest", parentId: null, color: "#3d6b4f", createdAt: daysAgo(14), deletedAt: null },
];

export const SEED_NOTES: Note[] = [
  note({
    id: "note_welcome",
    notebookId: "nb_personal",
    title: "Welcome to Quire",
    pinned: true,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(0, 2),
    content: WELCOME_HTML,
  }),
];

export const DEMO_NOTE_IDS = new Set(["note_september", "note_keeping", "note_letter"]);
export const DEMO_FOLDER_IDS = new Set(["nb_letters", "nb_reading", "nb_work"]);

export function createSeed() {
  return {
    notebooks: SEED_NOTEBOOKS,
    notes: SEED_NOTES,
    activeNotebookId: "nb_personal",
    activeNoteId: "note_welcome",
  };
}
