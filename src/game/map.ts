/**
 * Procedurally assembled tile map with padding on all sides.
 * Padding ensures the fixed top-right compass (minimap) never covers playable terrain,
 * even when zoomed out.
 */

export const TILE = 32;

// Compass is ~180px wide. 180 / 32 ≈ 5.6 tiles. We use 8 for comfortable margin.
export const PADDING = 8;

const CORE_W = 56;
const CORE_H = 36;

export const MAP_W = CORE_W + PADDING * 2;
export const MAP_H = CORE_H + PADDING * 2;

const OFFSET_X = PADDING;
const OFFSET_Y = PADDING;

// ground chars: . grass  , dirt  # stone  _ sand  b bridge  ~ water  m mountain
// obj chars:    T tree  O oak  % flowers  ^ tall grass  = fence
//               R copper  S tin  I iron  C coal  G gold
//               F furnace  A anvil  B bank  * campfire
//               f shrimp spot  t trout spot
//               M Roka (shop)  P Old Maro (guide npc)
//               H goblin hut  V goblin totem banner  c chicken roost  h hay bale

const WALK_GROUND = new Set([".", ",", "#", "_", "b"]);
const BLOCK_OBJ = new Set(["T", "O", "R", "S", "I", "C", "G", "F", "A", "B", "*", "M", "P", "=", "H", "V", "c", "h"]);

function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry(20260214);
const ground: string[][] = [];
const objs: string[][] = [];
for (let y = 0; y < MAP_H; y++) {
  ground.push(new Array(MAP_W).fill("."));
  objs.push(new Array(MAP_W).fill(""));
}

const riverY = (x: number) => Math.round(26 + 2 * Math.sin(x / 7));

// --- river + banks (core only; it sources from the mountain ranges at either end) ---
for (let x = 0; x < CORE_W; x++) {
  const ry = riverY(x);
  const gx = x + OFFSET_X;
  for (let dy = 0; dy <= 2; dy++) {
    const gy = ry + dy + OFFSET_Y;
    if (gy >= 0 && gy < MAP_H) ground[gy][gx] = "~";
  }
  for (const sy of [ry - 1, ry + 3]) {
    const gy = sy + OFFSET_Y;
    if (gy >= 0 && gy < MAP_H && ground[gy][gx] === ".") ground[gy][gx] = "_";
  }
}

// --- Mountain ranges sealing the realm's border --------------------------------------
// The padding band becomes an impassable mountain wall. Future expansions simply
// push these ranges back by shrinking PADDING / growing the core.
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    const inPad = x < OFFSET_X || x >= CORE_W + OFFSET_X || y < OFFSET_Y || y >= CORE_H + OFFSET_Y;
    if (inPad) ground[y][x] = "m";
  }
}

// --- roads (shifted) -------------------------------------------------------------
const road = (x: number, y: number) => {
  const gx = x + OFFSET_X;
  const gy = y + OFFSET_Y;
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return;
  if (ground[gy][gx] !== "#" && ground[gy][gx] !== "b") ground[gy][gx] = ",";
};

// West road through town to mine (core coords 2..44, 16)
for (let x = 2; x <= 44; x++) road(x, 16);
// South road to bridge
for (let y = 21; y <= 33; y++) road(24, y);
// North road to Goblin Village
for (let y = 8; y <= 16; y++) road(40, y);
for (let x = 38; x <= 44; x++) road(x, 8);

// bridge (shifted)
for (const bx of [24, 25]) {
  const ry = riverY(bx);
  for (let y = ry - 1; y <= ry + 3; y++) {
    const gx = bx + OFFSET_X;
    const gy = y + OFFSET_Y;
    if (gy >= 0 && gy < MAP_H) ground[gy][gx] = "b";
  }
}

// --- town stone plaza (shifted) ---------------------------------------------------
for (let y = 13; y <= 20; y++) {
  for (let x = 19; x <= 30; x++) {
    const gx = x + OFFSET_X;
    const gy = y + OFFSET_Y;
    ground[gy][gx] = "#";
    if (y === 16) continue;
  }
}

// --- mine floor (East) (shifted) ---------------------------------------------------
for (let y = 8; y <= 17; y++) {
  for (let x = 44; x <= 53; x++) {
    const gx = x + OFFSET_X;
    const gy = y + OFFSET_Y;
    ground[gy][gx] = ",";
  }
}

