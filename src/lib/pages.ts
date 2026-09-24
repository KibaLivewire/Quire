import { DOMSerializer } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { Note } from "./types";
import { plainText } from "./utils";

export function notePages(note: Note): string[] {
  if (note.pages?.length) return note.pages;
  return [note.content || ""];
}

export function isPageEmpty(html: string): boolean {
  return plainText(html).length === 0 && !/<img\b/i.test(html);
}

function jsonToHtml(editor: Editor, json: JSONContent): string {
  const node = editor.schema.nodeFromJSON(json);
  const serializer = DOMSerializer.fromSchema(editor.schema);
  const wrap = document.createElement("div");
  wrap.appendChild(serializer.serializeFragment(node.content));
  return wrap.innerHTML;
}

function fits(editor: Editor, pos: number, limit: number): boolean {
  try {
    return editor.view.coordsAtPos(pos).bottom <= limit + 1;
  } catch {
    return false;
  }
}

/** Keep a word together when the cut lands in the middle of it. */
function snapCut(doc: Editor["state"]["doc"], pos: number): number {
  try {
    const $pos = doc.resolve(pos);
    if (!$pos.parent.isTextblock) return pos;
    const min = Math.max(pos - $pos.parentOffset + 1, pos - 32);
    let i = pos;
    while (i > min) {
      const ch = doc.textBetween(i - 1, i);
      if (!ch || /\s/.test(ch)) return i;
      i -= 1;
    }
  } catch {
    /* measured cut still stands */
  }
  return pos;
}

/**
 * Last document position that still sits on the sheet.
 * Returns -1 when the first line itself is taller than the sheet (leave it oversized).
 */
function findFitCut(editor: Editor, maxHeight: number): number {
  const doc = editor.state.doc;
  const end = doc.content.size;
  if (end <= 1) return -1;
  const limit = editor.view.dom.getBoundingClientRect().top + maxHeight;
  if (!fits(editor, Math.min(1, end), limit)) return -1;
  let lo = 1;
  let hi = end;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (fits(editor, mid, limit)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best <= 0 || best >= end) return -1;
  const snapped = snapCut(doc, best);
  if (snapped <= 0 || snapped >= end) return best;
  return snapped;
}

function applyCut(editor: Editor, cut: number): { html: string; size: number } | null {
  const doc = editor.state.doc;
  if (cut <= 0 || cut >= doc.content.size) return null;
  let kept;
  let moved;
  try {
    kept = doc.cut(0, cut);
    moved = doc.cut(cut);
  } catch {
    return null;
  }
  if (kept.content.size <= 0 || moved.content.size <= 0) return null;
  if (kept.content.size >= doc.content.size) return null;
  const size = moved.content.size;
  const html = jsonToHtml(editor, moved.toJSON() as JSONContent);
  editor.commands.setContent(kept.toJSON());
  return { html, size };
}

export function splitOverflow(editor: Editor, maxHeight: number): { html: string; size: number } | null {
  const root = editor.view?.dom;
  if (!root || root.scrollHeight <= maxHeight + 12) return null;
  const cut = findFitCut(editor, maxHeight);
  if (cut <= 0) return null;
  return applyCut(editor, cut);
}
