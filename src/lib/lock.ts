import type { Note, Notebook } from "./types";

export async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin.trim()}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isLocked(item?: { lockHash?: string | null } | null) {
  return Boolean(item?.lockHash);
}

/** Walk the whole digest. A shared prefix must not finish the check early. */
export function sameDigest(a: string, b: string) {
  const left = String(a);
  const right = String(b);
  const n = Math.max(left.length, right.length, 64);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < n; i += 1) {
    const x = i < left.length ? left.charCodeAt(i) : 0;
    const y = i < right.length ? right.charCodeAt(i) : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}

export async function pinMatches(pin: string, salt: string, hash: string) {
  const next = await hashPin(pin, salt);
  return sameDigest(next, hash);
}

export function lockKey(kind: "note" | "folder", id: string) {
  return `${kind}:${id}`;
}

export function folderChain(notebooks: Notebook[], notebookId: string | null | undefined) {
  const ids: string[] = [];
  const guard = new Set<string>();
  let current = notebooks.find((nb) => nb.id === notebookId) ?? null;
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    ids.push(current.id);
    current = notebooks.find((nb) => nb.id === current?.parentId) ?? null;
  }
  return ids;
}

export type LockGate = { kind: "note" | "folder"; id: string; name: string };

export function folderGate(
  notebooks: Notebook[],
  notebookId: string | null | undefined,
  unlockedIds: string[],
): LockGate | null {
  for (const id of folderChain(notebooks, notebookId)) {
    const folder = notebooks.find((nb) => nb.id === id);
    if (folder && isLocked(folder) && !unlockedIds.includes(lockKey("folder", id))) {
      return { kind: "folder", id, name: folder.name };
    }
  }
  return null;
}

export function noteGate(
  notebooks: Notebook[],
  note: Note | null | undefined,
  unlockedIds: string[],
): LockGate | null {
  if (note && isLocked(note) && !unlockedIds.includes(lockKey("note", note.id))) {
    return { kind: "note", id: note.id, name: note.title || "Untitled" };
  }
  return folderGate(notebooks, note?.notebookId ?? null, unlockedIds);
}

export function pinLooksValid(pin: string) {
  const next = pin.trim();
  return next.length >= 4 && next.length <= 32;
}

const failState = new Map<string, { count: number; until: number }>();

export function lockWaitMs(kind: "note" | "folder", id: string) {
  const row = failState.get(`${kind}:${id}`);
  if (!row) return 0;
  return Math.max(0, row.until - Date.now());
}

export function recordLockFailure(kind: "note" | "folder", id: string) {
  const key = `${kind}:${id}`;
  const count = (failState.get(key)?.count ?? 0) + 1;
  const wait = Math.min(30_000, 500 * 2 ** Math.min(count, 8));
  failState.set(key, { count, until: Date.now() + wait });
}

export function clearLockFailures(kind: "note" | "folder", id: string) {
  failState.delete(`${kind}:${id}`);
}
