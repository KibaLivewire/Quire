import { Mark, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseNode } from "@tiptap/pm/model";

export const BOOKMARK_TONES = [
  { id: "wine", label: "Wine" },
  { id: "moss", label: "Moss" },
  { id: "gilt", label: "Gilt" },
  { id: "sky", label: "Sky" },
  { id: "umber", label: "Umber" },
] as const;

export type BookmarkTone = (typeof BOOKMARK_TONES)[number]["id"];

export function isBookmarkTone(value: string): value is BookmarkTone {
  return BOOKMARK_TONES.some((item) => item.id === value);
}

export type PageBookmarkHit = {
  id: string;
  color: BookmarkTone;
  from: number;
  to: number;
  snippet: string;
};

export type PageNoteHit = {
  id: string;
  body: string;
  from: number;
  to: number;
  snippet: string;
  index: number;
};

function selectionRange(editor: Editor) {
  const { from, to, empty } = editor.state.selection;
  if (empty || to <= from) return null;
  return { from, to };
}

export function collectPageBookmarks(editor: Editor): PageBookmarkHit[] {
  const map = new Map<string, PageBookmarkHit>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const mark = node.marks.find((item) => item.type.name === "pageBookmark");
    if (!mark?.attrs.id) return;
    const from = pos;
    const to = pos + node.nodeSize;
    const color = isBookmarkTone(String(mark.attrs.color || "")) ? (mark.attrs.color as BookmarkTone) : "gilt";
    const existing = map.get(mark.attrs.id);
    if (existing) {
      existing.to = to;
      existing.snippet = editor.state.doc.textBetween(existing.from, to, " ");
    } else {
      map.set(mark.attrs.id, { id: mark.attrs.id, color, from, to, snippet: node.text });
    }
  });
  return [...map.values()];
}

export function collectPageNotes(editor: Editor): PageNoteHit[] {
  const map = new Map<string, Omit<PageNoteHit, "index">>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const mark = node.marks.find((item) => item.type.name === "pageNote");
    if (!mark?.attrs.id) return;
    const from = pos;
    const to = pos + node.nodeSize;
    const existing = map.get(mark.attrs.id);
    if (existing) {
      existing.to = to;
      existing.snippet = editor.state.doc.textBetween(existing.from, to, " ");
    } else {
      map.set(mark.attrs.id, {
        id: mark.attrs.id,
        body: String(mark.attrs.body || ""),
        from,
        to,
        snippet: node.text,
      });
    }
  });
  return [...map.values()].map((item, index) => ({ ...item, index: index + 1 }));
}

export function applyPageBookmark(editor: Editor, color: BookmarkTone) {
  const range = selectionRange(editor);
  if (!range) return false;
  return editor
    .chain()
    .focus()
    .setTextSelection(range)
    .setPageBookmark({ id: crypto.randomUUID(), color })
    .run();
}

export function applyPageNote(editor: Editor, body: string) {
  const range = selectionRange(editor);
  const trimmed = body.trim();
  if (!range || !trimmed) return false;
  return editor
    .chain()
    .focus()
    .setTextSelection(range)
    .setPageNote({ id: crypto.randomUUID(), body: trimmed.slice(0, 2000) })
    .run();
}

export function removeMarkById(editor: Editor, typeName: "pageNote" | "pageBookmark", id: string) {
  const type = editor.schema.marks[typeName];
  if (!type) return;
  const { tr, doc } = editor.state;
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((item) => item.type === type && item.attrs.id === id);
    if (mark) tr.removeMark(pos, pos + node.nodeSize, type);
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

export function updatePageNoteBody(editor: Editor, id: string, body: string) {
  const type = editor.schema.marks.pageNote;
  if (!type) return;
  const next = body.trim().slice(0, 2000);
  const { tr, doc } = editor.state;
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((item) => item.type === type && item.attrs.id === id);
    if (!mark) return;
    tr.removeMark(pos, pos + node.nodeSize, type);
    tr.addMark(pos, pos + node.nodeSize, type.create({ ...mark.attrs, body: next }));
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

export function jumpToRange(editor: Editor, from: number, to: number) {
  const max = editor.state.doc.content.size;
  const start = Math.min(Math.max(1, from), max);
  const end = Math.min(Math.max(start, to), max);
  editor.chain().focus().setTextSelection({ from: start, to: end }).scrollIntoView().run();
}

function noteWidgets(doc: ProseNode) {
  type Span = { id: string; body: string; to: number };
  const map = new Map<string, Span>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((item) => item.type.name === "pageNote");
    if (!mark?.attrs.id) return;
    const to = pos + node.nodeSize;
    const existing = map.get(mark.attrs.id);
    if (existing) existing.to = to;
    else map.set(mark.attrs.id, { id: mark.attrs.id, body: String(mark.attrs.body || ""), to });
  });
  const decos = [...map.values()].map((item, index) => {
    const n = index + 1;
    return Decoration.widget(
      item.to,
      () => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "quire-note-ref";
        el.textContent = `[${n}]`;
        el.dataset.note = item.body || "Note";
        el.dataset.noteId = item.id;
        el.setAttribute("aria-label", `Note ${n}. ${item.body || "Empty note"}`);
        el.addEventListener("mousedown", (event) => event.preventDefault());
        el.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.dispatchEvent(new CustomEvent("quire-open-note", { detail: { id: item.id } }));
        });
        return el;
      },
      { side: 1, key: item.id },
    );
  });
  return DecorationSet.create(doc, decos);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageNote: {
      setPageNote: (attrs: { id?: string; body: string }) => ReturnType;
      unsetPageNote: () => ReturnType;
    };
    pageBookmark: {
      setPageBookmark: (attrs: { id?: string; color: string }) => ReturnType;
      unsetPageBookmark: () => ReturnType;
    };
  }
}

export const PageBookmark = Mark.create({
  name: "pageBookmark",
  inclusive: false,
  excludes: "pageBookmark",
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-bookmark-id"),
        renderHTML: (attributes) => (attributes.id ? { "data-bookmark-id": attributes.id } : {}),
      },
      color: {
        default: "gilt",
        parseHTML: (element) => element.getAttribute("data-bookmark") || "gilt",
        renderHTML: (attributes) => ({ "data-bookmark": attributes.color || "gilt" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-bookmark-id]" }, { tag: "span[data-bookmark]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "quire-bookmark" }), 0];
  },
  addCommands() {
    return {
      setPageBookmark:
        (attrs) =>
        ({ commands, state }) => {
          if (state.selection.empty) return false;
          const color = isBookmarkTone(String(attrs.color || "")) ? attrs.color : "gilt";
          return commands.setMark(this.name, { id: attrs.id || crypto.randomUUID(), color });
        },
      unsetPageBookmark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const PageNote = Mark.create({
  name: "pageNote",
  inclusive: false,
  excludes: "pageNote",
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) => (attributes.id ? { "data-note-id": attributes.id } : {}),
      },
      body: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-note") || "",
        renderHTML: (attributes) =>
          attributes.body ? { "data-note": String(attributes.body), title: String(attributes.body) } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-note-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "quire-note" }), 0];
  },
  addCommands() {
    return {
      setPageNote:
        (attrs) =>
        ({ commands, state }) => {
          if (state.selection.empty) return false;
          const body = String(attrs.body || "").trim();
          if (!body) return false;
          return commands.setMark(this.name, { id: attrs.id || crypto.randomUUID(), body: body.slice(0, 2000) });
        },
      unsetPageNote:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("quireNoteWidgets"),
        props: {
          decorations: (state) => noteWidgets(state.doc),
        },
      }),
    ];
  },
});
