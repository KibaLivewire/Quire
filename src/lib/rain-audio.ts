/** Looping rain + distant thunder, synthesized so the Rain theme stays offline. */
let cached: string | null = null;

export async function rainAmbientUrl(): Promise<string> {
  if (cached) return cached;
  const AC =
    window.OfflineAudioContext ||
    (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!AC) return "/windchimes.mp3";
  const sample = 44100;
  const seconds = 16;
  const ctx = new AC(2, sample * seconds, sample);
  const length = sample * seconds;

  const noise = ctx.createBuffer(2, length, sample);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = noise.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.86 + white * 0.14;
      const hiss = white * 0.12;
      data[i] = last * 0.72 + hiss;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.55;
  const wet = ctx.createGain();
  wet.gain.value = 0.42;
  src.connect(filter);
  filter.connect(wet);
  wet.connect(ctx.destination);
  src.start(0);

  rumble(ctx, 3.2, 0.9);
  rumble(ctx, 10.8, 1.15);

  const rendered = await ctx.startRendering();
  const wav = encodeWav(rendered);
  cached = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  return cached;
}

function rumble(ctx: OfflineAudioContext, at: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 38;
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const nsrc = ctx.createBufferSource();
  nsrc.buffer = noiseBuf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 90;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.28 * gain, at + 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, at + 2.6);
  osc.connect(g);
  nsrc.connect(lp);
  lp.connect(g);
  g.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 2.8);
  nsrc.start(at);
}

function encodeWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const samples = buffer.length;
  const bytes = samples * channels * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, bytes, true);
  let offset = 44;
  const chs = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < samples; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const s = Math.max(-1, Math.min(1, chs[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}

function writeStr(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
