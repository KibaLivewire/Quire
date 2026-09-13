import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DRAFT_IDLE_MS,
  DRAFT_PERIODIC_MS,
  isDraftHtmlTooLarge,
  relativeDraftTime,
  shouldSkipDraft,
  shouldToastHugeDraft,
} from "@/lib/earlier-drafts";
import { notePages } from "@/lib/pages";
import { pageMetaAt } from "@/lib/recipes";
import { useNotebookStore } from "@/lib/store";
import type { Note, PageDraft } from "@/lib/types";
import { cn } from "@/lib/utils";

function sourceHint(source: PageDraft["source"]): string | null {
  if (source === "manual") return "Kept";
  if (source === "pre-restore") return "Before restore";
  return null;
}

export function useEarlierDraftAutosave(editor: Editor | null, note: Note | null, pageIndex: number) {
  const keepPageDraft = useNotebookStore((s) => s.keepPageDraft);

  useEffect(() => {
    if (!editor || !note) return;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let periodicTimer: ReturnType<typeof setInterval> | undefined;
    let dirty = false;
    let latestHtml = editor.getHTML();

    const clearIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = undefined;
    };

    const snapshot = () => {
      if (!dirty) return;
      const html = latestHtml;
      if (shouldSkipDraft(html)) return;
      if (isDraftHtmlTooLarge(html)) {
        if (shouldToastHugeDraft(note.id, pageIndex)) {
          toast("This page is too large to auto-keep as a draft.");
        }
        return;
      }
      const created = keepPageDraft(note.id, pageIndex, html, "auto");
      if (created) dirty = false;
    };

    const onUpdate = () => {
      latestHtml = editor.getHTML();
      dirty = true;
      clearIdle();
      idleTimer = setTimeout(snapshot, DRAFT_IDLE_MS);
    };

    editor.on("update", onUpdate);
    periodicTimer = setInterval(snapshot, DRAFT_PERIODIC_MS);

    return () => {
      editor.off("update", onUpdate);
      clearIdle();
      if (periodicTimer) clearInterval(periodicTimer);
    };
  }, [editor, note?.id, pageIndex, keepPageDraft]);
}

export function EarlierDraftsPanel({
  editor,
  note,
  pageIndex,
}: {
  editor: Editor | null;
  note: Note | null;
  pageIndex: number;
}) {
  const open = useNotebookStore((s) => s.draftsOpen);
  const setDraftsOpen = useNotebookStore((s) => s.setDraftsOpen);
  const inkOnly = useNotebookStore((s) => s.prefs.inkOnly);
  const keepPageDraft = useNotebookStore((s) => s.keepPageDraft);
  const restorePageDraft = useNotebookStore((s) => s.restorePageDraft);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const drafts = useMemo(() => {
    if (!note) return [] as PageDraft[];
    return pageMetaAt(note, pageIndex).drafts ?? [];
  }, [note, pageIndex, note?.updatedAt, note?.pageMeta]);

  useEffect(() => {
    if (!open) return;
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, [open]);

  useEffect(() => {
    setPeekId(null);
    setRestoreId(null);
  }, [note?.id, pageIndex]);

  if (!open) return null;

  const peekDraft = peekId ? drafts.find((item) => item.id === peekId) ?? null : null;

  function currentHtml() {
    if (editor) return editor.getHTML();
    if (!note) return "";
    return notePages(note)[pageIndex] ?? "";
  }

  function keepDraft() {
    if (!note) {
      toast.error("Open or start a page first.");
      return;
    }
    const html = currentHtml();
    if (shouldSkipDraft(html)) {
      toast("Nothing to keep on an empty page.");
      return;
    }
    const created = keepPageDraft(note.id, pageIndex, html, "manual");
    if (created) toast("Draft kept");
    else toast("That draft is already kept.");
  }

  function confirmRestore() {
    if (!note || !restoreId) return;
    const html = currentHtml();
    const target = drafts.find((item) => item.id === restoreId);
    if (!target) {
      setRestoreId(null);
      return;
    }
    const ok = restorePageDraft(note.id, pageIndex, restoreId, html);
    if (ok) {
      editor?.commands.setContent(target.html, { emitUpdate: false });
      toast("Draft restored");
    }
    setRestoreId(null);
    setPeekId(null);
  }

  return (
    <>
      <aside className={cn("earlier-drafts-panel", inkOnly && "is-ink")} aria-label="Earlier drafts">
        <header className="flex items-center justify-between gap-2 border-b border-rule/70 px-3 py-2">
          <p className="font-display text-sm text-ink">Earlier drafts</p>
          <button
            type="button"
            className="text-xs text-ink-subtle hover:text-ink"
            onClick={() => setDraftsOpen(false)}
          >
            Close
          </button>
        </header>
        <div className="flex items-center gap-2 border-b border-rule/50 px-3 py-2">
          <Button type="button" size="sm" className="h-7 flex-1" onClick={keepDraft} disabled={!note}>
            Keep this draft
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
          {drafts.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-muted">No earlier drafts yet</p>
          ) : (
            <ul className="space-y-0.5">
              {drafts.map((draft) => {
                const hint = sourceHint(draft.source);
                const active = peekId === draft.id;
                return (
                  <li key={draft.id}>
                    <div className={cn("earlier-drafts-row", active && "is-active")}>
                      <button
                        type="button"
                        className="earlier-drafts-row-main"
                        onClick={() => setPeekId(active ? null : draft.id)}
                      >
                        <span className="earlier-drafts-time">
                          {relativeDraftTime(draft.createdAt, now)}
                          {hint ? ` · ${hint}` : ""}
                        </span>
                        <span className="earlier-drafts-sniff">{draft.sniff || "Untitled draft"}</span>
                      </button>
                      <div className="earlier-drafts-actions">
                        <button type="button" onClick={() => setPeekId(draft.id)}>
                          Peek
                        </button>
                        <button type="button" onClick={() => setRestoreId(draft.id)}>
                          Restore this draft
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {peekDraft ? (
        <div className="earlier-drafts-peek" role="dialog" aria-label="Peek at draft">
          <button
            type="button"
            className="earlier-drafts-peek-scrim"
            aria-label="Close peek"
            onClick={() => setPeekId(null)}
          />
          <div className="earlier-drafts-peek-sheet">
            <header className="flex items-center justify-between gap-2 border-b border-rule/70 px-4 py-2">
              <div>
                <p className="font-display text-sm text-ink">Peek</p>
                <p className="text-xs text-ink-muted">{relativeDraftTime(peekDraft.createdAt, now)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" className="h-7" onClick={() => setRestoreId(peekDraft.id)}>
                  Restore this draft
                </Button>
                <button
                  type="button"
                  className="text-xs text-ink-subtle hover:text-ink"
                  onClick={() => setPeekId(null)}
                >
                  Close
                </button>
              </div>
            </header>
            <div
              className="earlier-drafts-peek-body quire-doc tiptap"
              dangerouslySetInnerHTML={{ __html: peekDraft.html }}
            />
          </div>
        </div>
      ) : null}

      <AlertDialog open={Boolean(restoreId)} onOpenChange={(next) => !next && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this draft</AlertDialogTitle>
            <AlertDialogDescription>
              Replace what’s on the page? Your current words are kept as a new draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore this draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
