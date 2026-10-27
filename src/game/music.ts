/**
 * The score: original area themes played by a tiny sequencer through
 * synthesized instruments, crossfading as the hero moves between zones, plus
 * short stingers for level-ups, quest completion and death.
 *
 * Every melody and progression here was written for ForgeBound. Themes are
 * data: a chord per bar and a melody line; the harp, pad, bass and drum
 * parts are generated from the chords by each theme's patterns.
 */
import type { GameState } from "./types";
import { tileName } from "./map";
import { audio, peekAudio, registerStinger, whiteNoise, type Buses } from "./audio";

// ---------------------------------------------------------------- pitches --

const NOTE: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
/** "F#4" → MIDI 66. */
function midi(name: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return NOTE[m[1]] + (Number(m[2]) + 1) * 12;
}
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** A chord symbol's tones as MIDI, root in octave 3: "F#m" → [54, 57, 61]. */
function chordTones(sym: string): number[] {
  const m = /^([A-G][#b]?)(m?)$/.exec(sym);
  if (!m) throw new Error(`bad chord ${sym}`);
  const root = NOTE[m[1]] + 48;
  return [root, root + (m[2] ? 3 : 4), root + 7];
}

// ------------------------------------------------------------- instruments --

type Inst = "pluck" | "harp" | "flute" | "horn" | "pad" | "bass" | "drum" | "shaker" | "bell";

const ksCache = new Map<string, AudioBuffer>();
/**
 * Karplus–Strong plucked string: a burst of noise recirculating through a
 * short averaging delay line. Brighter and longer for the harp, darker and
 * shorter for the lute. Cached per pitch, so each note is computed once.
 */
function stringBuffer(c: AudioContext, m: number, harp: boolean): AudioBuffer {
  const key = `${m}:${harp}`;
  const hit = ksCache.get(key);
  if (hit) return hit;
  const sr = c.sampleRate;
  const seconds = harp ? 2.6 : 1.6;
  const len = Math.floor(sr * seconds);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / hz(m)));
  const decay = harp ? 0.9985 : 0.996;
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const n = Math.random() * 2 - 1;
    prev = harp ? prev * 0.6 + n * 0.4 : n; // the harp's pluck is softer, so its burst is filtered
    d[i] = prev;
  }
  for (let i = period; i < len; i++) d[i] = decay * 0.5 * (d[i - period] + d[i - period + 1]);
  ksCache.set(key, buf);
  return buf;
}