// --- Goblin Village (North-East) (shifted) ----------------------------------------
for (let y = 2; y <= 10; y++) {
  for (let x = 36; x <= 51; x++) {
    const gx = x + OFFSET_X;
    const gy = y + OFFSET_Y;
    if (ground[gy][gx] !== ",") ground[gy][gx] = ",";
  }
}
objs[3 + OFFSET_Y][37 + OFFSET_X] = "H";
objs[3 + OFFSET_Y][43 + OFFSET_X] = "H";
objs[4 + OFFSET_Y][49 + OFFSET_X] = "H";
objs[7 + OFFSET_Y][47 + OFFSET_X] = "H";
objs[8 + OFFSET_Y][38 + OFFSET_X] = "H";
objs[5 + OFFSET_Y][36 + OFFSET_X] = "V";
objs[5 + OFFSET_Y][45 + OFFSET_X] = "V";
objs[5 + OFFSET_Y][41 + OFFSET_X] = "*";

// --- Chicken Coop (South-East of Main Square) (shifted) ---------------------------
for (let x = 32; x <= 38; x++) {
  objs[17 + OFFSET_Y][x + OFFSET_X] = "=";
  objs[22 + OFFSET_Y][x + OFFSET_X] = "=";
}
for (let y = 17; y <= 22; y++) {
  if (y !== 19) objs[y + OFFSET_Y][32 + OFFSET_X] = "=";
  objs[y + OFFSET_Y][38 + OFFSET_X] = "=";
}
for (let y = 18; y <= 21; y++) {
  for (let x = 33; x <= 37; x++) {
    objs[y + OFFSET_Y][x + OFFSET_X] = "";
    const gx = x + OFFSET_X;
    const gy = y + OFFSET_Y;
    if (ground[gy][gx] === ".") ground[gy][gx] = "_";
  }
}
objs[18 + OFFSET_Y][37 + OFFSET_X] = "c";
objs[21 + OFFSET_Y][37 + OFFSET_X] = "h";
objs[21 + OFFSET_Y][36 + OFFSET_X] = "h";

// --- forest (Westwood) (shifted) --------------------------------------------------
for (let y = 0; y <= 23; y++) {
  for (let x = 0; x <= 14; x++) {
    if (y === 16 || y === 15 || y === 17) continue;
    const gx = x + OFFSET_X;
    const gy = y + OFFSET_Y;
    if (ground[gy][gx] !== ".") continue;
    const r = rnd();
    if (r < 0.16) objs[gy][gx] = "T";
    else if (r < 0.19) objs[gy][gx] = "%";
  }
}
for (const [ox, oy] of [[3, 4], [10, 20], [6, 11], [12, 2]] as const) {
  const gx = ox + OFFSET_X;
  const gy = oy + OFFSET_Y;
  if (objs[gy][gx] === "") objs[gy][gx] = "O";
}

// scattered trees + flowers elsewhere (shifted)
for (let y = 0; y < CORE_H; y++) {
  for (let x = 0; x < CORE_W; x++) {
    const gx = x + OFFSET_X;
    const gy = y + OFFSET_Y;
    if (ground[gy][gx] !== "." || objs[gy][gx] !== "") continue;
    if (x <= 14 && y <= 23) continue;
    if (x >= 35 && y <= 12) continue;
    if (x >= 44 && y <= 18) continue;
    if (x >= 31 && x <= 39 && y >= 16 && y <= 23) continue;
    const r = rnd();
    if (r < 0.028) objs[gy][gx] = "T";
    else if (r < 0.05) objs[gy][gx] = "%";
    else if (r < 0.08 && y > 20) objs[gy][gx] = "^";
  }
}

// --- cow pasture (north) (shifted) -------------------------------------------------
for (let x = 17; x <= 29; x++) {
  if (x !== 23) objs[3 + OFFSET_Y][x + OFFSET_X] = "=";
  if (x !== 23) objs[10 + OFFSET_Y][x + OFFSET_X] = "=";
}
for (let y = 4; y <= 9; y++) {
  objs[y + OFFSET_Y][17 + OFFSET_X] = "=";
  objs[y + OFFSET_Y][29 + OFFSET_X] = "=";
}
for (let y = 4; y <= 9; y++) for (let x = 18; x <= 28; x++) objs[y + OFFSET_Y][x + OFFSET_X] = "";

