const SRC = "/windchimes.mp3";

type Listener = (state: AmbientState) => void;

export type AmbientState = {
  playing: boolean;
  muted: boolean;
  volume: number;
  energy: number;
  blocked: boolean;
};

const listeners = new Set<Listener>();
let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let freq: Uint8Array<ArrayBuffer> | null = null;
let raf = 0;
let energy = 0;
let blocked = false;

function emit() {
  const state = snapshot();
  listeners.forEach((fn) => fn(state));
}

export function snapshot(): AmbientState {
  return {
    playing: Boolean(audio && !audio.paused),
    muted: Boolean(audio?.muted),
    volume: audio?.volume ?? 0.22,
    energy,
    blocked,
  };
}

export function subscribeAmbient(fn: Listener) {
  listeners.add(fn);
  fn(snapshot());
  return () => {
    listeners.delete(fn);
  };
}

function ensure() {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.22;
  return audio;
}

function hookAnalyser() {
  if (!audio || analyser) return;
  const AC = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = ctx ?? new AC();
  const source = ctx.createMediaElementSource(audio);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  source.connect(analyser);
  analyser.connect(ctx.destination);
  const tick = () => {
    if (analyser && freq) {
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      for (let i = 2; i < 24; i += 1) sum += freq[i];
      energy = sum / (22 * 255);
      emit();
    }
    raf = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

export async function startAmbient(volume: number) {
  const el = ensure();
  el.volume = Math.min(1, Math.max(0, volume));
  el.muted = volume <= 0;
  try {
    hookAnalyser();
    await ctx?.resume();
    await el.play();
    blocked = false;
  } catch {
    blocked = true;
  }
  emit();
}

export function setAmbientVolume(volume: number) {
  const el = ensure();
  el.volume = Math.min(1, Math.max(0, volume));
  if (volume > 0) el.muted = false;
  emit();
}

export function setAmbientMuted(muted: boolean) {
  const el = ensure();
  el.muted = muted;
  emit();
}

export function toggleAmbientMute() {
  const el = ensure();
  el.muted = !el.muted;
  emit();
  return el.muted;
}

export function stopAmbient() {
  if (!audio) return;
  audio.pause();
  emit();
}
