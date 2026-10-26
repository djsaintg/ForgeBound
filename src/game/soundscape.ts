/**
 * The world's ambience: running water by the river, the forge's roar near the
 * furnace and anvil, campfire crackle, a sizzle while cooking, birdsong by
 * day and crickets at night. Each source fades with distance from the hero.
 * Driven once a frame from the world loop, alongside the music.
 */
import type { GameState } from "./types";
import { MAP_H, MAP_W, groundAt, objAt } from "./map";
import { peekAudio, whiteNoise, type Buses } from "./audio";
import { dayCycle, jobOf } from "./anim";
import { stopMusic, updateMusic } from "./music";

/** A looping filtered-noise bed whose volume we steer. */
interface Bed { gain: GainNode; max: number }

let beds: Record<"river" | "forge" | "sizzle" | "crickets", Bed> | null = null;
let lastScan = 0;
let near = { water: 99, forge: 99, fire: 99 };
let nextBird = 0;
let nextCrackle = 0;

function makeBeds(b: Buses) {
  const { c } = b;
  const loop = (filter: BiquadFilterType, freq: number, q: number, max: number, lfoHz = 0): Bed => {
    const src = c.createBufferSource();
    src.buffer = whiteNoise(c);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(f).connect(gain).connect(b.ambience);
    if (lfoHz) {
      // slow swell, like water lapping or a fire breathing
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = lfoHz;
      depth.gain.value = freq * 0.35;
      lfo.connect(depth).connect(f.frequency);
      lfo.start();
    }
    src.start();
    return { gain, max };
  };

  // Crickets: a high tone gated by a fast pulse, itself gated by a slow one, for that chirp-chirp-pause
  const cr = c.createOscillator();
  cr.frequency.value = 4400;
  const pulse = c.createOscillator();
  pulse.type = "square";
  pulse.frequency.value = 28;
  const pulseDepth = c.createGain();
  pulseDepth.gain.value = 0.5;
  const gate = c.createGain();
  gate.gain.value = 0.5;
  pulse.connect(pulseDepth).connect(gate.gain);
  const phrase = c.createOscillator();
  phrase.type = "square";
  phrase.frequency.value = 1.6;
  const phraseDepth = c.createGain();
  phraseDepth.gain.value = 0.5;
  const gate2 = c.createGain();
  gate2.gain.value = 0.5;
  phrase.connect(phraseDepth).connect(gate2.gain);
  const crickets = c.createGain();
  crickets.gain.value = 0;
  cr.connect(gate).connect(gate2).connect(crickets).connect(b.ambience);
  for (const o of [cr, pulse, phrase]) o.start();

  beds = {
    river: loop("lowpass", 650, 0.7, 0.16, 0.13),
    forge: loop("lowpass", 160, 1.2, 0.2, 0.4),
    sizzle: loop("highpass", 5200, 0.5, 0.05),
    crickets: { gain: crickets, max: 0.012 },
  };
}

const setBed = (b: Buses, bed: Bed, level: number) =>
  bed.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * bed.max, b.c.currentTime, 0.4);

/** Closeness 1 → 0 over `range` tiles, eased so it swells as you approach. */
const falloff = (d: number, range: number) => Math.pow(Math.max(0, 1 - d / range), 1.5);

/** Nearest water, forge (furnace / anvil) and campfire within a few tiles. Run a few times a second. */
function scan(x: number, y: number) {
  near = { water: 99, forge: 99, fire: 99 };
  const R = 8;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      const d = Math.hypot(dx, dy);
      if (groundAt(tx, ty) === "~" && d < near.water) near.water = d;
      const o = objAt(tx, ty);
      if ((o === "F" || o === "A") && d < near.forge) near.forge = d;
      if (o === "*" && d < near.fire) near.fire = d;
    }
  }
}

function chirp(b: Buses, t: number, vol: number) {
  // a little phrase of 2–4 rising and falling whistles
  const { c } = b;
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2600 + Math.random() * 1400;
  for (let i = 0; i < notes; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    const s = t + i * (0.09 + Math.random() * 0.05);
    const f0 = base * (1 + (Math.random() - 0.3) * 0.25);
    o.frequency.setValueAtTime(f0, s);
    o.frequency.exponentialRampToValueAtTime(f0 * (Math.random() < 0.5 ? 1.35 : 0.8), s + 0.07);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(vol, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.08);
    o.connect(g).connect(b.ambience);
    const w = c.createGain();
    w.gain.value = 0.4;
    g.connect(w).connect(b.reverb);
    o.start(s);
    o.stop(s + 0.1);
  }
}

function crackle(b: Buses, t: number, vol: number) {
  const { c } = b;
  const src = c.createBufferSource();
  src.buffer = whiteNoise(c);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1500 + Math.random() * 2500;
  f.Q.value = 3;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.04);
  src.connect(f).connect(g).connect(b.ambience);
  src.start(t, Math.random() * 1.5);
  src.stop(t + 0.1);
}

/** Once a frame: steer the ambient beds and the music. Silent until the player has clicked. */
export function updateSoundscape(g: GameState, nowMs: number) {
  const b = peekAudio();
  if (!b || b.c.state !== "running") return;
  if (!beds) makeBeds(b);
  if (nowMs - lastScan > 250) { scan(g.x, g.y); lastScan = nowMs; }

  const day = dayCycle(nowMs);
  setBed(b, beds!.river, falloff(near.water, 7));
  setBed(b, beds!.forge, falloff(near.forge, 5));
  setBed(b, beds!.sizzle, !g.path.length && jobOf(g) === "cook" ? 1 : 0);
  setBed(b, beds!.crickets, Math.max(0, (0.4 - day) / 0.4));

  const t = b.c.currentTime;
  // birds sing by day, away from the mine's stone and the river's roar
  if (day > 0.45 && nowMs > nextBird) {
    chirp(b, t + 0.05, 0.012 + Math.random() * 0.012);
    nextBird = nowMs + 1800 + Math.random() * 4500;
  }
  if (near.fire < 4 && nowMs > nextCrackle) {
    crackle(b, t + 0.02, 0.05 * falloff(near.fire, 4) + 0.005);
    nextCrackle = nowMs + 60 + Math.random() * 380;
  }
  updateMusic(g, nowMs);
}

/** Leaving the world: fade the beds and the score out. */
export function stopSoundscape() {
  const b = peekAudio();
  if (b && beds) for (const bed of Object.values(beds)) bed.gain.gain.setTargetAtTime(0, b.c.currentTime, 0.3);
  stopMusic();
}
