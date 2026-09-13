export type ReadBackState = "idle" | "reading" | "paused";

export function clampTtsRate(rate: number | undefined): number {
  const value = typeof rate === "number" && Number.isFinite(rate) ? rate : 1;
  return Math.min(1.2, Math.max(0.8, value));
}

export function listLocalVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.localService || !voice.voiceURI.startsWith("http"));
}

export function pickVoice(uri: string | undefined): SpeechSynthesisVoice | null {
  const voices = listLocalVoices();
  if (!voices.length) return null;
  if (uri) {
    const match = voices.find((voice) => voice.voiceURI === uri);
    if (match) return match;
  }
  return voices.find((voice) => voice.default) ?? voices[0] ?? null;
}

export function speakText(
  text: string,
  opts: {
    voiceURI?: string;
    rate?: number;
    onBoundary?: (charIndex: number, charLength: number) => void;
    onEnd?: () => void;
    onError?: () => void;
  },
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  const voice = pickVoice(opts.voiceURI);
  if (voice) utterance.voice = voice;
  utterance.rate = clampTtsRate(opts.rate);
  utterance.onboundary = (event) => {
    if (event.name === "word" || event.name === "sentence" || event.charLength) {
      opts.onBoundary?.(event.charIndex, event.charLength || 0);
    }
  };
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onError?.();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function pauseReading() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.pause();
}

export function resumeReading() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.resume();
}

export function stopReading() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function extractReadText(editor: {
  state: {
    selection: { from: number; to: number; empty: boolean };
    doc: { textBetween: (from: number, to: number, blockSep?: string) => string; content: { size: number } };
  };
}): string {
  const { from, to, empty } = editor.state.selection;
  if (!empty && to > from) {
    return editor.state.doc.textBetween(from, to, "\n");
  }
  const end = editor.state.doc.content.size;
  return editor.state.doc.textBetween(from, end, "\n");
}
