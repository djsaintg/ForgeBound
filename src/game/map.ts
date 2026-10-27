/**
 * The realm's tile map, assembled once at load.
 *
 * Since v0.5.0 the world is built from regions, each authored in its own
 * local coordinates and stamped onto the grid at an origin:
 *   - Greyhallow (west): the chapel, its churchyard and the crypt door
 *   - The Vale (centre): the village square, pasture, coop, Westwood,
 *     Grublin Gully and Keldrek Mine, laid out at ~2.2× the old valley's
 *     spacing (≈5× the area)
 *   - The Greyhallow Crypt: an underground level in its own band below the
 *     southern mountains, reached only by its stairs
 * A slim mountain rim seals the surface; the minimap is a hero-centred radar,
 * so no padding is needed to keep it off playable ground.
 */

export const TILE = 32;

/** Mountain rim around the surface. */
export const PADDING = 3;

const WEST_W = 34; // Greyhallow
const VALE_W = 124;
const CORE_W = WEST_W + VALE_W;
const CORE_H = 80;

/** Origins (top-left, world tiles) of each region's local coordinates. */
const GREY = { x: PADDING, y: PADDING };
const VALE = { x: PADDING + WEST_W, y: PADDING };
/** The underground band starts below the southern rim. */
export const UNDER_Y = PADDING * 2 + CORE_H;
const CRYPT = { x: PADDING + 2, y: UNDER_Y + 1 };
const CRYPT_W = 40;
const CRYPT_H = 18;

export const MAP_W = CORE_W + PADDING * 2;
export const MAP_H = CRYPT.y + CRYPT_H + 1;

// ground chars: . grass  , dirt  # stone  _ sand  b bridge  ~ water  m mountain
//               W building wall  p plank floor  q flagstone floor  d doorway
//               k crypt floor  w crypt wall  (space) solid rock around the crypt
// obj chars:    T tree  O oak  % flowers  ^ tall grass  = fence
//               R copper  S tin  I iron  C coal  G gold
//               F furnace  A anvil  B bank booth  * campfire
//               f shrimp spot  t trout spot
//               M Roka  P Old Maro  K Hesta the teller  Q Brother Cael
//               H goblin hut  V goblin totem banner  c chicken roost  h hay bale
//               L altar  Z waygate  n pew  j candle stand  e shelves
//               y gravestone  D crypt door  U crypt stairs  s sarcophagus

const WALK_GROUND = new Set([".", ",", "#", "_", "b", "p", "q", "d", "k"]);
const BLOCK_OBJ = new Set([
  "T", "O", "R", "S", "I", "C", "G", "F", "A", "B", "*", "M", "P", "K", "Q", "=", "H", "V", "c", "h", "L",
  "Z", "n", "j", "e", "y", "D", "U", "s",
]);

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
  ground.push(new Array(MAP_W).fill(y >= UNDER_Y ? " " : "."));
  objs.push(new Array(MAP_W).fill(""));
}

const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;

/** Drawing helpers for one region, in its local coordinates. */
function region(o: { x: number; y: number }) {
  const g = (x: number, y: number, c: string) => { if (inMap(o.x + x, o.y + y)) ground[o.y + y][o.x + x] = c; };
  const ob = (x: number, y: number, c: string) => { if (inMap(o.x + x, o.y + y)) objs[o.y + y][o.x + x] = c; };
  const gAt = (x: number, y: number) => (inMap(o.x + x, o.y + y) ? ground[o.y + y][o.x + x] : "");
  const oAt = (x: number, y: number) => (inMap(o.x + x, o.y + y) ? objs[o.y + y][o.x + x] : "");
  const rect = (x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => void) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y);
  };
  /** A road tile: dirt over grass, leaving stone and bridges alone. */
  const road = (x: number, y: number) => { const c = gAt(x, y); if (c !== "#" && c !== "b" && c !== "") g(x, y, ","); };
  const at = (x: number, y: number) => ({ x: o.x + x, y: o.y + y });
  return { g, ob, gAt, oAt, rect, road, at };
}

// ------------------------------------------------------------ buildings --

export type RoofStyle = "slate" | "thatch" | "tile" | "chapel";
export type SignGlyph = "anvil" | "coin" | "bag" | "guide" | "star";

export interface Building {
  id: string;
  name: string;
  /** Outer walls, world tiles, inclusive. */
  x0: number; y0: number; x1: number; y1: number;
  roof: RoofStyle;
  /** Wall material: timber-framed plaster or dressed stone. */
  walls: "timber" | "stone";
  sign?: SignGlyph;
  chimney?: boolean;
}

