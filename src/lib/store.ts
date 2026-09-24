import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { createSeed, DEMO_FOLDER_IDS, DEMO_NOTE_IDS } from "./seed";
import { NOTEBOOK_HUES, DEFAULT_PREFS, DEFAULT_SESSION, type Note, type Notebook, type NotebookHue, type PageMeta, type PageRecipeId, type Prefs, type RibbonBookmark, type Session } from "./types";
import { alignPageMeta, applyRecipeToMeta, defaultPageMeta, softCapRibbons, starterHtmlForRecipe } from "./recipes";
import { addToDictionary, normalizeWord } from "./dictionary";
import { hashPin, newSalt, pinMatches } from "./lock";
import { notePages } from "./pages";
import { descendantIds, isAlive, isDescendant } from "./folders";
import { WELCOME_VERSION } from "./welcome";
import { rememberBoot } from "./boot-peek";
import { readDesktopPrefs, writeDesktopPrefs } from "./desktop";
import { flushPendingEdits } from "./pending-save";

const DB_NAME = "quire";
const STORE_NAME = "kv";

type PersistedSlice = {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  initialized: boolean;
  prefs: Prefs;
  session: Session;
};

const TRASH_MS = 30 * 24 * 60 * 60 * 1000;

export function todayKey(stamp = Date.now()) {
  const date = new Date(stamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type NotebookState = {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  initialized: boolean;
  hasHydrated: boolean;
  focusMode: boolean;
  quillOpen: boolean;
  pageMapOpen: boolean;
  prefs: Prefs;
  session: Session;
  unlockedIds: string[];
  completeHydration: () => void;
  setFocusMode: (value: boolean) => void;
  setQuillOpen: (value: boolean) => void;
  setPageMapOpen: (value: boolean) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setSession: (patch: Partial<Session>) => void;
  recordWords: (added: number) => void;
  setActiveNotebook: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  createNotebook: (name: string, parentId?: string | null) => string;
  renameNotebook: (id: string, name: string) => void;
  colorNotebook: (id: string, color: string) => void;
  moveNotebook: (id: string, parentId: string | null) => void;
  deleteNotebook: (id: string) => void;
  restoreNotebook: (id: string) => void;
  createNote: (notebookId?: string, recipe?: PageRecipeId) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "content" | "pinned" | "notebookId" | "pages" | "pageMeta" | "color">>) => void;
  updateNotePage: (id: string, pageIndex: number, html: string) => void;
  insertNotePage: (id: string, atIndex: number, html?: string, recipe?: PageRecipeId) => number;
  setNotePages: (
    id: string,
    pages: string[],
    edit?: { insertAt?: number; removeAt?: number; prependAt?: number; shift?: number },
  ) => void;
  setPageRecipe: (noteId: string, pageIndex: number, recipe: PageRecipeId) => void;
  placeRibbon: (noteId: string, pageIndex: number, ribbon: Omit<RibbonBookmark, "id" | "createdAt"> & { id?: string; createdAt?: number }) => string | null;
  untieRibbon: (noteId: string, pageIndex: number, ribbonId: string) => void;
  renameRibbon: (noteId: string, pageIndex: number, ribbonId: string, label: string) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  purgeForever: (kind: "note" | "folder", id: string) => void;
  emptyTrash: () => void;
  duplicateNote: (id: string) => string | null;
  togglePin: (id: string) => void;
  moveNote: (id: string, notebookId: string) => void;
  replaceDesk: (payload: { notebooks: Notebook[]; notes: Note[]; prefs?: Partial<Prefs> }) => void;
  setLock: (kind: "note" | "folder", id: string, pin: string) => Promise<boolean>;
  unlock: (kind: "note" | "folder", id: string, pin: string) => Promise<boolean>;
  clearLock: (kind: "note" | "folder", id: string, pin: string) => Promise<boolean>;
  addDictionaryWord: (word: string) => void;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      dbPromise = null;
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

/** Skip IDB writes until rehydrate getItem finishes so defaults cannot clobber saved desk. */
let persistEnabled = false;
let writeTail: Promise<void> = Promise.resolve();
let pendingFilePrefs: Partial<Prefs> | null = null;

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeTail = writeTail.then(task, task);
  return writeTail;
}

async function idbGet(name: string): Promise<StorageValue<PersistedSlice> | null> {
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
}

async function idbPut(name: string, value: StorageValue<PersistedSlice>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(name: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function takePendingFilePrefs(): Partial<Prefs> | null {
  const next = pendingFilePrefs;
  pendingFilePrefs = null;
  return next;
}

async function persistValue(name: string, value: StorageValue<PersistedSlice>): Promise<void> {
  await idbPut(name, value);
  const prefs = value.state?.prefs;
  if (prefs) {
    await writeDesktopPrefs(prefs);
  }
}

const idbStorage: PersistStorage<PersistedSlice> = {
  getItem: async (name) => {
    try {
      const stored = await idbGet(name);
      const filePrefs = await readDesktopPrefs();
      persistEnabled = true;
      if (filePrefs && stored?.state) {
        return {
          ...stored,
          state: {
            ...stored.state,
            prefs: mergePrefs({ ...DEFAULT_PREFS, ...stored.state.prefs }, filePrefs),
          },
        };
      }
      if (filePrefs && !stored) {
        pendingFilePrefs = filePrefs;
      }
      return stored;
    } catch {
      persistEnabled = true;
      return null;
    }
  },
  setItem: async (name, value) => {
    if (!persistEnabled) return;
    await enqueueWrite(() => persistValue(name, value));
  },
  removeItem: async (name) => {
    if (!persistEnabled) return;
    await enqueueWrite(async () => {
      await idbDelete(name);
    });
  },
};

function nextHue(existing: Notebook[]): NotebookHue {
  const used = new Set(existing.map((nb) => nb.hue));
  return NOTEBOOK_HUES.find((hue) => !used.has(hue)) ?? NOTEBOOK_HUES[existing.length % NOTEBOOK_HUES.length];
}

function pageSearchText(pages: string[]) {
  return pages.join("\n");
}

function migrateNote(note: Note): Note {
  const pages = notePages(note);
  const pageMeta = alignPageMeta(pages, note.pageMeta);
  return { ...note, pages, pageMeta, content: pageSearchText(pages), color: note.color ?? null, deletedAt: note.deletedAt ?? null };
}

function withPagesAndMeta(note: Note, pages: string[], pageMeta?: PageMeta[]): Note {
  const meta = alignPageMeta(pages, pageMeta ?? note.pageMeta);
  return { ...note, pages, pageMeta: meta, content: pageSearchText(pages), updatedAt: Date.now() };
}

function migrateNotebook(notebook: Notebook): Notebook {
  return {
    ...notebook,
    parentId: notebook.parentId ?? null,
    color: notebook.color ?? null,
    deletedAt: notebook.deletedAt ?? null,
  };
}

function purgeExpired(notebooks: Notebook[], notes: Note[]) {
  const cutoff = Date.now() - TRASH_MS;
  const expired = new Set<string>();
  for (const folder of notebooks) {
    if (!folder.deletedAt || folder.deletedAt >= cutoff) continue;
    for (const id of descendantIds(notebooks, folder.id)) expired.add(id);
  }
  return {
    notebooks: notebooks.filter((nb) => !expired.has(nb.id)),
    notes: notes.filter((note) => !(note.deletedAt && note.deletedAt < cutoff) && !expired.has(note.notebookId)),
  };
}

function nextPrefs(prefs: Prefs, patch: Partial<Prefs>): Prefs {
  return { ...prefs, ...patch, prefsRevision: (prefs.prefsRevision || 0) + 1 };
}

function mergePrefs(statePrefs: Prefs, filePrefs: Partial<Prefs> | null): Prefs {
  const fileRev = Number(filePrefs?.prefsRevision) || 0;
  const stateRev = Number(statePrefs?.prefsRevision) || 0;
  if (filePrefs && fileRev > stateRev) return { ...DEFAULT_PREFS, ...statePrefs, ...filePrefs };
  return { ...DEFAULT_PREFS, ...filePrefs, ...statePrefs };
}

function withJoinedContent(note: Note, pages: string[]): Note {
  return withPagesAndMeta(note, pages);
}

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      initialized: true,
      hasHydrated: false,
      focusMode: false,
      quillOpen: false,
      pageMapOpen: false,
      unlockedIds: [],
      prefs: { ...DEFAULT_PREFS },
      session: { ...DEFAULT_SESSION },

      completeHydration: () =>
        set((state) => {
          if (!state.initialized) {
            const seed = createSeed();
            const filePrefs = takePendingFilePrefs();
            return {
              ...seed,
              initialized: true,
              hasHydrated: true,
              prefs: { ...DEFAULT_PREFS, ...filePrefs },
              session: { ...DEFAULT_SESSION },
            };
          }
          const notes = state.notes.map(migrateNote);
          const notebooks = state.notebooks.map(migrateNotebook);
          const purged = purgeExpired(notebooks, notes);
          const today = todayKey();
          const filePrefs = takePendingFilePrefs();
          const prefs = mergePrefs(state.prefs, filePrefs);
          if (prefs.wordsDate !== today) {
            prefs.wordsToday = 0;
            prefs.wordsDate = today;
          }
          let liveNotes = purged.notes;
          let liveNotebooks = purged.notebooks;
          if ((prefs.welcomeVersion || 0) < WELCOME_VERSION) {
            liveNotes = liveNotes.filter((item) => !DEMO_NOTE_IDS.has(item.id));
            liveNotebooks = liveNotebooks.filter((nb) => {
              if (!DEMO_FOLDER_IDS.has(nb.id)) return true;
              return liveNotes.some((item) => item.notebookId === nb.id);
            });
            prefs.welcomeVersion = WELCOME_VERSION;
          }
          const session = { ...DEFAULT_SESSION, ...state.session };
          const noteOk = liveNotes.some((note) => note.id === (session.noteId || state.activeNoteId) && isAlive(note));
          const notebookOk = liveNotebooks.some((nb) => nb.id === (session.notebookId || state.activeNotebookId) && isAlive(nb));
          return {
            hasHydrated: true,
            notes: liveNotes,
            notebooks: liveNotebooks,
            prefs,
            session,
            activeNoteId: noteOk ? (session.noteId || state.activeNoteId) : liveNotes.find(isAlive)?.id ?? null,
            activeNotebookId: notebookOk
              ? (session.notebookId || state.activeNotebookId)
              : liveNotebooks.find(isAlive)?.id ?? null,
          };
        }),

      setFocusMode: (value) => set({ focusMode: value }),
      setQuillOpen: (value) => set({ quillOpen: value }),
      setPageMapOpen: (value) => set({ pageMapOpen: value }),

      setPrefs: (patch) => {
        if (!get().hasHydrated) return;
        set((state) => ({
          prefs: nextPrefs(state.prefs, patch),
        }));
        rememberBoot(get().prefs);
      },

      setSession: (patch) => {
        if (!get().hasHydrated) return;
        set((state) => ({
          session: { ...state.session, ...patch },
        }));
      },

      recordWords: (added) => {
        if (added <= 0) return;
        const today = todayKey();
        set((state) => {
          const same = state.prefs.wordsDate === today;
          return {
            prefs: nextPrefs(state.prefs, {
              wordsDate: today,
              wordsToday: (same ? state.prefs.wordsToday : 0) + added,
            }),
          };
        });
      },

      setActiveNotebook: (id) => {
        flushPendingEdits();
        const notes = get().notes.filter((note) => note.notebookId === id && isAlive(note));
        const nextNote =
          notes.find((note) => note.id === get().activeNoteId) ??
          [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)[0];
        set({
          activeNotebookId: id,
          activeNoteId: nextNote?.id ?? null,
          focusMode: false,
          session: { ...get().session, notebookId: id, noteId: nextNote?.id ?? null, pageIndex: 0, cursor: 0 },
        });
      },

      setActiveNote: (id) => {
        flushPendingEdits();
        set((state) => ({
          activeNoteId: id,
          session: { ...state.session, noteId: id, pageIndex: id === state.session.noteId ? state.session.pageIndex : 0 },
        }));
      },

      createNotebook: (name, parentId = null) => {
        const id = crypto.randomUUID();
        const parent = parentId && get().notebooks.some((nb) => nb.id === parentId) ? parentId : null;
        const notebook: Notebook = {
          id,
          name: name.trim() || "Untitled folder",
          hue: nextHue(get().notebooks),
          parentId: parent,
          color: null,
          createdAt: Date.now(),
          deletedAt: null,
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

      colorNotebook: (id, color) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, color } : nb)),
        }));
      },

      moveNotebook: (id, parentId) => {
        if (id === parentId) return;
        const notebooks = get().notebooks;
        if (parentId && (isDescendant(notebooks, id, parentId) || !notebooks.some((nb) => nb.id === parentId))) {
          return;
        }
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, parentId } : nb)),
        }));
      },

      deleteNotebook: (id) => {
        const { notebooks, notes, activeNotebookId } = get();
        const remove = new Set(descendantIds(notebooks, id));
        const now = Date.now();
        const nextNotebooks = notebooks.map((nb) => {
          if (!remove.has(nb.id) || nb.deletedAt) return nb;
          return { ...nb, deletedAt: now };
        });
        const nextNotes = notes.map((note) => {
          if (!remove.has(note.notebookId) || note.deletedAt) return note;
          return { ...note, deletedAt: now };
        });
        let live = nextNotebooks.filter(isAlive);
        if (live.length === 0) {
          const fresh: Notebook = {
            id: crypto.randomUUID(),
            name: "Pages",
            hue: "forest",
            parentId: null,
            color: "#3d6b4f",
            createdAt: Date.now(),
            deletedAt: null,
          };
          nextNotebooks.push(fresh);
          live = [fresh];
        }
        const nextActive = remove.has(activeNotebookId || "") ? live[0].id : activeNotebookId;
        const inNotebook = nextNotes.filter((note) => note.notebookId === nextActive && isAlive(note));
        set({
          notebooks: nextNotebooks,
          notes: nextNotes,
          activeNotebookId: nextActive,
          activeNoteId: inNotebook[0]?.id ?? null,
        });
      },

      restoreNotebook: (id) => {
        const notebooks = get().notebooks;
        const folder = notebooks.find((nb) => nb.id === id);
        if (!folder) return;
        const stamp = folder.deletedAt;
        const ancestors = new Set<string>();
        const guard = new Set<string>();
        let current = notebooks.find((nb) => nb.id === folder.parentId) ?? null;
        while (current && !guard.has(current.id)) {
          guard.add(current.id);
          ancestors.add(current.id);
          current = notebooks.find((nb) => nb.id === current?.parentId) ?? null;
        }
        const descendants = new Set(descendantIds(notebooks, id));
        const cameWithFolder = (deletedAt: number | null | undefined) => !deletedAt || deletedAt === stamp;
        set((state) => ({
          notebooks: state.notebooks.map((nb) => {
            if (ancestors.has(nb.id)) return { ...nb, deletedAt: null };
            if (descendants.has(nb.id) && cameWithFolder(nb.deletedAt)) return { ...nb, deletedAt: null };
            return nb;
          }),
          notes: state.notes.map((note) => {
            if (!descendants.has(note.notebookId) || !cameWithFolder(note.deletedAt)) return note;
            return { ...note, deletedAt: null };
          }),
          activeNotebookId: id,
        }));
      },

      createNote: (notebookId, recipe = "freewrite") => {
        flushPendingEdits();
        const id = crypto.randomUUID();
        const alive = get().notebooks.filter(isAlive);
        let target = notebookId && alive.some((nb) => nb.id === notebookId) ? notebookId : null;
        if (!target && alive.some((nb) => nb.id === get().activeNotebookId)) target = get().activeNotebookId;
        if (!target) target = alive[0]?.id ?? null;
        if (!target) target = get().createNotebook("Notebook");
        const now = Date.now();
        const html = starterHtmlForRecipe(recipe);
        const pages = [html];
        const pageMeta = [defaultPageMeta(recipe)];
        const note: Note = {
          id,
          notebookId: target,
          title: recipe === "journal" ? "Journal" : "Untitled",
          content: html,
          pages,
          pageMeta,
          pinned: false,
          color: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        set((state) => ({
          notes: [note, ...state.notes],
          activeNotebookId: target,
          activeNoteId: id,
          prefs: nextPrefs(state.prefs, { lastPageRecipe: recipe }),
          session: { ...state.session, noteId: id, notebookId: target, pageIndex: 0, cursor: 0 },
        }));
        return id;
      },

      updateNote: (id, patch) => {
        set((state) => ({
          notes: state.notes.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...patch, updatedAt: Date.now() };
            if (patch.pages) {
              next.content = pageSearchText(patch.pages);
              next.pageMeta = alignPageMeta(patch.pages, patch.pageMeta ?? item.pageMeta);
            } else if (patch.content !== undefined && !patch.pages) {
              const pages = [...notePages(item)];
              pages[0] = patch.content;
              next.pages = pages;
              next.content = pageSearchText(pages);
              next.pageMeta = alignPageMeta(pages, patch.pageMeta ?? item.pageMeta);
            } else if (patch.pageMeta) {
              next.pageMeta = alignPageMeta(notePages(next), patch.pageMeta);
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

      insertNotePage: (id, atIndex, html, recipe) => {
        flushPendingEdits();
        const item = get().notes.find((note) => note.id === id);
        if (!item) return 0;
        const pages = [...notePages(item)];
        const meta = alignPageMeta(pages, item.pageMeta);
        const index = Math.max(0, Math.min(atIndex, pages.length));
        const from = recipe ?? meta[Math.max(0, index - 1)]?.recipe ?? "freewrite";
        pages.splice(index, 0, html ?? starterHtmlForRecipe(from));
        meta.splice(index, 0, defaultPageMeta(from));
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? withPagesAndMeta(note, pages, meta) : note)),
        }));
        return index;
      },

      setNotePages: (id, pages, edit) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== id) return note;
            const prevMeta: PageMeta[] = alignPageMeta(notePages(note), note.pageMeta).map((meta) => ({
              ...meta,
              ribbons: (meta.ribbons ?? []).map((ribbon) => ({ ...ribbon })),
            }));
            const nextMeta: PageMeta[] = [...prevMeta];
            if (edit?.insertAt != null) {
              const at = Math.max(0, Math.min(edit.insertAt, nextMeta.length));
              const recipe = nextMeta[Math.max(0, at - 1)]?.recipe ?? "freewrite";
              nextMeta.splice(at, 0, defaultPageMeta(recipe));
            } else if (edit?.removeAt != null) {
              nextMeta.splice(Math.max(0, edit.removeAt), 1);
            }
            if (edit?.prependAt != null && edit.shift) {
              const page = nextMeta[edit.prependAt];
              if (page) {
                nextMeta[edit.prependAt] = {
                  ...page,
                  ribbons: (page.ribbons ?? []).map((ribbon) => ({ ...ribbon, pos: ribbon.pos + (edit.shift ?? 0) })),
                };
              }
            }
            while (nextMeta.length < pages.length) nextMeta.push(defaultPageMeta("freewrite"));
            nextMeta.length = pages.length;
            return withPagesAndMeta(note, pages, nextMeta);
          }),
        }));
      },

      deleteNote: (id) => {
        const { notes, activeNoteId } = get();
        const target = notes.find((note) => note.id === id);
        const now = Date.now();
        const nextNotes = notes.map((note) => (note.id === id ? { ...note, deletedAt: now } : note));
        let nextActive = activeNoteId;
        if (activeNoteId === id) {
          const siblings = nextNotes
            .filter((note) => note.notebookId === target?.notebookId && isAlive(note))
            .sort((a, b) => b.updatedAt - a.updatedAt);
          nextActive = siblings[0]?.id ?? null;
        }
        set({ notes: nextNotes, activeNoteId: nextActive });
      },

      restoreNote: (id) => {
        const note = get().notes.find((item) => item.id === id);
        if (!note) return;
        const notebooks = get().notebooks;
        const chain = new Set<string>();
        const guard = new Set<string>();
        let current = notebooks.find((nb) => nb.id === note.notebookId) ?? null;
        while (current && !guard.has(current.id)) {
          guard.add(current.id);
          chain.add(current.id);
          current = notebooks.find((nb) => nb.id === current?.parentId) ?? null;
        }
        set((state) => ({
          notes: state.notes.map((item) => (item.id === id ? { ...item, deletedAt: null } : item)),
          notebooks: state.notebooks.map((nb) => (chain.has(nb.id) ? { ...nb, deletedAt: null } : nb)),
          activeNotebookId: note.notebookId,
          activeNoteId: id,
        }));
      },

      purgeForever: (kind, id) => {
        if (kind === "folder") {
          const remove = new Set(descendantIds(get().notebooks, id));
          set((state) => ({
            notebooks: state.notebooks.filter((nb) => !remove.has(nb.id)),
            notes: state.notes.filter((note) => !remove.has(note.notebookId)),
          }));
          return;
        }
        set((state) => ({ notes: state.notes.filter((note) => note.id !== id) }));
      },

      emptyTrash: () => {
        set((state) => ({
          notebooks: state.notebooks.filter(isAlive),
          notes: state.notes.filter(isAlive),
        }));
      },

      duplicateNote: (id) => {
        const source = get().notes.find((note) => note.id === id);
        if (!source) return null;
        const copyId = crypto.randomUUID();
        const now = Date.now();
        const pages = [...notePages(source)];
        const pageMeta = alignPageMeta(pages, source.pageMeta).map((meta) => ({
          ...meta,
          ribbons: (meta.ribbons ?? []).map((ribbon) => ({ ...ribbon, id: crypto.randomUUID() })),
        }));
        const copy: Note = {
          ...source,
          id: copyId,
          title: source.title.endsWith(" copy") ? source.title : `${source.title} copy`,
          pinned: false,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          pages,
          pageMeta,
          content: pageSearchText(pages),
          lockSalt: null,
          lockHash: null,
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

      setPageRecipe: (noteId, pageIndex, recipe) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== noteId) return note;
            const pages = notePages(note);
            const meta = alignPageMeta(pages, note.pageMeta);
            const index = Math.max(0, Math.min(pageIndex, meta.length - 1));
            meta[index] = applyRecipeToMeta(meta[index], recipe);
            return { ...note, pageMeta: meta, updatedAt: Date.now() };
          }),
          prefs: nextPrefs(state.prefs, { lastPageRecipe: recipe }),
        }));
      },

      placeRibbon: (noteId, pageIndex, ribbon) => {
        let createdId: string | null = null;
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== noteId) return note;
            const pages = notePages(note);
            const meta = alignPageMeta(pages, note.pageMeta);
            const index = Math.max(0, Math.min(pageIndex, meta.length - 1));
            const page = meta[index];
            const ribbons = [...(page.ribbons ?? [])];
            if (ribbons.length >= 20) return note;
            const same = ribbons.find((item) => item.pos === ribbon.pos);
            if (same) {
              same.label = ribbon.label || same.label;
              same.snippet = ribbon.snippet ?? same.snippet;
              createdId = same.id;
              meta[index] = { ...page, ribbons };
              return { ...note, pageMeta: meta, updatedAt: Date.now() };
            }
            const id = ribbon.id || crypto.randomUUID();
            createdId = id;
            ribbons.push({
              id,
              pos: ribbon.pos,
              label: ribbon.label || "Bookmark",
              createdAt: ribbon.createdAt || Date.now(),
              snippet: ribbon.snippet,
            });
            meta[index] = { ...page, ribbons: softCapRibbons(ribbons) };
            return { ...note, pageMeta: meta, updatedAt: Date.now() };
          }),
        }));
        return createdId;
      },

      untieRibbon: (noteId, pageIndex, ribbonId) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== noteId) return note;
            const pages = notePages(note);
            const meta = alignPageMeta(pages, note.pageMeta);
            const index = Math.max(0, Math.min(pageIndex, meta.length - 1));
            const page = meta[index];
            meta[index] = { ...page, ribbons: (page.ribbons ?? []).filter((item) => item.id !== ribbonId) };
            return { ...note, pageMeta: meta, updatedAt: Date.now() };
          }),
        }));
      },

      renameRibbon: (noteId, pageIndex, ribbonId, label) => {
        const trimmed = label.trim() || "Bookmark";
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== noteId) return note;
            const pages = notePages(note);
            const meta = alignPageMeta(pages, note.pageMeta);
            const index = Math.max(0, Math.min(pageIndex, meta.length - 1));
            const page = meta[index];
            meta[index] = {
              ...page,
              ribbons: (page.ribbons ?? []).map((item) => (item.id === ribbonId ? { ...item, label: trimmed } : item)),
            };
            return { ...note, pageMeta: meta, updatedAt: Date.now() };
          }),
        }));
      },

      replaceDesk: (payload) => {
        set({
          notebooks: payload.notebooks.map(migrateNotebook),
          notes: payload.notes.map(migrateNote),
          prefs: payload.prefs ? { ...DEFAULT_PREFS, ...get().prefs, ...payload.prefs } : get().prefs,
          activeNotebookId: payload.notebooks.find(isAlive)?.id ?? null,
          activeNoteId: payload.notes.find(isAlive)?.id ?? null,
          session: { ...DEFAULT_SESSION },
          unlockedIds: [],
        });
      },

      setLock: async (kind, id, pin) => {
        const trimmed = pin.trim();
        if (trimmed.length < 4 || trimmed.length > 32) return false;
        const salt = newSalt();
        const hash = await hashPin(trimmed, salt);
        const key = `${kind}:${id}`;
        set((state) => {
          if (kind === "note") {
            return {
              notes: state.notes.map((note) =>
                note.id === id ? { ...note, lockSalt: salt, lockHash: hash, updatedAt: Date.now() } : note,
              ),
              unlockedIds: state.unlockedIds.includes(key) ? state.unlockedIds : [...state.unlockedIds, key],
            };
          }
          return {
            notebooks: state.notebooks.map((nb) =>
              nb.id === id ? { ...nb, lockSalt: salt, lockHash: hash } : nb,
            ),
            unlockedIds: state.unlockedIds.includes(key) ? state.unlockedIds : [...state.unlockedIds, key],
          };
        });
        return true;
      },

      unlock: async (kind, id, pin) => {
        const item =
          kind === "note"
            ? get().notes.find((note) => note.id === id)
            : get().notebooks.find((nb) => nb.id === id);
        if (!item?.lockHash || !item.lockSalt) return false;
        if (!(await pinMatches(pin, item.lockSalt, item.lockHash))) return false;
        const key = `${kind}:${id}`;
        set((state) => ({
          unlockedIds: state.unlockedIds.includes(key) ? state.unlockedIds : [...state.unlockedIds, key],
        }));
        return true;
      },

      clearLock: async (kind, id, pin) => {
        const item =
          kind === "note"
            ? get().notes.find((note) => note.id === id)
            : get().notebooks.find((nb) => nb.id === id);
        if (!item?.lockHash || !item.lockSalt) return false;
        if (!(await pinMatches(pin, item.lockSalt, item.lockHash))) return false;
        const key = `${kind}:${id}`;
        set((state) => {
          if (kind === "note") {
            return {
              notes: state.notes.map((note) =>
                note.id === id ? { ...note, lockSalt: null, lockHash: null, updatedAt: Date.now() } : note,
              ),
              unlockedIds: state.unlockedIds.filter((itemId) => itemId !== key),
            };
          }
          return {
            notebooks: state.notebooks.map((nb) =>
              nb.id === id ? { ...nb, lockSalt: null, lockHash: null } : nb,
            ),
            unlockedIds: state.unlockedIds.filter((itemId) => itemId !== key),
          };
        });
        return true;
      },

      addDictionaryWord: (word) => {
        const added = normalizeWord(word);
        if (!added) return;
        set((state) => ({
          prefs: nextPrefs(state.prefs, { dictionary: addToDictionary(state.prefs.dictionary, added) }),
        }));
        if (typeof window !== "undefined") {
          void window.quire?.addSpellWord?.(added);
        }
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
        session: state.session,
      }),
      onRehydrateStorage: () => (state) => {
        persistEnabled = true;
        state?.completeHydration();
        rememberBoot(useNotebookStore.getState().prefs);
      },
      merge: (persisted, current) => {
        const from = (persisted ?? {}) as Partial<PersistedSlice>;
        return {
          ...current,
          ...from,
          notes: (from.notes ?? current.notes).map(migrateNote),
          notebooks: (from.notebooks ?? current.notebooks).map(migrateNotebook),
          prefs: { ...DEFAULT_PREFS, ...from.prefs },
          session: { ...DEFAULT_SESSION, ...from.session },
        };
      },
    },
  ),
);

/** Await pending IDB (+ desktop prefs) writes; force one more snapshot if hydrated. */
export async function flushNotebookPersist(): Promise<void> {
  const state = useNotebookStore.getState();
  if (!state.hasHydrated) {
    await writeTail;
    return;
  }
  persistEnabled = true;
  const slice: PersistedSlice = {
    notebooks: state.notebooks,
    notes: state.notes,
    activeNotebookId: state.activeNotebookId,
    activeNoteId: state.activeNoteId,
    initialized: state.initialized,
    prefs: state.prefs,
    session: state.session,
  };
  await enqueueWrite(() => persistValue("quire-v1", { state: slice }));
}