// --- mine rocks (shifted) -----------------------------------------------------------
const rock: [string, number, number][] = [
  ["R", 45, 12], ["R", 48, 11],
  ["S", 51, 11], ["S", 45, 15],
  ["I", 50, 14], ["I", 47, 14],
  ["C", 47, 16], ["C", 51, 16],
  ["G", 52, 13],
];
for (const [c, x, y] of rock) objs[y + OFFSET_Y][x + OFFSET_X] = c;

// --- town fixtures (shifted) --------------------------------------------------------
objs[14 + OFFSET_Y][21 + OFFSET_X] = "F";
objs[14 + OFFSET_Y][23 + OFFSET_X] = "A";
objs[14 + OFFSET_Y][27 + OFFSET_X] = "B";
objs[19 + OFFSET_Y][29 + OFFSET_X] = "*";
objs[18 + OFFSET_Y][25 + OFFSET_X] = "M";
objs[18 + OFFSET_Y][20 + OFFSET_X] = "P";

// --- fishing spots (shifted) --------------------------------------------------------
objs[riverY(15) + OFFSET_Y][15 + OFFSET_X] = "f";
objs[riverY(40) + 2 + OFFSET_Y][40 + OFFSET_X] = "t";

// --- Border is sealed by the mountain ranges above (impassable "m" ground) ---

export const SPAWN = { x: 24 + OFFSET_X, y: 17 + OFFSET_Y };
export const COW_SPAWNS = [
  { x: 20 + OFFSET_X, y: 6 + OFFSET_Y },
  { x: 25 + OFFSET_X, y: 7 + OFFSET_Y },
  { x: 22 + OFFSET_X, y: 8 + OFFSET_Y },
];
export const CHICKEN_SPAWNS = [
  { x: 33 + OFFSET_X, y: 19 + OFFSET_Y },
  { x: 35 + OFFSET_X, y: 20 + OFFSET_Y },
  { x: 36 + OFFSET_X, y: 18 + OFFSET_Y },
  { x: 34 + OFFSET_X, y: 21 + OFFSET_Y },
];
export const GOBLIN_SPAWNS = [
  // four goblins around the camp
  { x: 39 + OFFSET_X, y: 5 + OFFSET_Y },
  { x: 42 + OFFSET_X, y: 4 + OFFSET_Y },
  { x: 45 + OFFSET_X, y: 6 + OFFSET_Y },
  { x: 41 + OFFSET_X, y: 8 + OFFSET_Y },
  // two Bramble Brigands in the deep gully
  { x: 50 + OFFSET_X, y: 3 + OFFSET_Y },
  { x: 49 + OFFSET_X, y: 8 + OFFSET_Y },
];

export const groundAt = (x: number, y: number): string =>
  x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? "~" : ground[y][x];
export const objAt = (x: number, y: number): string =>
  x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? "" : objs[y][x];

export function walkable(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  if (!WALK_GROUND.has(ground[y][x])) return false;
  if (BLOCK_OBJ.has(objs[y][x])) return false;
  return true;
}

export const isWater = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && ground[y][x] === "~";

export function tileName(x: number, y: number): string {
  const g = groundAt(x, y);
  if (g === "m") return "the mountain range";
  if (g === "~") return "the river";
  if (g === "b") return "the bridge";
  if (g === "#") return "Vale Square";
  if (g === "_") {
    // Chicken coop check uses core-relative logic but works because we check ranges after offset
    if (x >= 32 + OFFSET_X && x <= 38 + OFFSET_X && y >= 17 + OFFSET_Y && y <= 22 + OFFSET_Y) return "the Chicken Coop";
    return "the riverbank";
  }
  if (y <= 10 + OFFSET_Y && x >= 36 + OFFSET_X && x <= 52 + OFFSET_X) return "Grublin Gully";
  if (g === ",") return x >= 44 + OFFSET_X && y >= 11 + OFFSET_Y ? "Keldrek Mine" : "the road";
  if (y <= 11 + OFFSET_Y && x >= 16 + OFFSET_X && x <= 30 + OFFSET_X) return "the pasture";
  if (x >= 32 + OFFSET_X && x <= 38 + OFFSET_X && y >= 17 + OFFSET_Y && y <= 22 + OFFSET_Y) return "the Chicken Coop";
  if (x <= 14 + OFFSET_X) return "the Westwood";
  return "the meadow";
}