export const BUILDINGS: Building[] = [];

/**
 * Raise a building: walls round the outside, a floor within and doorways in
 * the wall line. Anything that was standing on the footprint is cleared.
 */
function raise(r: ReturnType<typeof region>, b: Omit<Building, "x0" | "y0" | "x1" | "y1">,
  x0: number, y0: number, x1: number, y1: number, floor: "p" | "q", doors: [number, number][]) {
  r.rect(x0, y0, x1, y1, (x, y) => {
    r.ob(x, y, "");
    r.g(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? "W" : floor);
  });
  for (const [x, y] of doors) r.g(x, y, "d");
  const a = r.at(x0, y0), z = r.at(x1, y1);
  BUILDINGS.push({ ...b, x0: a.x, y0: a.y, x1: z.x, y1: z.y });
}

/** The building whose footprint (walls included) covers a tile. */
export function buildingAt(x: number, y: number): Building | null {
  for (const b of BUILDINGS) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b;
  return null;
}

/** The building the hero is inside: on its floor or standing in its doorway. */
export function insideOf(x: number, y: number): Building | null {
  const b = buildingAt(x, y);
  if (!b) return null;
  const c = ground[y]?.[x];
  return c === "p" || c === "q" || c === "d" ? b : null;
}

// ------------------------------------------------------------ the river --
// Runs the full width of the surface, from the western peaks to the eastern
// ones, through Greyhallow and the Vale. `cx` is a core column (0 = west edge).
const riverY = (cx: number) => Math.round(57 + 4.4 * Math.sin((cx - WEST_W) / 15.4));
{
  const core = region({ x: PADDING, y: PADDING });
  for (let cx = 0; cx < CORE_W; cx++) {
    const ry = riverY(cx);
    for (let dy = 0; dy <= 4; dy++) core.g(cx, ry + dy, "~");
    core.g(cx, ry - 1, "_");
    core.g(cx, ry + 5, "_");
    // a ragged second row of sand here and there
    if (rnd() < 0.45) core.g(cx, ry - 2, "_");
    if (rnd() < 0.45) core.g(cx, ry + 6, "_");
  }
}

// The surface rim: impassable mountains
for (let y = 0; y < UNDER_Y; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (x < PADDING || x >= CORE_W + PADDING || y < PADDING || y >= CORE_H + PADDING) ground[y][x] = "m";
  }
}

// ============================================================== the Vale ==
const V = region(VALE);
const vRiver = (x: number) => riverY(x + WEST_W);

/** Hand-placed Vale features, kept for tileName and the spawn tables. */
const VR = {
  plaza: [42, 28, 66, 46],
  pasture: [37, 7, 64, 22],
  coop: [70, 38, 84, 49],
  gully: [77, 3, 114, 23],
  mine: [97, 24, 117, 37],
  westwood: [0, 0, 31, 52],
} as const;
const inV = (r: readonly [number, number, number, number], x: number, y: number) =>
  x >= VALE.x + r[0] && x <= VALE.x + r[2] && y >= VALE.y + r[1] && y <= VALE.y + r[3];

// Roads: the west road runs right through Greyhallow, the square and on to the mine
V.rect(0, 35, 97, 36, V.road);
V.rect(53, 46, 54, 75, V.road); // south to the bridge and beyond
V.rect(88, 18, 89, 36, V.road); // north to Grublin Gully
V.rect(84, 18, 97, 19, V.road);

// Bridge
for (const bx of [53, 54]) {
  const ry = vRiver(bx);
  for (let y = ry - 2; y <= ry + 6; y++) V.g(bx, y, "b");
}

// Vale Square
V.rect(42, 28, 66, 46, (x, y) => V.g(x, y, "#"));

// Keldrek Mine floor
V.rect(97, 18, 117, 37, (x, y) => V.g(x, y, ","));

// Grublin Gully
V.rect(79, 4, 112, 22, (x, y) => V.g(x, y, ","));
for (const [x, y] of [[81, 7], [95, 7], [108, 9], [103, 15], [82, 16], [100, 4]]) V.ob(x, y, "H");
for (const [x, y] of [[80, 11], [99, 11], [111, 17]]) V.ob(x, y, "V");
V.ob(90, 11, "*");