/** Plays one note on an instrument at audio time t into `out`. Durations in seconds. */
function play(b: Buses, out: AudioNode, inst: Inst, m: number, t: number, dur: number, vel: number, cutoff = 900) {
  const { c } = b;
  const g = c.createGain();
  g.connect(out);
  const f = hz(m);

  if (inst === "pluck" || inst === "harp") {
    const src = c.createBufferSource();
    src.buffer = stringBuffer(c, m, inst === "harp");
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = inst === "harp" ? 4200 : 2200;
    g.gain.value = vel * (inst === "harp" ? 0.425 : 0.6);
    src.connect(lp).connect(g);
    src.start(t);
    return;
  }
  if (inst === "flute" || inst === "horn") {
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    const flute = inst === "flute";
    o1.type = flute ? "sine" : "sawtooth";
    o2.type = flute ? "triangle" : "sawtooth";
    o1.frequency.value = f;
    o2.frequency.value = flute ? f * 2 : f * 1.004;
    // vibrato that blooms after the attack, as a player would
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = flute ? 5.2 : 4.6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * (flute ? 0.007 : 0.004), t + Math.min(0.35, dur * 0.6));
    lfo.connect(depth);
    depth.connect(o1.frequency);
    depth.connect(o2.frequency);
    const mix = c.createGain();
    const o2g = c.createGain();
    o2g.gain.value = flute ? 0.12 : 0.6;
    o1.connect(mix);
    o2.connect(o2g).connect(mix);
    let node: AudioNode = mix;
    if (!flute) {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(1400, t + 0.12);
      lp.Q.value = 0.8;
      mix.connect(lp);
      node = lp;
    }
    node.connect(g);
    const peak = vel * (flute ? 0.32 : 0.12);
    const attack = flute ? 0.07 : 0.1;
    const release = Math.min(0.25, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak * 0.85, t + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    if (flute) {
      // breath: a little filtered noise riding on the tone
      const n = c.createBufferSource();
      n.buffer = whiteNoise(c);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f * 2;
      bp.Q.value = 2;
      const ng = c.createGain();
      ng.gain.value = 0.05;
      n.connect(bp).connect(ng).connect(g);
      n.start(t, Math.random());
      n.stop(t + dur + 0.1);
    }
    for (const o of [o1, o2, lfo]) { o.start(t); o.stop(t + dur + 0.1); }
    return;
  }
  if (inst === "pad") {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.connect(g);
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.6);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.05, t + Math.min(0.9, dur * 0.4));
    g.gain.setValueAtTime(vel * 0.05, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.5);
    return;
  }
  if (inst === "bass") {
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    o.type = "triangle";
    o2.type = "sine";
    o.frequency.value = f;
    o2.frequency.value = f / 2;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.34, t + 0.015);
    g.gain.exponentialRampToValueAtTime(vel * 0.14, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    for (const x of [o, o2]) { x.start(t); x.stop(t + dur + 0.2); }
    return;
  }
  if (inst === "drum") {
    // frame drum: a pitched thump with a skin slap on top
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.28);
    o.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.start(t);
    o.stop(t + 0.45);
    const n = c.createBufferSource();
    n.buffer = whiteNoise(c);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const ng = c.createGain();
    ng.gain.setValueAtTime(vel * 0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(lp).connect(ng).connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.1);
    return;
  }
  if (inst === "shaker") {
    const n = c.createBufferSource();
    n.buffer = whiteNoise(c);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6500;
    n.connect(hp).connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.08, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.start(t, Math.random());
    n.stop(t + 0.09);
    return;
  }
  // bell: inharmonic partials, long decay
  [1, 2.76, 5.4].forEach((p, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f * p;
    const pg = c.createGain();
    const len = dur / (1 + i * 0.7);
    pg.gain.setValueAtTime(0.0001, t);
    pg.gain.exponentialRampToValueAtTime((vel * 0.16) / (1 + i * 1.5), t + 0.004);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(pg).connect(g);
    o.start(t);
    o.stop(t + len + 0.05);
  });
  g.gain.value = 1;
}

// ---------------------------------------------------------------- themes --

export type ThemeId = "title" | "vale" | "wilds" | "gully" | "chapel" | "crypt";

interface ThemeDef {
  id: ThemeId;
  title: string;
  bpm: number;
  beats: number;
  chords: string[];
  /** "F#4:1 A4:.5 r:.5 …", bars separated by "|" for reading; r is a rest. */
  melody: string;
  lead: "flute" | "horn";
  /** A second instrument playing the melody in unison, for weight. */
  double?: "flute" | "horn";
  /** Play the melody every loop instead of resting every other time. */
  alwaysLead?: boolean;
  /** Harp (or lute) pattern: chord-tone indices per eighth note. 0 root, 1 third, 2 fifth, 3 octave, 4 tenth, 5 twelfth; -1 rests. */
  arp: number[];
  arpInst: "harp" | "pluck";
  /** Bass hits as [beat, chord-tone index, length in beats]. */
  bass: [number, number, number][];
  /** Drum hits per bar as [beat, instrument, velocity]. */
  drums: [number, "drum" | "shaker", number][];
  padCutoff: number;
}

