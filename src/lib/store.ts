import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { createSeed } from "./seed";
import { NOTEBOOK_HUES, DEFAULT_PREFS, type Note, type Notebook, type NotebookHue, type Prefs } from "./types";
import { notePages } from "./pages";

const DB_NAME = "quire";
const STORE_NAME = "kv";

type PersistedSlice = {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  initialized: boolean;
  prefs: Prefs;
};

export type NotebookState = {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  initialized: boolean;
  hasHydrated: boolean;
  focusMode: boolean;
  prefs: Prefs;
  completeHydration: () => void;
  setFocusMode: (value: boolean) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setActiveNotebook: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  createNotebook: (name: string) => string;
  renameNotebook: (id: string, name: string) => void;
  deleteNotebook: (id: string) => void;
  createNote: (notebookId?: string) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "content" | "pinned" | "notebookId" | "pages">>) => void;
  updateNotePage: (id: string, pageIndex: number, html: string) => void;
  insertNotePage: (id: string, atIndex: number, html?: string) => number;
  setNotePages: (id: string, pages: string[], content?: string) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => string | null;
  togglePin: (id: string) => void;
  moveNote: (id: string, notebookId: string) => void;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const idbStorage: PersistStorage<PersistedSlice> = {
  getItem: async (name) => {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(name);
        req.onsuccess = () =>
          resolve((req.result as StorageValue<PersistedSlice> | undefined) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  removeItem: async (name) => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

function nextHue(existing: Notebook[]): NotebookHue {
  const used = new Set(existing.map((nb) => nb.hue));
  return NOTEBOOK_HUES.find((hue) => !used.has(hue)) ?? NOTEBOOK_HUES[existing.length % NOTEBOOK_HUES.length];
}

function migrateNote(note: Note): Note {
  const pages = notePages(note);
  return { ...note, pages, content: pages.join("") };
}

function withJoinedContent(note: Note, pages: string[]): Note {
  return { ...note, pages, content: pages.join(""), updatedAt: Date.now() };
}

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      initialized: true,
      hasHydrated: true,
      focusMode: false,
      prefs: { ...DEFAULT_PREFS },

      completeHydration: () =>
        set((state) => {
          if (!state.initialized) {
            const seed = createSeed();
            return { ...seed, initialized: true, hasHydrated: true, prefs: { ...DEFAULT_PREFS } };
          }
          return {
            hasHydrated: true,
            notes: state.notes.map(migrateNote),
            prefs: { ...DEFAULT_PREFS, ...state.prefs },
          };
        }),

      setFocusMode: (value) => set({ focusMode: value }),

      setPrefs: (patch) =>
        set((state) => ({
          prefs: { ...state.prefs, ...patch },
        })),

      setActiveNotebook: (id) => {
        const notes = get().notes.filter((note) => note.notebookId === id);
        const nextNote =
          notes.find((note) => note.id === get().activeNoteId) ??
          [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)[0];
        set({
          activeNotebookId: id,
          activeNoteId: nextNote?.id ?? null,
          focusMode: false,
        });
      },

      setActiveNote: (id) => set({ activeNoteId: id }),

      createNotebook: (name) => {
        const id = crypto.randomUUID();
        const notebook: Notebook = {
          id,
          name: name.trim() || "Untitled notebook",
          hue: nextHue(get().notebooks),
          createdAt: Date.now(),
        };
        set((state) => ({
          notebooks: [...state.notebooks, notebook],
          activeNotebookId: id,
          activeNoteId: null,
        }));
        return id;
      },

      renameNotebook: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, name: trimmed } : nb)),
        }));
      },

      deleteNotebook: (id) => {
        const { notebooks, notes, activeNotebookId } = get();
        const remaining = notebooks.filter((nb) => nb.id !== id);
        let nextNotebooks = remaining;
        if (nextNotebooks.length === 0) {
          nextNotebooks = [
            {
              id: crypto.randomUUID(),
              name: "Pages",
              hue: "forest",
              createdAt: Date.now(),
            },
          ];
        }
        const nextActive = activeNotebookId === id ? nextNotebooks[0].id : activeNotebookId;
        const nextNotes = notes.filter((note) => note.notebookId !== id);
        const inNotebook = nextNotes.filter((note) => note.notebookId === nextActive);
        set({
          notebooks: nextNotebooks,
          notes: nextNotes,
          activeNotebookId: nextActive,
          activeNoteId: inNotebook[0]?.id ?? null,
        });
      },

      createNote: (notebookId) => {
        const id = crypto.randomUUID();
        const target = notebookId ?? get().activeNotebookId ?? get().notebooks[0]?.id;
        if (!target) return id;
        const now = Date.now();
        const note: Note = {
          id,
          notebookId: target,
          title: "Untitled",
          content: "",
          pages: [""],
          pinned: false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          notes: [note, ...state.notes],
          activeNotebookId: target,
          activeNoteId: id,
        }));
        return id;
      },

      updateNote: (id, patch) => {
        set((state) => ({
          notes: state.notes.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...patch, updatedAt: Date.now() };
            if (patch.pages) {
              next.content = patch.pages.join("");
            } else if (patch.content !== undefined && !patch.pages) {
              const pages = [...notePages(item)];
              pages[0] = patch.content;
              next.pages = pages;
              next.content = pages.join("");
            }
            return next;
          }),
        }));
      },

      updateNotePage: (id, pageIndex, html) => {
        set((state) => ({
          notes: state.notes.map((item) => {
            if (item.id !== id) return item;
            const pages = [...notePages(item)];
            while (pages.length <= pageIndex) pages.push("");
            pages[pageIndex] = html;
            return withJoinedContent(item, pages);
          }),
        }));
      },

      insertNotePage: (id, atIndex, html = "") => {
        const item = get().notes.find((note) => note.id === id);
        if (!item) return 0;
        const pages = [...notePages(item)];
        const index = Math.max(0, Math.min(atIndex, pages.length));
        pages.splice(index, 0, html);
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? withJoinedContent(note, pages) : note)),
        }));
        return index;
      },

      setNotePages: (id, pages) => {
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? withJoinedContent(note, pages) : note)),
        }));
      },

      deleteNote: (id) => {
        const { notes, activeNoteId } = get();
        const target = notes.find((note) => note.id === id);
        const remaining = notes.filter((note) => note.id !== id);
        let nextActive = activeNoteId;
        if (activeNoteId === id) {
          const siblings = remaining
            .filter((note) => note.notebookId === target?.notebookId)
            .sort((a, b) => b.updatedAt - a.updatedAt);
          nextActive = siblings[0]?.id ?? null;
        }
        set({ notes: remaining, activeNoteId: nextActive });
      },

      duplicateNote: (id) => {
        const source = get().notes.find((note) => note.id === id);
        if (!source) return null;
        const copyId = crypto.randomUUID();
        const now = Date.now();
        const pages = [...notePages(source)];
        const copy: Note = {
          ...source,
          id: copyId,
          title: source.title.endsWith(" copy") ? source.title : `${source.title} copy`,
          pinned: false,
          createdAt: now,
          updatedAt: now,
          pages,
          content: pages.join(""),
        };
        set((state) => ({
          notes: [copy, ...state.notes],
          activeNoteId: copyId,
        }));
        return copyId;
      },

      togglePin: (id) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note,
          ),
        }));
      },

      moveNote: (id, notebookId) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, notebookId, updatedAt: Date.now() } : note,
          ),
          activeNotebookId: notebookId,
          activeNoteId: id,
        }));
      },
    }),
    {
      name: "quire-v1",
      storage: idbStorage,
      skipHydration: true,
      partialize: (state): PersistedSlice => ({
        notebooks: state.notebooks,
        notes: state.notes,
        activeNotebookId: state.activeNotebookId,
        activeNoteId: state.activeNoteId,
        initialized: state.initialized,
        prefs: state.prefs,
      }),
      onRehydrateStorage: () => (state) => {
        state?.completeHydration();
      },
      merge: (persisted, current) => {
        const from = (persisted ?? {}) as Partial<PersistedSlice>;
        return {
          ...current,
          ...from,
          notes: (from.notes ?? current.notes).map(migrateNote),
          prefs: { ...DEFAULT_PREFS, ...from.prefs },
        };
      },
    },
  ),
);