// Chicken coop, its gate on the north side facing the road (Old Maro's hut
// stands close by its west fence)
V.rect(70, 38, 84, 49, (x, y) => {
  if (x === 70 || x === 84 || y === 38 || y === 49) {
    if (!(y === 38 && (x === 76 || x === 77))) V.ob(x, y, "=");
  } else if (V.gAt(x, y) === ".") V.g(x, y, "_");
});
V.ob(81, 40, "c");
for (const x of [79, 81, 82]) V.ob(x, 47, "h");

// Westwood
V.rect(0, 0, 31, 52, (x, y) => {
  if (y >= 33 && y <= 38) return; // keep the road clear
  if (V.gAt(x, y) !== ".") return;
  const r = rnd();
  if (r < 0.16) V.ob(x, y, "T");
  else if (r < 0.19) V.ob(x, y, "%");
});
for (const [x, y] of [[7, 9], [22, 44], [13, 24], [26, 4], [4, 46], [18, 15], [29, 27]]) V.ob(x, y, "O");

// Scattered trees and flowers across the open meadow
V.rect(0, 0, VALE_W - 1, CORE_H - 1, (x, y) => {
  const wx = VALE.x + x, wy = VALE.y + y;
  if (V.gAt(x, y) !== "." || V.oAt(x, y) !== "") return;
  if (inV(VR.westwood, wx, wy) || inV(VR.gully, wx, wy) || inV(VR.pasture, wx, wy)) return;
  if (x >= 95 && y <= 39) return; // around the mine
  if (x >= 68 && x <= 86 && y >= 36 && y <= 51) return; // around the coop
  if (x >= 37 && x <= 70 && y >= 23 && y <= 50) return; // around the square
  if (y >= 33 && y <= 38) return; // the west road
  const r = rnd();
  if (r < 0.028) V.ob(x, y, "T");
  else if (r < 0.05) V.ob(x, y, "%");
  else if (r < 0.08 && y > 46) V.ob(x, y, "^");
});

// Cow pasture, gates north and south
V.rect(37, 7, 64, 22, (x, y) => {
  const edge = x === 37 || x === 64 || y === 7 || y === 22;
  V.ob(x, y, edge && !((y === 7 || y === 22) && (x === 50 || x === 51)) ? "=" : "");
});

// Keldrek Mine rocks
const ROCKS: [string, number, number][] = [
  ["R", 99, 26], ["R", 106, 24], ["R", 101, 29],
  ["S", 112, 24], ["S", 99, 33], ["S", 108, 28],
  ["I", 110, 31], ["I", 103, 31], ["I", 106, 34],
  ["C", 103, 35], ["C", 112, 35], ["C", 115, 32],
  ["G", 114, 28], ["G", 116, 36],
];
for (const [c, x, y] of ROCKS) V.ob(x, y, c);

// Fishing spots
for (const x of [33, 62]) V.ob(x, vRiver(x), "f");
for (const x of [88, 104]) V.ob(x, vRiver(x) + 4, "t"); // the fast water by the south bank

// --- The village: buildings round the square ---------------------------------
// One building on each corner, set back diagonally so roughly half of it
// stands out on the grass and its two inner walls face the stone. The smithy
// and the bank face south across the street; the trading post and Old Maro's
// hut face north. The bonfire burns in the middle of the square.
raise(V, { id: "smithy", name: "the Smithy", roof: "slate", walls: "stone", sign: "anvil", chimney: true },
  41, 26, 49, 31, "q", [[45, 31], [46, 31]]);
V.ob(43, 28, "F");
V.ob(47, 28, "A");

raise(V, { id: "bank", name: "the Bank of ForgeBound", roof: "slate", walls: "stone", sign: "coin" },
  59, 26, 67, 31, "q", [[63, 31]]);
for (let x = 60; x <= 66; x++) V.ob(x, 29, "B");
V.ob(63, 28, "K");

raise(V, { id: "trading_post", name: "Roka's Trading Post", roof: "tile", walls: "timber", sign: "bag" },
  40, 43, 47, 48, "p", [[43, 43], [44, 43]]);
V.ob(43, 46, "M");
for (const x of [41, 42, 45, 46]) V.ob(x, 47, "e");

raise(V, { id: "maro_hut", name: "Old Maro's Hut", roof: "thatch", walls: "timber", sign: "guide", chimney: true },
  63, 42, 68, 47, "p", [[65, 42]]);
V.ob(66, 45, "P");
V.ob(67, 43, "e");

// The bonfire: four tiles of one big fire, cookable from any side
V.rect(54, 37, 55, 38, (x, y) => V.ob(x, y, "*"));
V.ob(54, 30, "Z"); // waygate