const THEMES: Record<ThemeId, ThemeDef> = {
  // The login screen: a stirring call to adventure. Horn doubled by flute,
  // a driving drum and bass pulse under it, and the tune every time round.
  title: {
    id: "title",
    title: "Title of the Realm",
    bpm: 110,
    beats: 4,
    chords: ["Bm", "G", "D", "A", "Bm", "G", "Em", "F#", "G", "A", "D", "Bm", "G", "A", "Bm", "Bm"],
    melody: `
      B4:1.5 C#5:.5 D5:1 F#5:1 | G5:1.5 F#5:.5 D5:2 | A4:1 D5:1 F#5:1 A5:1 | E5:3 C#5:1 |
      B4:1.5 C#5:.5 D5:1 F#5:1 | B5:1.5 A5:.5 G5:1 D5:1 | E5:1 G5:1 B5:1 G5:1 | F#5:3 A#4:1 |
      B4:1 D5:1 G5:1.5 F#5:.5 | E5:1 C#5:1 A4:1 E5:1 | F#5:1.5 E5:.5 D5:1 A4:1 | B4:2 F#5:2 |
      G5:1.5 F#5:.5 E5:1 D5:1 | E5:1.5 F#5:.5 A5:1 E5:1 | D5:1 C#5:1 B4:1 F#5:1 | B5:4`,
    lead: "horn",
    double: "flute",
    alwaysLead: true,
    arp: [0, 2, 3, 2, 4, 2, 3, 2],
    arpInst: "harp",
    bass: [[0, 0, 0.75], [1, 0, 0.75], [1.5, 0, 0.5], [2, 2, 0.75], [3, 0, 0.75], [3.5, 2, 0.5]],
    drums: [[0, "drum", 0.75], [1.5, "drum", 0.35], [2, "drum", 0.6], [3, "drum", 0.35], [3.5, "drum", 0.3],
      [0, "shaker", 0.25], [0.5, "shaker", 0.2], [1, "shaker", 0.25], [1.5, "shaker", 0.2], [2, "shaker", 0.25], [2.5, "shaker", 0.2], [3, "shaker", 0.25], [3.5, "shaker", 0.2]],
    padCutoff: 1300,
  },
  // The Vale: a warm folk waltz for the square, meadow, pasture and coop.
  vale: {
    id: "vale",
    title: "Hearth of the Vale",
    bpm: 84,
    beats: 3,
    chords: ["D", "G", "D", "A", "Bm", "G", "Em", "A", "D", "F#m", "G", "D", "Em", "A", "D", "D"],
    melody: `
      F#4:1 A4:1 D5:1 | B4:1.5 A4:.5 G4:1 | F#4:1 E4:1 D4:1 | E4:2 A4:1 |
      B4:1 C#5:1 D5:1 | E5:1.5 D5:.5 B4:1 | G4:1 B4:1 A4:1 | A4:3 |
      D5:1 F#5:1 E5:1 | C#5:1.5 A4:.5 C#5:1 | D5:1 B4:1 G4:1 | A4:2 F#4:1 |
      G4:1 B4:1 E5:1 | C#5:1.5 B4:.5 A4:1 | F#4:1 E4:1 D4:1 | D4:3`,
    lead: "flute",
    arp: [0, 2, 3, 4, 3, 2],
    arpInst: "harp",
    bass: [[0, 0, 2], [2, 2, 1]],
    drums: [[0, "drum", 0.35], [1, "shaker", 0.25], [2, "shaker", 0.25]],
    padCutoff: 1100,
  },
  // The Wilds: flowing harp and a slow flute for the Westwood and the river.
  wilds: {
    id: "wilds",
    title: "Under the Westwood",
    bpm: 70,
    beats: 4,
    chords: ["Am", "G", "D", "Am", "C", "G", "D", "Em", "Am", "G", "D", "F", "C", "G", "Am", "Am"],
    melody: `
      E5:2 D5:1 C5:1 | B4:3 G4:1 | A4:2 F#4:1 A4:1 | E4:4 |
      G4:1 C5:1 E5:2 | D5:2 B4:2 | A4:1 B4:1 C5:1 D5:1 | B4:4 |
      A5:2 G5:1 E5:1 | D5:2 B4:1 D5:1 | F#5:2 E5:1 D5:1 | C5:3 A4:1 |
      G4:2 C5:1 E5:1 | D5:3 B4:1 | C5:1 B4:1 A4:2 | A4:4`,
    lead: "flute",
    arp: [0, 2, 3, 4, 5, 4, 3, 2],
    arpInst: "harp",
    bass: [[0, 0, 2], [2, 2, 2]],
    drums: [],
    padCutoff: 850,
  },
  // Grublin Gully & Keldrek Mine: a darker march with a horn over frame drums.
  gully: {
    id: "gully",
    title: "Stone and Smoke",
    bpm: 96,
    beats: 4,
    chords: ["Em", "Em", "C", "D", "Em", "Em", "F", "B", "Am", "C", "D", "Em", "C", "Am", "B", "B"],
    melody: `
      E4:1.5 F#4:.5 G4:1 B4:1 | A4:2 G4:1 F#4:1 | E4:1.5 G4:.5 C5:2 | B4:1 A4:1 F#4:2 |
      E4:1.5 F#4:.5 G4:1 B4:1 | E5:2 D5:1 B4:1 | C5:1.5 A4:.5 F4:2 | D#4:2 F#4:1 B4:1 |
      C5:2 B4:1 A4:1 | G4:2 E4:1 G4:1 | F#4:1 A4:1 D5:2 | B4:4 |
      E5:2 D5:1 C5:1 | B4:1 A4:1 G4:2 | F#4:2 B4:1 D#5:1 | B4:4`,
    lead: "horn",
    arp: [0, 0, 2, 0, 3, 0, 2, 0],
    arpInst: "pluck",
    bass: [[0, 0, 1.5], [2, 0, 1.5]],
    drums: [[0, "drum", 0.55], [1.5, "drum", 0.3], [2, "drum", 0.45], [0, "shaker", 0.2], [0.5, "shaker", 0.15], [1, "shaker", 0.2], [1.5, "shaker", 0.15], [2, "shaker", 0.2], [2.5, "shaker", 0.15], [3, "shaker", 0.2], [3.5, "shaker", 0.15]],
    padCutoff: 650,
  },
  // Greyhallow: a slow, open hymn-like air over a sparse harp, no drums.
  chapel: {
    id: "chapel",
    title: "Bells of Greyhallow",
    bpm: 60,
    beats: 4,
    chords: ["F", "C", "Dm", "Bb", "F", "Am", "Bb", "C", "Dm", "Am", "Bb", "F", "Gm", "C", "F", "F"],
    melody: `
      A4:2 C5:1 A4:1 | G4:3 E4:1 | F4:1 A4:1 D5:2 | D5:1.5 C5:.5 Bb4:2 |
      A4:2 F4:1 A4:1 | C5:2 E5:2 | D5:1 C5:1 Bb4:1 D5:1 | C5:4 |
      D5:2 F5:1 E5:1 | C5:3 A4:1 | Bb4:1 D5:1 F5:2 | C5:2 A4:2 |
      Bb4:1.5 A4:.5 G4:2 | E4:2 G4:1 Bb4:1 | A4:2 G4:1 E4:1 | F4:4`,
    lead: "flute",
    arp: [0, 2, 3, 2, 4, 2, 3, 2],
    arpInst: "harp",
    bass: [[0, 0, 4]],
    drums: [],
    padCutoff: 1000,
  },
  // The crypt: low, slow and cold. A dark flute line, a lone muffled drum.
  crypt: {
    id: "crypt",
    title: "Beneath the Stones",
    bpm: 58,
    beats: 4,
    chords: ["Dm", "Dm", "Bb", "A", "Dm", "Gm", "Bb", "A", "Gm", "Dm", "Eb", "A", "Dm", "Bb", "Gm", "A"],
    melody: `
      D4:3 F4:1 | E4:2 D4:2 | F4:2 Bb4:1 A4:1 | A4:2 G4:1 E4:1 |
      D4:2 A4:2 | Bb4:3 A4:1 | G4:1 F4:1 D4:2 | E4:3 C#4:1 |
      D5:2 Bb4:2 | A4:3 F4:1 | G4:2 Eb4:2 | E4:2 C#4:2 |
      D4:1 F4:1 A4:2 | Bb4:1 A4:1 F4:2 | G4:2 Bb4:1 A4:1 | A4:4`,
    lead: "flute",
    arp: [0, -1, 2, -1, 3, -1, 2, -1],
    arpInst: "pluck",
    bass: [[0, 0, 4]],
    drums: [[0, "drum", 0.3]],
    padCutoff: 500,
  },
};

