import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { collectHeadings } from "@/lib/page-map";
import { pageMetaAt } from "@/lib/recipes";
import { useNotebookStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

function defaultLabel(editor: Editor, pos: number): string {
  const headings = collectHeadings(editor);
  let nearest = "";
  for (const item of headings) {
    if (item.pos <= pos) nearest = item.text;
  }
  if (nearest) return nearest.slice(0, 48);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `Bookmark ${hh}:${mm}`;
}

export function RibbonBookmarksControl({
  editor,
  note,
  pageIndex,
}: {
  editor: Editor;
  note: Note;
  pageIndex: number;
}) {
  const placeRibbon = useNotebookStore((s) => s.placeRibbon);
  const untieRibbon = useNotebookStore((s) => s.untieRibbon);
  const renameRibbon = useNotebookStore((s) => s.renameRibbon);
  const [open, setOpen] = useState(false);
  const meta = pageMetaAt(note, pageIndex);
  const ribbons = meta.ribbons ?? [];

  function place() {
    const pos = editor.state.selection.from;
    const max = editor.state.doc.content.size;
    if (ribbons.length >= 20) {
      toast("This page already holds twenty ribbons.");
      return;
    }
    const snippet = editor.state.doc.textBetween(Math.max(0, pos - 16), Math.min(max, pos + 16), " ").slice(0, 32);
    const id = placeRibbon(note.id, pageIndex, {
      pos,
      label: defaultLabel(editor, pos),
      snippet,
    });
    if (!id) toast("This page already holds twenty ribbons.");
    else toast("Ribbon placed");
  }

  function jump(pos: number, id: string) {
    const max = editor.state.doc.content.size;
    if (pos < 0 || pos > max) {
      toast("That ribbon slipped — place a new one?");
      untieRibbon(note.id, pageIndex, id);
      return;
    }
    editor.chain().focus().setTextSelection(Math.min(Math.max(1, pos), Math.max(1, max))).scrollIntoView().run();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Ribbon bookmark"
              className="text-ink-muted"
              onMouseDown={(event) => event.preventDefault()}
            >
              <Bookmark className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Ribbon bookmark</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72" align="end">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-display text-sm text-ink">Ribbons</p>
          <Button type="button" size="sm" className="h-7" onClick={place}>
            Place ribbon
          </Button>
        </div>
        {ribbons.length === 0 ? (
          <p className="text-sm text-ink-muted">No ribbons on this page</p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {ribbons.map((ribbon) => (
              <li key={ribbon.id} className="rounded-lg bg-paper px-2 py-1.5">
                <Input
                  value={ribbon.label}
                  aria-label="Name this ribbon"
                  placeholder="Name this ribbon"
                  className="mb-1 h-8"
                  onChange={(event) => renameRibbon(note.id, pageIndex, ribbon.id, event.target.value)}
                />
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" className="h-7 flex-1" onClick={() => jump(ribbon.pos, ribbon.id)}>
                    Jump
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => {
                      untieRibbon(note.id, pageIndex, ribbon.id);
                      toast("Ribbon untied");
                    }}
                  >
                    Untie ribbon
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function RibbonMarginMarks({
  editor,
  note,
  pageIndex,
  sheetHeight,
}: {
  editor: Editor | null;
  note: Note;
  pageIndex: number;
  sheetHeight?: number;
}) {
  const untieRibbon = useNotebookStore((s) => s.untieRibbon);
  const inkOnly = useNotebookStore((s) => s.prefs.inkOnly);
  const ribbons = pageMetaAt(note, pageIndex).ribbons ?? [];

  const marks = useMemo(() => {
    if (!editor || !sheetHeight) return [];
    const max = Math.max(1, editor.state.doc.content.size);
    return ribbons.map((ribbon) => {
      let topPct = 8;
      try {
        if (ribbon.pos >= 0 && ribbon.pos <= max) {
          const coords = editor.view.coordsAtPos(Math.min(ribbon.pos, max));
          const root = editor.view.dom.getBoundingClientRect();
          topPct = Math.min(92, Math.max(4, ((coords.top - root.top) / Math.max(1, root.height)) * 100));
        }
      } catch {
        topPct = 8;
      }
      return { ...ribbon, topPct };
    });
  }, [editor, ribbons, sheetHeight, note.updatedAt, pageIndex]);

  if (!marks.length) return null;

  return (
    <div className={cn("ribbon-margin", inkOnly && "is-ink")} aria-hidden={false}>
      {marks.map((mark) => (
        <button
          key={mark.id}
          type="button"
          title={mark.label}
          className="ribbon-tick"
          style={{ top: `${mark.topPct}%` }}
          onClick={() => {
            if (!editor) return;
            const max = editor.state.doc.content.size;
            if (mark.pos < 0 || mark.pos > max) {
              toast("That ribbon slipped — place a new one?");
              untieRibbon(note.id, pageIndex, mark.id);
              return;
            }
            editor.chain().focus().setTextSelection(Math.min(Math.max(1, mark.pos), Math.max(1, max))).scrollIntoView().run();
          }}
        />
      ))}
    </div>
  );
}