// ============================================================ Greyhallow ==
const G = region(GREY);

G.rect(10, 35, WEST_W - 1, 36, G.road);
G.rect(11, 31, 13, 34, G.road); // chapel path
G.rect(26, 17, 27, 34, G.road); // churchyard path to the crypt

// Churchyard: a fenced plot of graves, gate to the south
G.rect(21, 14, 32, 30, (x, y) => {
  if (x === 21 || x === 32 || y === 14 || y === 30) {
    if (!(y === 30 && (x === 26 || x === 27))) G.ob(x, y, "=");
  }
});
for (const y of [19, 22, 25, 28]) for (const x of [23, 24, 29, 30]) G.ob(x, y, "y");
G.ob(26, 16, "D");
G.ob(31, 16, "T");
G.ob(22, 15, "%");

// Open country: a few trees, flowers and long grass
G.rect(0, 0, WEST_W - 1, CORE_H - 1, (x, y) => {
  if (G.gAt(x, y) !== "." || G.oAt(x, y) !== "") return;
  if (x >= 4 && x <= 33 && y >= 12 && y <= 38) return; // chapel, churchyard and road
  const r = rnd();
  if (r < 0.06) G.ob(x, y, "T");
  else if (r < 0.09) G.ob(x, y, "%");
  else if (r < 0.13 && y > 46) G.ob(x, y, "^");
});

raise(G, { id: "chapel", name: "Greyhallow Chapel", roof: "chapel", walls: "stone", sign: "star" },
  6, 15, 18, 30, "q", [[11, 30], [12, 30], [13, 30]]);
G.ob(12, 17, "L");
for (const x of [9, 15]) G.ob(x, 16, "j");
for (const y of [21, 23, 25, 27]) for (const x of [8, 9, 10, 14, 15, 16]) G.ob(x, y, "n");
G.ob(10, 18, "Q");
G.ob(17, 33, "Z");

// ========================================================== the crypt ==
const K = region(CRYPT);
K.rect(0, 0, CRYPT_W - 1, CRYPT_H - 1, (x, y) => K.g(x, y, "w"));
const carve = (x0: number, y0: number, x1: number, y1: number) => K.rect(x0, y0, x1, y1, (x, y) => K.g(x, y, "k"));
carve(1, 5, 8, 12);   // stair hall
carve(9, 8, 14, 9);   // passage
carve(15, 2, 28, 15); // burial chamber
carve(29, 8, 31, 9);  // passage
carve(32, 4, 38, 13); // the sanctum
K.ob(2, 8, "U");
for (const [x, y] of [[1, 5], [8, 5], [1, 12], [8, 12], [15, 2], [28, 2], [15, 15], [28, 15], [32, 4], [38, 4], [32, 13], [38, 13]]) K.ob(x, y, "j");
for (const x of [17, 20, 23, 26]) { K.ob(x, 3, "s"); K.ob(x, 14, "s"); }
K.ob(35, 5, "L");

// ============================================================== exports ==

export const SPAWN = V.at(51, 36);

/** Where creatures may wander, world tiles inclusive. */
export interface Pen { x0: number; y0: number; x1: number; y1: number }
const pen = (r: ReturnType<typeof region>, x0: number, y0: number, x1: number, y1: number): Pen => {
  const a = r.at(x0, y0), b = r.at(x1, y1);
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
};
export const inPen = (p: Pen, x: number, y: number) => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1;

export const COW_PEN = pen(V, 38, 8, 63, 21);
export const COOP_PEN = pen(V, 71, 39, 83, 48);
export const COW_SPAWNS = [[42, 12], [48, 15], [55, 11], [60, 17], [45, 19], [57, 14]].map(([x, y]) => V.at(x, y));
export const CHICKEN_SPAWNS = [[73, 42], [76, 44], [79, 41], [74, 46], [78, 45], [82, 43]].map(([x, y]) => V.at(x, y));
/** The coop's starter egg, lying in the straw. */
export const STARTER_EGG = V.at(76, 43);

export type HumanoidFoe = "goblin" | "brigand" | "restless" | "warden";
export interface FoeSpawn { x: number; y: number; foe: HumanoidFoe; home: Pen }

