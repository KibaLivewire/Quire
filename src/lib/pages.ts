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

function blockIndex(editor: Editor, el: HTMLElement): number {
  const json = editor.getJSON().content ?? [];
  for (let i = 0; i < json.length; i += 1) {
    const pos = blockStart(editor, i);
    if (pos < 0) continue;
    const node = editor.view.nodeDOM(pos);
    if (node === el || (node instanceof HTMLElement && node.contains(el)) || (el.contains(node as Node))) {
      return i;
    }
  }
  return -1;
}

function blockStart(editor: Editor, index: number): number {
  let pos = 0;
  const content = editor.state.doc.content;
  for (let i = 0; i < content.childCount; i += 1) {
    if (i === index) return pos;
    pos += content.child(i).nodeSize;
  }
  return -1;
}

export function splitOverflow(editor: Editor, maxHeight: number): { html: string; size: number } | null {
  const root = editor.view.dom;
  const children = Array.from(root.children) as HTMLElement[];
  const blocks = children.filter((el) => !el.classList.contains("ProseMirror-trailingBreak"));
  if (blocks.length < 2) return null;

  let overflowEl: HTMLElement | null = null;
  for (const el of blocks) {
    if (el.offsetTop + el.offsetHeight > maxHeight) {
      overflowEl = el;
      break;
    }
  }
  if (!overflowEl) return null;

  let firstOverflow = blockIndex(editor, overflowEl);
  if (firstOverflow < 0) {
    firstOverflow = blocks.indexOf(overflowEl);
  }
  if (firstOverflow <= 0) return null;

  const json = editor.getJSON();
  const content = json.content ?? [];
  if (content.length <= firstOverflow) return null;

  let pos = 0;
  const doc = editor.state.doc;
  for (let i = 0; i < firstOverflow && i < doc.childCount; i += 1) pos += doc.child(i).nodeSize;
  const size = Math.max(0, doc.content.size - pos);

  const keep = content.slice(0, firstOverflow);
  const moved = content.slice(firstOverflow);
  editor.commands.setContent({
    type: "doc",
    content: keep.length ? keep : [{ type: "paragraph" }],
  });
  return { html: jsonToHtml(editor, { type: "doc", content: moved }), size };
}
