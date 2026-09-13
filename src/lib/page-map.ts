import type { Editor } from "@tiptap/react";

export type PageHeading = {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
};

export function collectHeadings(editor: Editor | null | undefined): PageHeading[] {
  if (!editor) return [];
  const headings: PageHeading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const level = node.attrs.level as number;
    if (level < 1 || level > 3) return;
    const text = node.textContent.trim() || "Untitled heading";
    headings.push({ level: level as 1 | 2 | 3, text, pos });
  });
  return headings;
}

export function jumpToHeading(editor: Editor, pos: number) {
  const max = editor.state.doc.content.size;
  const next = Math.min(Math.max(1, pos + 1), Math.max(1, max));
  editor.chain().focus().setTextSelection(next).scrollIntoView().run();
}