const WARRIOR_HOME = pen(V, 79, 5, 106, 21);
const BRIGAND_HOME = pen(V, 104, 4, 114, 21);
const CHAMBER = pen(K, 16, 4, 27, 13);
const SANCTUM = pen(K, 33, 6, 37, 12);
/** Grublin Gully's goblins and the crypt's dead: everything that fights back on two legs. */
export const FOE_SPAWNS: FoeSpawn[] = [
  ...[[86, 11], [92, 9], [99, 13], [90, 15], [84, 13], [96, 17], [104, 6]].map(([x, y]) => ({ ...V.at(x, y), foe: "goblin" as const, home: WARRIOR_HOME })),
  ...[[110, 6], [108, 18], [113, 13]].map(([x, y]) => ({ ...V.at(x, y), foe: "brigand" as const, home: BRIGAND_HOME })),
  ...[[18, 8], [21, 10], [24, 7], [26, 10], [20, 6]].map(([x, y]) => ({ ...K.at(x, y), foe: "restless" as const, home: CHAMBER })),
  { ...K.at(35, 9), foe: "warden", home: SANCTUM },
];

/** The crypt door in the churchyard, and the tile in front of it. */
export const CRYPT_DOOR = G.at(26, 16);
export const CRYPT_DOOR_OUT = G.at(26, 17);
/** The stairs back up, and where the hero arrives at the foot of them. */
export const CRYPT_STAIRS = K.at(2, 8);
export const CRYPT_ARRIVE = K.at(3, 8);

export type GateId = "vale" | "greyhallow" | "keldrek";
export interface Gate { id: GateId; name: string; x: number; y: number }
/** Waygates: step up to one to attune it, then travel between any you've attuned. */
export const GATES: Gate[] = [
  { id: "vale", name: "Vale Square", ...V.at(54, 30) },
  { id: "greyhallow", name: "Greyhallow", ...G.at(17, 33) },
  { id: "keldrek", name: "Keldrek Mine", ...V.at(100, 37) },
];
V.ob(100, 37, "Z");

/** Where a tile sits in a 2×2 bonfire: its bottom-right tile draws the fire, the rest are part of it. */
export function bonfireTile(x: number, y: number): "anchor" | "part" | null {
  if (objAt(x, y) !== "*") return null;
  for (const [ax, ay] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) {
    if (objAt(ax - 1, ay) === "*" && objAt(ax, ay - 1) === "*" && objAt(ax - 1, ay - 1) === "*" && objAt(ax, ay) === "*") {
      return ax === x && ay === y ? "anchor" : "part";
    }
  }
  return null;
}

/** Is a tile part of the underground level (the crypt and the rock round it)? */
export const isUnderground = (_x: number, y: number) => y >= UNDER_Y;

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

/** The nearest walkable tile to x,y (itself if it's walkable), searching outward. */
export function nearestWalkable(x: number, y: number, maxR = 8): { x: number; y: number } | null {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (walkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

/**
 * Saves from before v0.5.0 store tiles on the old 72×52 map (an 8-tile
 * mountain band round a 56×36 valley). The valley was scaled up by 2.2 each
 * way, so a spot maps to the same place in the new Vale, nudged onto the
 * nearest walkable tile.
 */
export function migrateOldTile(x: number, y: number): { x: number; y: number } {
  const cx = Math.max(0, Math.min(55, x - 8));
  const cy = Math.max(0, Math.min(35, y - 8));
  const p = { x: VALE.x + Math.round(cx * 2.2), y: VALE.y + Math.round(cy * 2.2) };
  return nearestWalkable(p.x, p.y) ?? SPAWN;
}

export function tileName(x: number, y: number): string {
  if (isUnderground(x, y)) return x >= CRYPT.x + 32 ? "the Crypt Sanctum" : "the Greyhallow Crypt";
  const inside = insideOf(x, y);
  if (inside) return inside.name;
  const g = groundAt(x, y);
  if (g === "m") return "the mountain range";
  if (g === "~") return "the river";
  if (g === "b") return "the bridge";
  if (x < VALE.x) {
    if (g === "_") return "the riverbank";
    if (x >= GREY.x + 21 && x <= GREY.x + 32 && y >= GREY.y + 14 && y <= GREY.y + 30) return "Greyhallow Churchyard";
    return "Greyhallow";
  }
  if (g === "#" || g === "W") return "Vale Square";
  if (inV(VR.coop, x, y)) return "the Chicken Coop";
  if (g === "_") return "the riverbank";
  if (inV(VR.gully, x, y)) return "Grublin Gully";
  if (g === ",") return inV(VR.mine, x, y) ? "Keldrek Mine" : "the road";
  if (inV(VR.pasture, x, y)) return "the pasture";
  if (inV(VR.westwood, x, y)) return "the Westwood";
  return "the meadow";
}
