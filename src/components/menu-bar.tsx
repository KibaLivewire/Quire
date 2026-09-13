import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildBackup, readBackupFile, saveBackup } from "@/lib/backup";
import { appVersion, checkForUpdates } from "@/lib/desktop";
import { runEditorCommand } from "@/lib/editor-commands";
import {
  exportDoc,
  exportDocx,
  exportHtml,
  exportPdf,
  exportRtf,
  exportText,
} from "@/lib/export-note";
import { openFindBar } from "@/lib/find";
import { importDocument, OPEN_ACCEPT } from "@/lib/import-note";
import { notePages } from "@/lib/pages";
import { openPrintPreview } from "@/lib/print";
import { useNotebookStore } from "@/lib/store";
import { openRecipeChooser } from "@/components/recipe-chooser";
import { stopSharedReading } from "@/components/read-back-chip";
import { stopReading } from "@/lib/read-back";
import { TrashPanel } from "@/components/trash-panel";

function currentPage() {
  const { notes, activeNoteId } = useNotebookStore.getState();
  const note = notes.find((item) => item.id === activeNoteId);
  return {
    title: note?.title || "Untitled",
    html: note ? notePages(note).join("") : "",
    hasNote: Boolean(note),
  };
}

export function MenuBar({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const replaceDesk = useNotebookStore((s) => s.replaceDesk);
  const [trashOpen, setTrashOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const createNote = useNotebookStore((s) => s.createNote);
  const updateNote = useNotebookStore((s) => s.updateNote);
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const setFocusMode = useNotebookStore((s) => s.setFocusMode);
  const focusMode = useNotebookStore((s) => s.focusMode);
  const pageMapOpen = useNotebookStore((s) => s.pageMapOpen);
  const setPageMapOpen = useNotebookStore((s) => s.setPageMapOpen);
  const activeNoteId = useNotebookStore((s) => s.activeNoteId);
  const session = useNotebookStore((s) => s.session);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        fileRef.current?.click();
      }
      if (key === "s") {
        event.preventDefault();
        void onExport("docx");
      }
      if (key === "p") {
        event.preventDefault();
        openPrintPreview();
      }
      if (key === "f") {
        event.preventDefault();
        openFindBar(false);
      }
      if (key === "h") {
        event.preventDefault();
        openFindBar(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function needPage() {
    const page = currentPage();
    if (!page.hasNote) {
      toast.error("Open or start a page first.");
      return null;
    }
    return page;
  }

  async function onOpen(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const next = await importDocument(file);
      const id = createNote();
      updateNote(id, { title: next.title, pages: [next.html], content: next.html });
      toast(`Opened ${file.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open that file.");
    }
  }

  async function onExport(kind: "txt" | "rtf" | "doc" | "docx" | "pdf" | "html") {
    const page = needPage();
    if (!page) return;
    try {
      if (kind === "txt") exportText(page.title, page.html);
      if (kind === "rtf") exportRtf(page.title, page.html);
      if (kind === "doc") exportDoc(page.title, page.html);
      if (kind === "docx") await exportDocx(page.title, page.html);
      if (kind === "pdf") exportPdf(page.title, page.html);
      if (kind === "html") exportHtml(page.title, page.html);
    } catch {
      toast.error("Could not export that file.");
    }
  }

  return (
    <>
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-rule bg-paper-raised px-1.5">
        <input
          ref={fileRef}
          type="file"
          accept={OPEN_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void onOpen(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={restoreRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void readBackupFile(file)
              .then((payload) => {
                if (!window.confirm("Replace everything on this desk with the backup?")) return;
                replaceDesk(payload);
                toast("Desk restored from backup");
              })
              .catch((error) => toast.error(error instanceof Error ? error.message : "Could not restore that backup."));
          }}
        />
        <Menu label="File">
          <DropdownMenuItem onSelect={() => openRecipeChooser({ mode: "create" })}>
            New page <Shortcut>Ctrl+N</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              if (!activeNoteId) {
                toast.error("Open or start a page first.");
                return;
              }
              openRecipeChooser({ mode: "change", noteId: activeNoteId, pageIndex: session.pageIndex || 0 });
            }}
          >
            Change recipe…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            Open… <Shortcut>Ctrl+O</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Export as</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Word processing</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void onExport("docx")}>.DOCX — Word</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("doc")}>.DOC — Word 97–2003</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("rtf")}>.RTF — Rich text</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("txt")}>.TXT — Plain text</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("pdf")}>.PDF — Locked layout</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void onExport("html")}>.HTML — Web page</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => openPrintPreview()}>
            Print preview… <Shortcut>Ctrl+P</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              const state = useNotebookStore.getState();
              void saveBackup(buildBackup(state.notebooks, state.notes, state.prefs)).then(
                () => toast("Backup saved"),
                () => toast.error("Could not save the backup."),
              );
            }}
          >
            Backup desk…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => restoreRef.current?.click()}>Restore desk…</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTrashOpen(true)}>Trash…</DropdownMenuItem>
        </Menu>
        <Menu label="Edit">
          <DropdownMenuItem onSelect={() => runEditorCommand("undo")}>
            Undo <Shortcut>Ctrl+Z</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runEditorCommand("redo")}>
            Redo <Shortcut>Ctrl+Y</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => runEditorCommand("cut")}>Cut</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runEditorCommand("copy")}>Copy</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void runEditorCommand("paste")}>Paste</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runEditorCommand("selectAll")}>
            Select all <Shortcut>Ctrl+A</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openFindBar(false)}>
            Find on this page… <Shortcut>Ctrl+F</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openFindBar(true)}>
            Replace… <Shortcut>Ctrl+H</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => runEditorCommand("bold")}>Bold</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runEditorCommand("italic")}>Italic</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runEditorCommand("underline")}>Underline</DropdownMenuItem>
        </Menu>
        <Menu label="View">
          <DropdownMenuCheckboxItem
            checked={prefs.showRuler !== false}
            onCheckedChange={(checked) => setPrefs({ showRuler: checked })}
          >
            Ruler
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={setFocusMode}>
            Focus
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={Boolean(prefs.inkOnly)}
            onCheckedChange={(checked) => setPrefs({ inkOnly: checked })}
          >
            Ink only
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={pageMapOpen}
            onCheckedChange={setPageMapOpen}
          >
            Page map
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem
            onSelect={() => {
              window.dispatchEvent(new CustomEvent("quire-read-back-request"));
            }}
          >
            Read back
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              stopReading();
              stopSharedReading();
              window.dispatchEvent(new CustomEvent("quire-read-back-stop"));
            }}
          >
            Stop reading
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={prefs.typewriter !== false}
            onCheckedChange={(checked) => setPrefs({ typewriter: checked })}
          >
            Typewriter scroll
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={prefs.bootLeaves !== false}
            onCheckedChange={(checked) => setPrefs({ bootLeaves: checked })}
          >
            Opening scene
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={prefs.ambient !== false}
            onCheckedChange={(checked) => setPrefs({ ambient: checked })}
          >
            Room sound
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={prefs.quill !== false}
            onCheckedChange={(checked) => setPrefs({ quill: checked })}
          >
            Quill
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPrefs({ zoom: Math.min(1.6, Math.round((prefs.zoom + 0.1) * 10) / 10) })}>
            Zoom in
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPrefs({ zoom: Math.max(0.7, Math.round((prefs.zoom - 0.1) * 10) / 10) })}>
            Zoom out
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPrefs({ zoom: 1 })}>Reset zoom</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onOpenSettings?.()}>Desk settings…</DropdownMenuItem>
        </Menu>
        <Menu label="Help">
          <DropdownMenuItem onSelect={() => setAboutOpen(true)}>About Quire</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void checkForUpdates().then((info) => {
                if (info.error) toast.error(info.error);
                else if (info.latest && info.latest !== info.current) toast(`Quire ${info.latest} is available.`);
                else toast(`Quire ${info.current} is up to date.`);
              });
            }}
          >
            Check for updates
          </DropdownMenuItem>
        </Menu>
      </div>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quire {appVersion()}</DialogTitle>
            <DialogDescription>
              A notebook for pages you keep on this device. Room sound follows your theme. Leather chimes: Epidemic Sound. Ocean, night, and café beds are CC0 (BigSoundBank).
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm text-ink-muted">
            <li>Ctrl+N new page · Ctrl+O open · Ctrl+F find · Ctrl+P print</li>
            <li>Ctrl+Z undo · Esc leaves Focus</li>
            <li>File → Backup desk keeps every notebook on this computer</li>
          </ul>
        </DialogContent>
      </Dialog>
      <TrashPanel open={trashOpen} onOpenChange={setTrashOpen} />
    </>
  );
}

function Menu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-sm text-ink">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Shortcut({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto pl-6 text-[11px] text-ink-subtle">{children}</span>;
}
