import { THEMES, type ThemeId } from "./types";
import { rainAmbientUrl } from "./rain-audio";

export const AMBIENT_BY_THEME: Record<ThemeId, string> = {
  leather: "/windchimes.mp3",
  navy: "/ambient/navy-ocean.mp3",
  dark: "/ambient/dark-night.mp3",
  light: "/ambient/light-cafe.mp3",
  rain: "generated:rain",
};

const CROSSFADE_SEC = 0.6;

type Listener = (state: AmbientState) => void;

export type AmbientState = {
  playing: boolean;
  muted: boolean;
  volume: number;
  energy: number;
  blocked: boolean;
};

type Slot = {
  el: HTMLAudioElement;
  media: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  src: string;
};

const listeners = new Set<Listener>();
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let master: GainNode | null = null;
let freq: Uint8Array<ArrayBuffer> | null = null;
let raf = 0;
let energy = 0;
let blocked = false;
let muted = false;
let userVolume = 0.22;
let meter = false;
let lastTheme: ThemeId = "leather";
let slots: [Slot | null, Slot | null] = [null, null];
let active = 0;
let chain: Promise<void> = Promise.resolve();

export function ritualThemeId(theme?: string | null): ThemeId {
  if (theme && (THEMES as readonly string[]).includes(theme)) return theme as ThemeId;
  return "leather";
}

export function ambientSrcForTheme(theme?: string | null): string {
  return AMBIENT_BY_THEME[ritualThemeId(theme)];
}

function emit() {
  const state = snapshot();
  listeners.forEach((fn) => fn(state));
}

function currentSlot(): Slot | null {
  return slots[active];
}

export function snapshot(): AmbientState {
  const el = currentSlot()?.el ?? null;
  return {
    playing: Boolean(el && !el.paused),
    muted,
    volume: userVolume,
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

function AudioCtor() {
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function ensureGraph() {
  if (ctx) return;
  const AC = AudioCtor();
  if (!AC) return;
  ctx = new AC();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  master = ctx.createGain();
  master.gain.value = muted || userVolume <= 0 ? 0 : userVolume;
  analyser.connect(master);
  master.connect(ctx.destination);
  startMeter();
}

function startMeter() {
  if (meter || !analyser) return;
  meter = true;
  const tick = () => {
    if (!meter || !analyser || !freq) return;
    analyser.getByteFrequencyData(freq);
    let sum = 0;
    for (let i = 2; i < 24; i += 1) sum += freq[i];
    energy = sum / (22 * 255);
    emit();
    raf = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

function stopMeter() {
  meter = false;
  cancelAnimationFrame(raf);
  raf = 0;
  energy = 0;
}

function applyMaster() {
  if (master) {
    master.gain.setTargetAtTime(muted || userVolume <= 0 ? 0 : userVolume, ctx?.currentTime ?? 0, 0.03);
  }
  for (const slot of slots) {
    if (!slot) continue;
    if (!slot.gain) slot.el.volume = muted ? 0 : userVolume;
    slot.el.muted = muted || userVolume <= 0;
  }
}

function makeElement(src: string) {
  const el = new Audio(src);
  el.loop = true;
  el.preload = "auto";
  el.volume = 1;
  return el;
}

function makeSlot(src: string): Slot {
  const el = makeElement(src);
  if (!ctx || !analyser) {
    el.volume = muted ? 0 : userVolume;
    return { el, media: null, gain: null, src };
  }
  try {
    const media = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    media.connect(gain);
    gain.connect(analyser);
    return { el, media, gain, src };
  } catch {
    el.volume = muted ? 0 : userVolume;
    return { el, media: null, gain: null, src };
  }
}

function disposeSlot(slot: Slot | null) {
  if (!slot) return;
  try {
    slot.el.pause();
  } catch {
    /* ignore */
  }
  slot.el.removeAttribute("src");
  try {
    slot.el.load();
  } catch {
    /* ignore */
  }
  try {
    slot.media?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    slot.gain?.disconnect();
  } catch {
    /* ignore */
  }
}

async function playSlot(slot: Slot) {
  try {
    await ctx?.resume();
    await slot.el.play();
    blocked = false;
  } catch {
    blocked = true;
  }
}

async function switchTo(src: string) {
  ensureGraph();
  const current = currentSlot();
  if (current && current.src === src) {
    applyMaster();
    await playSlot(current);
    emit();
    return;
  }

  const nextIdx = current ? 1 - active : active;
  if (slots[nextIdx] && slots[nextIdx] !== current) disposeSlot(slots[nextIdx]);
  const incoming = makeSlot(src);
  slots[nextIdx] = incoming;

  if (!current) {
    if (incoming.gain) incoming.gain.gain.value = 1;
    else incoming.el.volume = muted ? 0 : userVolume;
    applyMaster();
    active = nextIdx;
    await playSlot(incoming);
    emit();
    return;
  }

  if (incoming.gain && current.gain && ctx) {
    incoming.gain.gain.value = 0;
  } else {
    incoming.el.volume = 0;
  }
  applyMaster();
  await playSlot(incoming);
  if (blocked) {
    emit();
    return;
  }

  const now = ctx?.currentTime ?? 0;
  if (incoming.gain && current.gain && ctx) {
    current.gain.gain.cancelScheduledValues(now);
    incoming.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setValueAtTime(current.gain.gain.value, now);
    incoming.gain.gain.setValueAtTime(0, now);
    current.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SEC);
    incoming.gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);
  } else {
    const from = muted ? 0 : userVolume;
    const started = performance.now();
    const step = (stamp: number) => {
      const t = Math.min(1, (stamp - started) / (CROSSFADE_SEC * 1000));
      current.el.volume = from * (1 - t);
      incoming.el.volume = from * t;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const prev = active;
  active = nextIdx;
  window.setTimeout(() => {
    if (slots[prev] && slots[prev] !== slots[active]) {
      disposeSlot(slots[prev]);
      slots[prev] = null;
    }
    emit();
  }, CROSSFADE_SEC * 1000 + 50);
  emit();
}

async function startAmbientInner(volume: number, theme?: string) {
  userVolume = Math.min(1, Math.max(0, volume));
  // A mute is a session choice. Restarting the room (a new folder, a new page,
  // a rename that remounts the desk) must not turn it back up. Volume 0 still mutes.
  if (userVolume <= 0) muted = true;
  lastTheme = ritualThemeId(theme ?? lastTheme);
  ensureGraph();
  startMeter();
  let src = ambientSrcForTheme(lastTheme);
  if (src === "generated:rain") src = await rainAmbientUrl();
  await switchTo(src);
}

export async function startAmbient(volume: number, theme?: string) {
  const run = chain.then(() => startAmbientInner(volume, theme)).catch(() => {
    blocked = true;
    emit();
  });
  chain = run;
  return run;
}

export function setAmbientVolume(volume: number) {
  userVolume = Math.min(1, Math.max(0, volume));
  if (userVolume <= 0) muted = true;
  if (!currentSlot()) ensureGraph();
  applyMaster();
  if (currentSlot() && !currentSlot()!.gain) {
    currentSlot()!.el.volume = muted ? 0 : userVolume;
  }
  emit();
}

export function setAmbientMuted(next: boolean) {
  muted = next;
  applyMaster();
  emit();
}

export function toggleAmbientMute() {
  muted = !muted;
  applyMaster();
  emit();
  return muted;
}

export function stopAmbient() {
  stopMeter();
  for (const slot of slots) {
    try {
      slot?.el.pause();
    } catch {
      /* ignore */
    }
  }
  emit();
}