interface NoteEvent { beat: number; len: number; inst: Inst; m: number; vel: number; lead: boolean }

/** Expand a theme into one loop of timed notes. */
function compile(th: ThemeDef): NoteEvent[] {
  const ev: NoteEvent[] = [];
  th.chords.forEach((sym, bar) => {
    const tones = chordTones(sym);
    const deg = (i: number) => tones[i % 3] + 12 * Math.floor(i / 3);
    const at = bar * th.beats;
    // pad: the chord an octave up, held for the bar
    for (const t of tones) ev.push({ beat: at, len: th.beats, inst: "pad", m: t + 12, vel: 0.8, lead: false });
    // a negative index in the pattern is a rest
    th.arp.forEach((d, i) => { if (d >= 0) ev.push({ beat: at + i * 0.5, len: 0.5, inst: th.arpInst, m: deg(d) + (th.arpInst === "pluck" ? -12 : 0), vel: i === 0 ? 0.9 : 0.65, lead: false }); });
    for (const [b, d, len] of th.bass) ev.push({ beat: at + b, len, inst: "bass", m: deg(d) - 12, vel: 0.9, lead: false });
    for (const [b, inst, vel] of th.drums) ev.push({ beat: at + b, len: 0.5, inst, m: 0, vel, lead: false });
  });
  let beat = 0;
  for (const tok of th.melody.split(/[\s|]+/).filter(Boolean)) {
    const [name, len] = tok.split(":");
    const l = Number(len);
    if (name !== "r") {
      ev.push({ beat, len: l, inst: th.lead, m: midi(name), vel: 0.9, lead: !th.alwaysLead });
      if (th.double) ev.push({ beat, len: l, inst: th.double, m: midi(name), vel: 0.5, lead: !th.alwaysLead });
    }
    beat += l;
  }
  if (Math.abs(beat - th.chords.length * th.beats) > 1e-6) console.warn(`[music] ${th.id}: melody is ${beat} beats, chords are ${th.chords.length * th.beats}`);
  return ev.sort((a, b) => a.beat - b.beat);
}

