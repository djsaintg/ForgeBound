/**
 * Procedurally assembled tile map: west forest, central town, east mine,
 * a river along the south with a bridge, and a cow pasture up north.
 * Two layers: ground (walkability + terrain art) and objs (things on tiles).
 */

export const MAP_W = 56;
export const MAP_H = 36;
export const TILE = 32;

// ground chars: . grass  , dirt  # stone  _ sand  b bridge  ~ water
// obj chars:    T tree  O oak  % flowers  ^ tall grass  = fence
//               R copper  S tin  I iron  C coal  G gold
//               F furnace  A anvil  B bank  * campfire
//               f shrimp spot  t trout spot
//               M Roka (shop)  P Old Maro (guide npc)

const WALK_GROUND = new Set([".", ",", "#", "_", "b"]);
const BLOCK_OBJ = new Set(["T", "O", "R", "S", "I", "C", "G", "F", "A", "B", "*", "M", "P", "=", "e", "c"]);

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

// --- river + banks -----------------------------------------------------
for (let x = 0; x < MAP_W; x++) {
  const ry = riverY(x);
  for (let dy = 0; dy <= 2; dy++) {
    const y = ry + dy;
    if (y >= 0 && y < MAP_H) ground[y][x] = "~";
  }
  for (const sy of [ry - 1, ry + 3]) {
    if (sy >= 0 && sy < MAP_H && ground[sy][x] === ".") ground[sy][x] = "_";
  }
}

// --- roads -------------------------------------------------------------
const road = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
  if (ground[y][x] !== "#" && ground[y][x] !== "b") ground[y][x] = ",";
};
for (let x = 2; x <= 44; x++) road(x, 16);          // west road through town to mine
for (let y = 21; y <= 33; y++) road(24, y);          // south road to and over the bridge
// bridge over the river at x 24..25
for (const bx of [24, 25]) {
  const ry = riverY(bx);
  for (let y = ry - 1; y <= ry + 3; y++) ground[y][bx] = "b";
}

// --- town stone plaza ---------------------------------------------------
for (let y = 13; y <= 20; y++) {
  for (let x = 19; x <= 30; x++) {
    ground[y][x] = "#";
    if (y === 16) continue; // main road crosses plaza
  }
}

// --- mine floor ---------------------------------------------------------
for (let y = 8; y <= 17; y++) {
  for (let x = 44; x <= 53; x++) ground[y][x] = ",";
}

// --- forest -------------------------------------------------------------
for (let y = 0; y <= 23; y++) {
  for (let x = 0; x <= 14; x++) {
    if (y === 16 || y === 15 || y === 17) continue; // keep road clear
    if (ground[y][x] !== ".") continue;
    const r = rnd();
    if (r < 0.16) objs[y][x] = "T";
    else if (r < 0.19) objs[y][x] = "%";
  }
}
// a few landmark oaks
for (const [ox, oy] of [[3, 4], [10, 20], [6, 11], [12, 2]] as const) {
  if (objs[oy][ox] === "") objs[oy][ox] = "O";
}
// scattered trees + flowers elsewhere
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (ground[y][x] !== "." || objs[y][x] !== "") continue;
    if (x <= 14 && y <= 23) continue; // forest handled above
    const r = rnd();
    if (x >= 44 && y <= 18) continue; // keep mine clear
    if (r < 0.028) objs[y][x] = "T";
    else if (r < 0.05) objs[y][x] = "%";
    else if (r < 0.08 && y > 20) objs[y][x] = "^";
  }
}

// --- Grublin Gully (northeast goblin camp) ---------------------------------
for (let y = 0; y <= 8; y++) {
  for (let x = 33; x <= 51; x++) {
    ground[y][x] = ",";
    objs[y][x] = "";
  }
}
objs[2][35] = "e";
objs[1][45] = "e";
objs[5][49] = "e";
objs[4][40] = "*"; // campfire at the heart of the camp

// --- the chicken coop (south-east meadow) ---------------------------------
for (let y = 18; y <= 23; y++) {
  for (let x = 31; x <= 41; x++) {
    if (ground[y][x] === ".") objs[y][x] = "";
  }
}
for (let x = 31; x <= 41; x++) {
  objs[18][x] = "=";
  objs[23][x] = "=";
}
for (let y = 19; y <= 22; y++) {
  objs[y][31] = "=";
  objs[y][41] = "=";
}
objs[21][31] = ""; // gate facing west
objs[19][39] = "c"; // the henhouse
objs[22][33] = "^";
objs[20][35] = "^";
objs[22][38] = "^";

// --- cow pasture (north) -------------------------------------------------
for (let x = 17; x <= 29; x++) {
  if (x !== 23) objs[3][x] = "=";
  if (x !== 23) objs[10][x] = "=";
}
for (let y = 4; y <= 9; y++) {
  objs[y][17] = "=";
  objs[y][29] = "=";
}
// pasture interior: clear stray objects
for (let y = 4; y <= 9; y++) for (let x = 18; x <= 28; x++) objs[y][x] = "";

// --- mine rocks -----------------------------------------------------------
const rock: [string, number, number][] = [
  ["R", 45, 10], ["R", 48, 9],
  ["S", 51, 9], ["S", 45, 13],
  ["I", 50, 12], ["I", 47, 12],
  ["C", 47, 15], ["C", 51, 15],
  ["G", 52, 11],
];
for (const [c, x, y] of rock) objs[y][x] = c;

// --- town fixtures --------------------------------------------------------
objs[14][21] = "F"; // furnace
objs[14][23] = "A"; // anvil
objs[14][27] = "B"; // bank booth
objs[19][29] = "*"; // campfire
objs[18][25] = "M"; // Roka the trader
objs[18][20] = "P"; // Old Maro

// --- fishing spots --------------------------------------------------------
objs[riverY(15)][15] = "f";
objs[riverY(40) + 2][40] = "t"; // southern edge of the river, reachable from the bank

export const SPAWN = { x: 24, y: 17 };
export const ENEMY_SPAWNS: { type: "goblin" | "brigand" | "cow" | "chicken"; x: number; y: number }[] = [
  { type: "goblin", x: 36, y: 3 }, { type: "goblin", x: 43, y: 3 },
  { type: "goblin", x: 37, y: 6 }, { type: "goblin", x: 44, y: 6 },
  { type: "brigand", x: 48, y: 2 }, { type: "brigand", x: 50, y: 6 },
  { type: "cow", x: 20, y: 6 }, { type: "cow", x: 25, y: 7 }, { type: "cow", x: 22, y: 8 },
  { type: "chicken", x: 33, y: 20 }, { type: "chicken", x: 36, y: 21 },
  { type: "chicken", x: 34, y: 22 }, { type: "chicken", x: 38, y: 22 },
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
  if (g === "~") return "the river";
  if (g === "b") return "the bridge";
  if (g === "#") return "Vale Square";
  if (g === "_") return "the riverbank";
  if (g === ",") return x >= 44 ? "Keldrek Mine" : "the road";
  if (y <= 11 && x >= 16 && x <= 30) return "the pasture";
  if (x <= 14) return "the Westwood";
  return "the meadow";
}
