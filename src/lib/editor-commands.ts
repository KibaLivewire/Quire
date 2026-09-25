import type { Editor } from "@tiptap/react";
import { DOMSerializer } from "@tiptap/pm/model";
import { sanitizeHtml } from "./sanitize-html";

export type EditorCommand =
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "selectAll"
  | "bold"
  | "italic"
  | "underline";

type Handler = (command: EditorCommand) => boolean;

const handlers = new Set<Handler>();
const editorListeners = new Set<() => void>();
let activeEditor: Editor | null = null;

export function setActiveEditor(editor: Editor | null) {
  activeEditor = editor;
  if (!editor) return;
  for (const fn of editorListeners) fn();
}

export function onActiveEditor(fn: () => void) {
  editorListeners.add(fn);
  return () => {
    editorListeners.delete(fn);
  };
}

export function getActiveEditor() {
  return activeEditor;
}

export function registerEditorCommands(handler: Handler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function runEditorCommand(command: EditorCommand) {
  for (const handler of [...handlers].reverse()) {
    if (handler(command)) return true;
  }
  return false;
}

export async function copyEditorSelection(editor: Editor, cut = false) {
  const { from, to, empty } = editor.state.selection;
  if (empty) return false;
  const slice = editor.state.selection.content();
  const div = document.createElement("div");
  div.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content));
  const html = div.innerHTML;
  const text = editor.state.doc.textBetween(from, to, "\n\n");
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    await navigator.clipboard.writeText(text);
  }
  if (cut) editor.chain().focus().deleteSelection().run();
  return true;
}

export async function pasteEditor(editor: Editor) {
  try {
    if (navigator.clipboard?.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (!item.types.includes("text/html")) continue;
        const html = sanitizeHtml(await (await item.getType("text/html")).text());
        if (html.trim()) {
          editor.chain().focus().insertContent(html).run();
          return;
        }
      }
    }
  } catch {
    /* fall through to plain text */
  }
  const text = await navigator.clipboard.readText();
  if (text) editor.chain().focus().insertContent(text).run();
}