const COMPILED: Partial<Record<ThemeId, NoteEvent[]>> = {};

// ------------------------------------------------------------- sequencer --

/** One theme playing: its own gain for crossfades, and a cursor into the loop. */
interface Player {
  id: ThemeId;
  out: GainNode;
  start: number; // audio time of the current loop's first beat
  idx: number;
  loop: number;
  fading: boolean;
}

const LOOKAHEAD = 0.3;
const FADE = 3;
let players: Player[] = [];
let duck: GainNode | null = null;
let current: ThemeId | null = null;
let pending: { id: ThemeId; since: number } | null = null;

function startTheme(b: Buses, id: ThemeId) {
  const { c } = b;
  if (!duck) {
    duck = c.createGain();
    duck.connect(b.music);
    const wet = c.createGain();
    wet.gain.value = 0.35;
    duck.connect(wet).connect(b.reverb);
  }
  for (const p of players) {
    if (p.fading) continue;
    p.fading = true;
    p.out.gain.cancelScheduledValues(c.currentTime);
    p.out.gain.setValueAtTime(p.out.gain.value, c.currentTime);
    p.out.gain.linearRampToValueAtTime(0.0001, c.currentTime + FADE);
  }
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + FADE);
  out.connect(duck);
  players.push({ id, out, start: c.currentTime + 0.15, idx: 0, loop: 0, fading: false });
  current = id;
}

function schedule(b: Buses) {
  const now = b.c.currentTime;
  for (const p of players) {
    const th = THEMES[p.id];
    const ev = (COMPILED[p.id] ??= compile(th));
    const spb = 60 / th.bpm;
    const loopLen = th.chords.length * th.beats * spb;
    // stop scheduling a faded-out theme once its fade is over
    if (p.fading && p.out.gain.value < 0.001) continue;
    for (;;) {
      if (p.idx >= ev.length) { p.idx = 0; p.loop++; p.start += loopLen; }
      const e = ev[p.idx];
      const t = p.start + e.beat * spb;
      if (t > now + LOOKAHEAD) break;
      p.idx++;
      // Every other time round the melody rests and the accompaniment carries it
      if (e.lead && p.loop % 2 === 1) continue;
      if (t < now - 0.05) continue;
      play(b, p.out, e.inst, e.m, t, e.len * spb, e.vel, th.padCutoff);
    }
  }
  players = players.filter((p) => !(p.fading && p.out.gain.value < 0.001 && now > p.start + 1));
}

/** Which theme an area of the map plays. */
export function themeFor(x: number, y: number): ThemeId | null {
  const name = tileName(x, y);
  if (name === "Grublin Gully" || name === "Keldrek Mine") return "gully";
  if (name === "the Westwood" || name === "the riverbank" || name === "the river") return "wilds";
  if (name === "the Greyhallow Crypt" || name === "the Crypt Sanctum") return "crypt";
  if (name.startsWith("Greyhallow")) return "chapel";
  if (name === "the mountain range") return null; // keep whatever is playing
  return "vale";
}

