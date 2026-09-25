import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { countHtmlHits, findHits, registerFindBar, replaceHtmlHits, requestPageJump } from "@/lib/find";
import { getActiveEditor, onActiveEditor } from "@/lib/editor-commands";
import { notePages } from "@/lib/pages";
import { useNotebookStore } from "@/lib/store";
import { cn, escapeHtml } from "@/lib/utils";

type SheetHit = { page: number; nth: number; from?: number; to?: number };

export function FindBar({ noteId, pageIndex }: { noteId: string; pageIndex: number }) {
  const [open, setOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const pageRef = useRef(pageIndex);
  const noteRef = useRef(noteId);
  const queryRef = useRef(query);
  const replacementRef = useRef(replacement);
  const pending = useRef<{ page: number; nth: number; replace: boolean } | null>(null);
  pageRef.current = pageIndex;
  noteRef.current = noteId;
  queryRef.current = query;
  replacementRef.current = replacement;

  function collectHits(): SheetHit[] {
    const needle = queryRef.current.trim();
    if (!needle) return [];
    const note = useNotebookStore.getState().notes.find((item) => item.id === noteRef.current);
    if (!note) return [];
    const pages = notePages(note);
    const current = pageRef.current;
    const editor = getActiveEditor();
    const hits: SheetHit[] = [];
    pages.forEach((html, page) => {
      if (page === current && editor) {
        findHits(editor.state.doc, needle).forEach((hit, nth) => {
          hits.push({ page, nth, from: hit.from, to: hit.to });
        });
        return;
      }
      const found = countHtmlHits(html, needle);
      for (let nth = 0; nth < found; nth += 1) hits.push({ page, nth });
    });
    return hits;
  }

  function selectHit(hit: SheetHit) {
    const editor = getActiveEditor();
    if (!editor || hit.from == null || hit.to == null) return;
    editor.chain().focus().setTextSelection({ from: hit.from, to: hit.to }).run();
  }

  function finishPending() {
    const job = pending.current;
    if (!job || pageRef.current !== job.page) return;
    const editor = getActiveEditor();
    if (!editor) return;
    const hits = findHits(editor.state.doc, queryRef.current);
    const hit = hits[job.nth];
    pending.current = null;
    if (!hit) return;
    if (job.replace) {
      editor.chain().focus().insertContentAt({ from: hit.from, to: hit.to }, escapeHtml(replacementRef.current)).run();
      const again = collectHits();
      setCount(again.length);
      setIndex(again.length ? Math.min(job.nth, again.length - 1) : 0);
      return;
    }
    editor.chain().focus().setTextSelection({ from: hit.from, to: hit.to }).run();
  }

  function jump(nextIndex: number, hits = collectHits()) {
    if (!hits.length) {
      setCount(0);
      setIndex(0);
      return;
    }
    const wrapped = ((nextIndex % hits.length) + hits.length) % hits.length;
    const hit = hits[wrapped];
    setIndex(wrapped);
    setCount(hits.length);
    if (hit.page !== pageRef.current || hit.from == null) {
      pending.current = { page: hit.page, nth: hit.nth, replace: false };
      if (hit.page !== pageRef.current) requestPageJump(hit.page);
      else selectHit(hit);
      return;
    }
    pending.current = null;
    selectHit(hit);
  }

  function onSearch(value: string) {
    setQuery(value);
    queryRef.current = value;
    const hits = value.trim() ? collectHits() : [];
    setCount(hits.length);
    if (hits.length) jump(0, hits);
    else setIndex(0);
  }

  function replaceOne() {
    const hits = collectHits();
    if (!hits.length) return;
    const wrapped = Math.min(index, hits.length - 1);
    const hit = hits[wrapped];
    const editor = getActiveEditor();
    if (hit.page === pageRef.current && editor && hit.from != null && hit.to != null) {
      editor.chain().focus().insertContentAt({ from: hit.from, to: hit.to }, escapeHtml(replacement)).run();
      const again = collectHits();
      setCount(again.length);
      if (again.length) jump(Math.min(wrapped, again.length - 1), again);
      else setIndex(0);
      return;
    }
    pending.current = { page: hit.page, nth: hit.nth, replace: true };
    if (hit.page !== pageRef.current) requestPageJump(hit.page);
  }

  function replaceAll() {
    const needle = queryRef.current.trim();
    if (!needle) return;
    const editor = getActiveEditor();
    const note = useNotebookStore.getState().notes.find((item) => item.id === noteRef.current);
    if (!editor || !note) return;
    const pages = notePages(note);
    const current = pageRef.current;
    const nextText = replacementRef.current;
    const next = pages.map((html, i) => (i === current ? html : replaceHtmlHits(html, needle, nextText)));
    const liveHits = findHits(editor.state.doc, needle);
    if (liveHits.length) {
      const safe = escapeHtml(nextText);
      let chain = editor.chain();
      for (let i = liveHits.length - 1; i >= 0; i -= 1) {
        const hit = liveHits[i];
        chain = chain.insertContentAt({ from: hit.from, to: hit.to }, safe);
      }
      chain.run();
    }
    const changed = next.some((html, i) => i !== current && html !== pages[i]);
    if (changed) {
      const merged = next.slice();
      merged[current] = editor.getHTML();
      useNotebookStore.getState().setNotePages(note.id, merged);
    }
    setCount(0);
    setIndex(0);
  }

  useEffect(() => {
    return registerFindBar((replace) => {
      setReplaceMode(Boolean(replace));
      setOpen(true);
    });
  }, []);

  useEffect(() => onActiveEditor(() => finishPending()), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (meta && event.key.toLowerCase() === "g") {
        event.preventDefault();
        jump(event.shiftKey ? index - 1 : index + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, query]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute top-2 right-3 z-40 w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-rule bg-paper-raised p-2 shadow-[var(--shadow-lift)]">
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={query}
          placeholder="Find on this page"
          aria-label="Find on this page"
          className="h-8"
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              jump(event.shiftKey ? index - 1 : index + 1);
            }
          }}
        />
        <span className="w-12 shrink-0 text-center text-[11px] text-ink-subtle tabular-nums">
          {count ? `${index + 1}/${count}` : "0"}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={() => jump(index - 1)}>
          <ChevronUp className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={() => jump(index + 1)}>
          <ChevronDown className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Close find" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>
      {replaceMode ? (
        <div className="mt-1.5 flex items-center gap-1">
          <Input
            value={replacement}
            placeholder="Replace with"
            aria-label="Replace with"
            className="h-8"
            onChange={(event) => setReplacement(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                replaceOne();
              }
            }}
          />
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={replaceOne}>
            Replace
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={replaceAll}>
            All
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className={cn("mt-1 px-1 text-[11px] text-ink-subtle hover:text-ink")}
          onClick={() => setReplaceMode(true)}
        >
          Replace…
        </button>
      )}
    </div>
  );
}
