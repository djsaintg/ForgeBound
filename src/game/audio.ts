/**
 * Zero-asset sound engine — everything is synthesized with WebAudio so the
 * build stays a single offline file. All motifs are original.
 */
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  try {
    if (!ctx && typeof window !== "undefined") {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; vol?: number; delay?: number; glide?: number } = {}
) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const { type = "triangle", vol = 0.12, delay = 0, glide } = opts;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol = 0.08, delay = 0, freq = 1800) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  setMuted(m: boolean) { muted = m; },
  isMuted() { return muted; },
  click() { tone(720, 0.06, { type: "square", vol: 0.04 }); },
  step() { noise(0.04, 0.025, 0, 900); },
  swing() { noise(0.09, 0.05, 0, 2400); },
  gather() {
    tone(520, 0.09, { vol: 0.09 });
    tone(780, 0.1, { vol: 0.08, delay: 0.06 });
  },
  splash() {
    noise(0.22, 0.07, 0, 1100);
    tone(300, 0.15, { glide: 140, vol: 0.05 });
  },
  coin() {
    tone(1240, 0.07, { type: "square", vol: 0.05 });
    tone(1660, 0.12, { type: "square", vol: 0.05, delay: 0.06 });
  },
  // Per-blow impacts, timed to the v0.4.0 work animations
  chop() {
    noise(0.07, 0.07, 0, 700);
    tone(130, 0.08, { type: "triangle", vol: 0.06, glide: 90 });
  },
  clink() {
    tone(1900, 0.06, { type: "square", vol: 0.025 });
    noise(0.04, 0.05, 0, 4200);
  },
  tap() {
    tone(1480, 0.09, { type: "triangle", vol: 0.05 });
    tone(2960, 0.05, { type: "sine", vol: 0.02 });
  },
  smith() {
    noise(0.05, 0.09, 0, 3600);
    tone(220, 0.12, { type: "sawtooth", vol: 0.05 });
  },
  error() {
    tone(190, 0.16, { type: "sawtooth", vol: 0.07, glide: 120 });
  },
  moo() {
    tone(160, 0.4, { type: "sawtooth", vol: 0.06, glide: 110 });
    tone(158, 0.4, { type: "sawtooth", vol: 0.05, delay: 0.02, glide: 105 });
  },
  // Combat vocabulary (added for v0.2.0, restored in Gamma)
  hit() {
    noise(0.06, 0.09, 0, 3200);
    tone(140, 0.1, { type: "square", vol: 0.06, glide: 90 });
  },
  hurt() {
    tone(320, 0.16, { type: "sawtooth", vol: 0.08, glide: 140 });
    noise(0.08, 0.05, 0, 700);
  },
  miss() {
    noise(0.05, 0.03, 0, 2600);
  },
  kill() {
    tone(392, 0.12, { vol: 0.09 });
    tone(523.25, 0.12, { vol: 0.09, delay: 0.08 });
    tone(659.25, 0.2, { vol: 0.1, delay: 0.16 });
  },
  death() {
    tone(220, 0.3, { type: "sawtooth", vol: 0.09, glide: 80 });
    tone(110, 0.5, { type: "sawtooth", vol: 0.08, delay: 0.2, glide: 55 });
  },
  bury() {
    tone(660, 0.12, { type: "sine", vol: 0.07 });
    tone(880, 0.18, { type: "sine", vol: 0.06, delay: 0.08 });
  },
  // Prayer (v0.4.2)
  bless() {
    tone(587.33, 0.22, { type: "sine", vol: 0.06 });
    tone(880, 0.3, { type: "sine", vol: 0.05, delay: 0.07 });
  },
  unbless() {
    tone(660, 0.18, { type: "sine", vol: 0.05, glide: 440 });
  },
  pray() {
    [392, 493.88, 587.33, 783.99].forEach((n, i) => tone(n, 0.5, { type: "sine", vol: 0.05, delay: i * 0.12 }));
  },
  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => tone(n, 0.28, { type: "triangle", vol: 0.1, delay: i * 0.09 }));
    tone(1318.5, 0.5, { type: "triangle", vol: 0.08, delay: 0.38 });
    noise(0.4, 0.03, 0.35, 5200);
  },
};