/**
 * Called every frame. Starts the music once audio is unlocked, switches theme
 * when the hero has been in a new area for a moment (so walking a border
 * doesn't flip-flop), and keeps the sequencer fed.
 */
export function updateMusic(g: GameState, nowMs: number) {
  const b = peekAudio();
  if (!b || b.c.state !== "running") return;
  stopTitleTimer();
  const want = themeFor(g.x, g.y) ?? (current === "title" ? null : current) ?? "vale";
  // The title theme hands over as soon as the world appears
  if (!current || current === "title") { startTheme(b, want); pending = null; }
  else if (want !== current) {
    if (!pending || pending.id !== want) pending = { id: want, since: nowMs };
    else if (nowMs - pending.since > 1500) { startTheme(b, want); pending = null; }
  } else pending = null;
  schedule(b);
}

// The login screen has no game loop, so the title theme keeps itself fed.
let titleTimer = 0;
const stopTitleTimer = () => { if (titleTimer) { window.clearInterval(titleTimer); titleTimer = 0; } };

/** Start the login screen's theme. Needs a click or key press first, like all browser audio. */
export function playTitle() {
  const b = audio();
  if (!b) return;
  if (current !== "title") startTheme(b, "title");
  if (!titleTimer) titleTimer = window.setInterval(() => { const bb = peekAudio(); if (bb) schedule(bb); }, 100);
}

/** Fade everything out (leaving the game). */
export function stopMusic() {
  stopTitleTimer();
  const b = peekAudio();
  if (b) {
    for (const p of players) {
      p.fading = true;
      p.out.gain.cancelScheduledValues(b.c.currentTime);
      p.out.gain.setValueAtTime(p.out.gain.value, b.c.currentTime);
      p.out.gain.linearRampToValueAtTime(0.0001, b.c.currentTime + 1);
    }
  }
  players = [];
  current = null;
  pending = null;
}

export const currentTheme = () => (current ? THEMES[current].title : null);

// -------------------------------------------------------------- stingers --

/**
 * Short moments over the score, which ducks under them. They go out on the
 * effects bus, so a level-up is still heard with the music turned down.
 */
registerStinger((kind) => {
  const b = audio();
  if (!b) return;
  const { c } = b;
  const t = c.currentTime + 0.02;
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(b.effects);
  const wet = c.createGain();
  wet.gain.value = 0.45;
  out.connect(wet).connect(b.reverb);
  const n = (s: string) => midi(s);

  let length = 2;
  if (kind === "level") {
    ["D5", "F#5", "A5", "D6"].forEach((s, i) => play(b, out, "bell", n(s), t + i * 0.09, 1.4, 0.8));
    ["D4", "F#4", "A4"].forEach((s) => play(b, out, "pad", n(s), t, 1.2, 1.2));
    play(b, out, "harp", n("D3"), t, 1, 1);
    length = 2;
  } else if (kind === "quest") {
    ["G3", "B3", "D4", "G4", "B4", "D5", "G5"].forEach((s, i) => play(b, out, "harp", n(s), t + i * 0.06, 1.5, 0.9));
    ["G4", "B4", "D5"].forEach((s) => play(b, out, "horn", n(s), t + 0.45, 1.6, 1));
    ["D4", "G4"].forEach((s) => play(b, out, "horn", n(s), t + 0.45, 1.6, 0.8));
    ["G5", "B5", "D6", "G6"].forEach((s, i) => play(b, out, "bell", n(s), t + 0.5 + i * 0.12, 1.8, 0.7));
    play(b, out, "drum", 0, t + 0.45, 0.4, 0.7);
    length = 3;
  } else {
    ["A3", "G3", "F3", "E3"].forEach((s, i) => play(b, out, "horn", n(s), t + i * 0.42, 0.6, 0.9));
    ["A3", "C4", "E4"].forEach((s) => play(b, out, "pad", n(s), t + 1.26, 1.8, 1.2));
    play(b, out, "drum", 0, t, 0.4, 0.8);
    play(b, out, "drum", 0, t + 1.26, 0.4, 0.6);
    length = 3.2;
  }
  if (duck) {
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(duck.gain.value, t);
    duck.gain.linearRampToValueAtTime(0.25, t + 0.15);
    duck.gain.setValueAtTime(0.25, t + length - 0.6);
    duck.gain.linearRampToValueAtTime(1, t + length + 0.6);
  }
});
