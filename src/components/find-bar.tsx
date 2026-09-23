import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findHits, registerFindBar } from "@/lib/find";
import { getActiveEditor } from "@/lib/editor-commands";
import { cn } from "@/lib/utils";

export function FindBar() {
  const [open, setOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    return registerFindBar((replace) => {
      setReplaceMode(Boolean(replace));
      setOpen(true);
    });
  }, []);

  function jump(nextIndex: number, hits = currentHits()) {
    const editor = getActiveEditor();
    if (!editor || !hits.length) {
      setCount(0);
      return;
    }
    const wrapped = ((nextIndex % hits.length) + hits.length) % hits.length;
    const hit = hits[wrapped];
    editor.chain().focus().setTextSelection({ from: hit.from, to: hit.to }).run();
    setIndex(wrapped);
    setCount(hits.length);
  }

  function currentHits() {
    const editor = getActiveEditor();
    if (!editor || !query.trim()) return [];
    return findHits(editor.state.doc, query);
  }

  function onSearch(value: string) {
    setQuery(value);
    const editor = getActiveEditor();
    const hits = editor && value.trim() ? findHits(editor.state.doc, value) : [];
    setCount(hits.length);
    if (hits.length) jump(0, hits);
    else setIndex(0);
  }

  function replaceOne() {
    const editor = getActiveEditor();
    const hits = currentHits();
    if (!editor || !hits.length) return;
    const hit = hits[Math.min(index, hits.length - 1)];
    editor.chain().focus().setTextSelection({ from: hit.from, to: hit.to }).insertContent(replacement).run();
    jump(index, findHits(editor.state.doc, query));
  }

  function replaceAll() {
    const editor = getActiveEditor();
    if (!editor || !query.trim()) return;
    const hits = findHits(editor.state.doc, query);
    if (!hits.length) return;
    let chain = editor.chain();
    for (let i = hits.length - 1; i >= 0; i -= 1) {
      const hit = hits[i];
      chain = chain.insertContentAt({ from: hit.from, to: hit.to }, replacement);
    }
    chain.run();
    setCount(0);
    setIndex(0);
  }

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
