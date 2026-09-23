import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { fetchSense, WordLookupCard } from "@/components/word-lookup";
import { HIGHLIGHTS } from "@/lib/fonts";
import { applyPageBookmark, applyPageNote, BOOKMARK_TONES } from "@/lib/page-marks";
import { copyEditorSelection, pasteEditor } from "@/lib/editor-commands";
import { askQuill } from "@/lib/quill";
import { extractReadText, speakText } from "@/lib/read-back";
import { useNotebookStore } from "@/lib/store";
import type { WordSense } from "@/lib/word-tools";
import { cn } from "@/lib/utils";

type Panel = "main" | "highlight" | "bookmark" | "quill" | "note" | "lookup";

function selectedText(editor: Editor) {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, " ").trim();
}

function clampMenu(x: number, y: number, width: number, height: number) {
  const pad = 8;
  return {
    x: Math.min(Math.max(pad, x), Math.max(pad, window.innerWidth - width - pad)),
    y: Math.min(Math.max(pad, y), Math.max(pad, window.innerHeight - height - pad)),
  };
}

export function EditorContextMenu({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [panel, setPanel] = useState<Panel>("main");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sense, setSense] = useState<WordSense | null>(null);
  const [looking, setLooking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefs = useNotebookStore((s) => s.prefs);
  const addDictionaryWord = useNotebookStore((s) => s.addDictionaryWord);
  const setQuillOpen = useNotebookStore((s) => s.setQuillOpen);

  useEffect(() => {
    const dom = editor.view.dom;
    function onContext(event: MouseEvent) {
      event.preventDefault();
      const coords = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (coords && editor.state.selection.empty) {
        editor.chain().focus().setTextSelection(coords.pos).run();
      }
      setPanel("main");
      setDraft("");
      setSense(null);
      setPos({ x: event.clientX, y: event.clientY });
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPos(null);
    }
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setPos(null);
    }
    dom.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      dom.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [editor]);

  useEffect(() => {
    if (!pos || !menuRef.current) return;
    const box = menuRef.current.getBoundingClientRect();
    const next = clampMenu(pos.x, pos.y, box.width, box.height);
    if (next.x !== pos.x || next.y !== pos.y) setPos(next);
  }, [pos, panel]);

  if (!pos) return null;

  const hasSelection = !editor.state.selection.empty;
  const word = selectedText(editor);

  function keep(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function cut() {
    void copyEditorSelection(editor, true);
    setPos(null);
  }

  function copy() {
    void copyEditorSelection(editor, false);
    setPos(null);
  }

  async function paste() {
    try {
      await pasteEditor(editor);
    } catch {
      toast.error("Could not paste from the clipboard.");
    }
    setPos(null);
  }

  async function lookup() {
    const query = word.split(/\s+/)[0] || "";
    if (!query) {
      toast.error("Select a word first.");
      return;
    }
    setPanel("lookup");
    setLooking(true);
    setSense(await fetchSense(query));
    setLooking(false);
  }

  function narrate() {
    const text = extractReadText(editor);
    if (!text.trim()) {
      toast("Nothing to read yet");
      return;
    }
    if (!speakText(text, { voiceURI: prefs.ttsVoiceURI, rate: prefs.ttsRate })) {
      toast.error("No voice available on this computer");
      return;
    }
    setPos(null);
  }

  async function quill(chip: string) {
    if (!word) {
      toast.error("Select a passage first.");
      return;
    }
    setBusy(true);
    const result = await askQuill(chip, word, prefs.dictionary);
    setBusy(false);
    if (result.replacement) {
      editor.chain().focus().insertContent(result.replacement).run();
      toast(result.reply);
    } else {
      setQuillOpen(true);
      toast(result.reply);
    }
    setPos(null);
  }

  function highlight(color?: string) {
    if (!hasSelection) {
      toast.error("Select a passage first.");
      return;
    }
    if (!color) editor.chain().focus().unsetHighlight().run();
    else editor.chain().focus().toggleHighlight({ color }).run();
    setPos(null);
  }

  function bookmark(id: (typeof BOOKMARK_TONES)[number]["id"]) {
    if (!hasSelection) {
      toast.error("Select a letter, word, or passage first.");
      return;
    }
    applyPageBookmark(editor, id);
    setPos(null);
  }

  function saveNote() {
    if (!applyPageNote(editor, draft)) {
      toast.error("Select a passage and write the note.");
      return;
    }
    setPos(null);
    toast("Note added");
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Page menu"
      className="quire-context-menu"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={keep}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {panel === "main" ? (
        <>
          <MenuBtn disabled={!hasSelection} onClick={cut}>
            Cut
          </MenuBtn>
          <MenuBtn disabled={!hasSelection} onClick={copy}>
            Copy
          </MenuBtn>
          <MenuBtn onClick={() => void paste()}>Paste</MenuBtn>
          <MenuBtn onClick={() => { editor.chain().focus().selectAll().run(); setPos(null); }}>
            Select all
          </MenuBtn>
          <hr />
          <MenuBtn disabled={!word} onClick={() => void lookup()}>
            Look up word
          </MenuBtn>
          <MenuBtn onClick={narrate}>Narrate</MenuBtn>
          <MenuBtn
            disabled={!word}
            onClick={() => {
              const token = word.split(/\s+/)[0] || "";
              if (!token) return;
              addDictionaryWord(token);
              toast(`“${token}” is in your dictionary`);
              setPos(null);
            }}
          >
            Add to dictionary
          </MenuBtn>
          <hr />
          <MenuBtn disabled={!hasSelection} onClick={() => setPanel("highlight")}>
            Highlight…
          </MenuBtn>
          <MenuBtn disabled={!hasSelection} onClick={() => setPanel("bookmark")}>
            Bookmark…
          </MenuBtn>
          <MenuBtn disabled={!hasSelection} onClick={() => setPanel("note")}>
            Add a note…
          </MenuBtn>
          {prefs.quill !== false ? (
            <MenuBtn disabled={!hasSelection || busy} onClick={() => setPanel("quill")}>
              Quill…
            </MenuBtn>
          ) : null}
        </>
      ) : null}

      {panel === "highlight" ? (
        <>
          <MenuBtn onClick={() => setPanel("main")}>Back</MenuBtn>
          <p className="quire-context-label">Highlight</p>
          <div className="flex flex-wrap gap-1.5 px-2 py-1">
            {HIGHLIGHTS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                className={cn("size-7 rounded-md text-xs font-semibold", item.swatch)}
                onMouseDown={keep}
                onClick={() => highlight("color" in item ? item.color : undefined)}
              >
                {item.id === "none" ? "" : "A"}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {panel === "bookmark" ? (
        <>
          <MenuBtn onClick={() => setPanel("main")}>Back</MenuBtn>
          <p className="quire-context-label">Color bookmark</p>
          <div className="flex flex-wrap gap-1.5 px-2 py-1">
            {BOOKMARK_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                className={cn("quire-bookmark-chip", `is-${tone.id}`)}
                onMouseDown={keep}
                onClick={() => bookmark(tone.id)}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {panel === "quill" ? (
        <>
          <MenuBtn onClick={() => setPanel("main")}>Back</MenuBtn>
          <p className="quire-context-label">Quill</p>
          {["Shorter", "Clearer", "Fleshed out", "Polish", "Better word"].map((chip) => (
            <MenuBtn key={chip} disabled={busy} onClick={() => void quill(chip)}>
              {chip}
            </MenuBtn>
          ))}
        </>
      ) : null}

      {panel === "note" ? (
        <>
          <MenuBtn onClick={() => setPanel("main")}>Back</MenuBtn>
          <p className="quire-context-label">Note</p>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="A quiet note on this passage…"
            aria-label="Note"
            rows={4}
            className="mx-2 mb-2 w-[calc(100%-1rem)] resize-none rounded-md border border-rule bg-paper px-2 py-1.5 text-sm text-ink"
          />
          <MenuBtn onClick={saveNote}>Save note</MenuBtn>
        </>
      ) : null}

      {panel === "lookup" ? (
        <>
          <MenuBtn onClick={() => setPanel("main")}>Back</MenuBtn>
          <div className="max-h-64 overflow-y-auto px-1 py-1">
            <WordLookupCard
              sense={sense}
              loading={looking}
              onReplace={(next) => {
                editor.chain().focus().insertContent(next).run();
                setPos(null);
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className="flex min-h-10 w-full items-center rounded-md px-2.5 text-left text-sm text-ink disabled:opacity-40"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
