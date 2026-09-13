import { useEffect, useRef, useState } from "react";
import { Feather, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActiveEditor } from "@/lib/editor-commands";
import { askQuill, greetingForNow, type QuillMessage } from "@/lib/quill";
import { useNotebookStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function selectionText() {
  const editor = getActiveEditor();
  if (!editor) return "";
  const { from, to } = editor.state.selection;
  if (from === to) return "";
  return editor.state.doc.textBetween(from, to, " ");
}

export function QuillPanel() {
  const open = useNotebookStore((s) => s.quillOpen);
  const setOpen = useNotebookStore((s) => s.setQuillOpen);
  const prefs = useNotebookStore((s) => s.prefs);
  const [messages, setMessages] = useState<QuillMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const greeted = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefs.quill) return;
    function greet() {
      if (greeted.current) return;
      greeted.current = true;
      setMessages([{ id: "greet", from: "quill", text: greetingForNow() }]);
      setOpen(true);
    }
    window.addEventListener("quire-desk-ready", greet);
    return () => window.removeEventListener("quire-desk-ready", greet);
  }, [prefs.quill, setOpen]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!prefs.quill) return null;

  async function send(text: string) {
    const ask = text.trim();
    if (!ask || busy) return;
    setDraft("");
    const you: QuillMessage = { id: crypto.randomUUID(), from: "you", text: ask };
    setMessages((list) => [...list, you]);
    setBusy(true);
    const result = await askQuill(ask, selectionText());
    setMessages((list) => [
      ...list,
      { id: crypto.randomUUID(), from: "quill", text: result.reply, replacement: result.replacement },
    ]);
    setBusy(false);
  }

  function insert(text: string) {
    const editor = getActiveEditor();
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) editor.chain().focus().insertContent(text).run();
    else editor.chain().focus().insertContent(text).run();
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[min(20rem,100%)] shrink-0 flex-col border-l border-rule bg-paper-raised",
        !open && "hidden",
      )}
    >
      <header className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <img src="/quill.jpg" alt="" className="quill-face" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm text-ink">Quill</p>
          <p className="text-[11px] text-ink-subtle">A writing aide at this desk</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Hide
        </Button>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((item) => (
          <div key={item.id} className={cn("max-w-[95%] rounded-xl px-3 py-2 text-sm", item.from === "quill" ? "bg-paper text-ink" : "ml-auto bg-forest text-forest-fg")}>
            {item.from === "quill" ? (
              <span className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-subtle">
                <Feather className="size-3" />
                Quill
              </span>
            ) : null}
            <p className="text-pretty">{item.text}</p>
            {item.replacement ? (
              <div className="mt-2 rounded-lg bg-paper-inset px-2 py-1.5 text-xs text-ink">
                <p className="text-pretty">{item.replacement}</p>
                <Button size="sm" className="mt-1 h-7 px-2" onClick={() => insert(item.replacement || "")}>
                  Insert on page
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-t border-rule px-3 py-2">
        {["Shorter", "Clearer", "Polish", "Better word"].map((chip) => (
          <button
            key={chip}
            type="button"
            className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-muted hover:text-ink"
            onClick={() => void send(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
      <form
        className="flex gap-1 border-t border-rule p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask Quill…"
          aria-label="Ask Quill"
          className="h-9"
        />
        <Button type="submit" size="icon-sm" aria-label="Send" disabled={busy}>
          <Send className="size-4" />
        </Button>
      </form>
    </aside>
  );
}
