import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  extractReadText,
  listLocalVoices,
  pauseReading,
  resumeReading,
  speakText,
  stopReading,
  type ReadBackState,
} from "@/lib/read-back";
import { useNotebookStore } from "@/lib/store";
import { cn } from "@/lib/utils";

let sharedStop: (() => void) | null = null;

export function stopSharedReading() {
  sharedStop?.();
  stopReading();
}

export function ReadBackControls({ editor }: { editor: Editor | null }) {
  const prefs = useNotebookStore((s) => s.prefs);
  const [state, setState] = useState<ReadBackState>("idle");
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const bump = () => setVoicesReady(true);
    bump();
    window.speechSynthesis.addEventListener("voiceschanged", bump);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", bump);
  }, []);

  const start = useCallback(() => {
    if (!editor) {
      toast.error("Open a page first.");
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("No voice available on this computer");
      return;
    }
    const voices = listLocalVoices();
    if (voicesReady && !voices.length) {
      toast.error("No voice available on this computer");
      return;
    }
    const text = extractReadText(editor);
    if (!text.trim()) {
      toast("Nothing to read yet");
      return;
    }
    const uttered = speakText(text, {
      voiceURI: prefs.ttsVoiceURI,
      rate: prefs.ttsRate,
      onEnd: () => setState("idle"),
      onError: () => setState("idle"),
    });
    if (!uttered) {
      toast("Nothing to read yet");
      return;
    }
    setState("reading");
  }, [editor, prefs.ttsRate, prefs.ttsVoiceURI, voicesReady]);

  useEffect(() => {
    sharedStop = () => setState("idle");
    return () => {
      stopReading();
      sharedStop = null;
    };
  }, []);

  useEffect(() => {
    function onRequest() {
      start();
    }
    function onStopEvent() {
      stopReading();
      setState("idle");
    }
    window.addEventListener("quire-read-back-request", onRequest);
    window.addEventListener("quire-read-back-stop", onStopEvent);
    return () => {
      window.removeEventListener("quire-read-back-request", onRequest);
      window.removeEventListener("quire-read-back-stop", onStopEvent);
    };
  }, [start]);

  function onPause() {
    pauseReading();
    setState("paused");
  }

  function onResume() {
    resumeReading();
    setState("reading");
  }

  function onStop() {
    stopReading();
    setState("idle");
  }

  return (
    <div className="flex items-center gap-1">
      {state === "idle" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Read back"
          title="Read back"
          className="text-ink-muted"
          onMouseDown={(event) => event.preventDefault()}
          onClick={start}
        >
          <Volume2 className="size-4" />
        </Button>
      ) : null}
      {state !== "idle" ? (
        <div className={cn("read-back-chip")}>
          <span className="text-xs text-ink-muted">Reading…</span>
          {state === "reading" ? (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onPause}>
              <Pause className="size-3.5" />
              Pause
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-forest" onClick={onResume}>
              <Play className="size-3.5" />
              Resume
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onStop}>
            <Square className="size-3.5" />
            Stop reading
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function useStopReadingOnPageChange(noteId: string | null, pageIndex: number) {
  useEffect(() => {
    stopSharedReading();
  }, [noteId, pageIndex]);
}
