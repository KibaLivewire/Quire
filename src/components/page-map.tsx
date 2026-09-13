import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { collectHeadings, jumpToHeading, type PageHeading } from "@/lib/page-map";
import { useNotebookStore } from "@/lib/store";
import { cn, debounce } from "@/lib/utils";

export function PageMapPanel({ editor }: { editor: Editor | null }) {
  const open = useNotebookStore((s) => s.pageMapOpen);
  const setPageMapOpen = useNotebookStore((s) => s.setPageMapOpen);
  const inkOnly = useNotebookStore((s) => s.prefs.inkOnly);
  const [headings, setHeadings] = useState<PageHeading[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) {
      setHeadings([]);
      return;
    }
    const refresh = debounce(() => {
      setHeadings(collectHeadings(editor));
      const caret = editor.state.selection.from;
      const list = collectHeadings(editor);
      let current: number | null = null;
      for (const item of list) {
        if (item.pos <= caret) current = item.pos;
      }
      setActivePos(current);
    }, 180);
    refresh();
    editor.on("update", refresh);
    editor.on("selectionUpdate", refresh);
    return () => {
      refresh.cancel();
      editor.off("update", refresh);
      editor.off("selectionUpdate", refresh);
    };
  }, [editor]);

  if (!open) return null;

  return (
    <aside
      className={cn("page-map-panel", inkOnly && "is-ink")}
      aria-label="Page map"
    >
      <header className="flex items-center justify-between gap-2 border-b border-rule/70 px-3 py-2">
        <p className="font-display text-sm text-ink">On this page</p>
        <button
          type="button"
          className="text-xs text-ink-subtle hover:text-ink"
          onClick={() => setPageMapOpen(false)}
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {headings.length === 0 ? (
          <p className="px-3 py-2 text-sm text-ink-muted">No headings yet — try a Heading 1–3</p>
        ) : (
          <ul className="space-y-0.5">
            {headings.map((item) => (
              <li key={`${item.pos}-${item.level}`}>
                <button
                  type="button"
                  title={item.text}
                  className={cn(
                    "page-map-row",
                    `is-h${item.level}`,
                    activePos === item.pos && "is-active",
                  )}
                  onClick={() => {
                    if (!editor) return;
                    jumpToHeading(editor, item.pos);
                  }}
                >
                  <span className="truncate">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
