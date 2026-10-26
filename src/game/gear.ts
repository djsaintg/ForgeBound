import type { ItemId } from "./types";

// Hand-drawn tool & weapon shapes, shared by the backpack icons (SVG) and the
// hero's in-hand sprite (canvas, via Path2D). Every shape is drawn upright in a
// 24×24 box — handle at the bottom, head at the top — and tinted per metal.

export type Metal = "bronze" | "iron" | "steel" | "mithril";
export type GearShape = "sword" | "dagger" | "axe" | "pick" | "rod" | "platebody" | "hammer" | "net" | "pan" | "club" | "staff";

interface Palette { L: string; M: string; D: string; G: string }

export const METALS: Record<Metal, Palette> = {
  bronze: { L: "#e8a868", M: "#b8743e", D: "#6e3c1e", G: "#ffe2bc" },
  iron: { L: "#c8ccd0", M: "#8a8f95", D: "#53575c", G: "#f4f6f8" },
  steel: { L: "#d6e2ee", M: "#93a6bd", D: "#55647a", G: "#eef6ff" },
  mithril: { L: "#9cb8ff", M: "#5172d6", D: "#2a3a84", G: "#e2eaff" },
};

// Colour tokens: L/M/D/G = the metal's light/mid/dark/glint, W/w = handle wood
// light/dark, K = leather grip. Anything else is a literal colour.
const WOOD: Record<string, string> = { W: "#8a5a30", w: "#5a3618", K: "#4a2e18" };
const OUTLINE = "#1c1814";

export interface GearPart {
  d: string;
  fill?: string;
  stroke?: string;
  w?: number;      // stroke width, in 24-box units
  op?: number;     // opacity
  bare?: boolean;  // a fill without the dark outline
  icon?: boolean;  // icon only (e.g. the rod's fishing line) — not drawn in hand
}

export interface GearDef {
  parts: GearPart[];
  grip: number;       // y of the hand on the handle
  iconScale: number;  // how much to enlarge the icon once turned diagonal
  upright?: boolean;  // icon stays upright instead of the 45° tilt
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

const handle = (top: number): GearPart[] => [
  { d: `M11.2 ${top} L12.8 ${top} L13 22.4 Q12 23.4 11 22.4 Z`, fill: "W" },
  { d: `M12.3 ${top + 2.5} L12.4 21`, stroke: "w", w: 0.4 },
];

export const GEAR: Record<GearShape, GearDef> = {
  axe: {
    grip: 19.5, iconScale: 1.05,
    parts: [
      ...handle(3.5),
      { d: "M9.6 4.4 L13.6 3.6 L15.4 4.8 Q19.6 3.4 21 8.4 Q19.6 13 15.4 11.6 L13.6 10.4 L9.6 9.6 Z", fill: "M" },
      { d: "M17.8 4.3 Q20.3 5.2 21 8.4 Q20.2 11.6 17.8 12.2 Q19 8.2 17.8 4.3 Z", fill: "L", bare: true },
      { d: "M10.6 5.2 L13 4.8 L13 9.2 L10.6 8.8 Z", fill: "D", op: 0.6, bare: true },
      { d: "M18.6 4.6 Q20.6 6.6 20.4 9.4", stroke: "G", w: 0.7, op: 0.9 },
    ],
  },
  pick: {
    grip: 19.5, iconScale: 1.2,
    parts: [
      ...handle(5),
      { d: "M2.6 8.6 Q6 3.4 12 3.2 Q18 3.4 21.4 8.6 Q18 6.2 13.6 6.4 L13.6 8 L10.4 8 L10.4 6.4 Q6 6.2 2.6 8.6 Z", fill: "M" },
      { d: "M4.4 6.6 Q8 3.8 12 3.8 Q16 3.8 19.6 6.6", stroke: "L", w: 0.9 },
      { d: "M10.2 2.6 L13.8 2.6 L13.8 8.6 L10.2 8.6 Z", fill: "D" },
      { d: "M5 6.4 Q7.6 4.6 10 4.2", stroke: "G", w: 0.5 },
    ],
  },
  sword: {
    grip: 19.4, iconScale: 1.22,
    parts: [
      { d: "M10.9 16 L10.9 3.6 L12 1.2 L13.1 3.6 L13.1 16 Z", fill: "L" },
      { d: "M12 1.6 L13 3.7 L13 15.9 L12 15.9 Z", fill: "M", bare: true },
      { d: "M12 4 L12 15", stroke: "D", w: 0.5 },
      { d: "M11.45 4.2 L11.45 9.5", stroke: "G", w: 0.4, op: 0.9 },
      { d: "M7.4 15.8 L16.6 15.8 L16.2 17.4 L7.8 17.4 Z", fill: "M" },
      { d: "M11.1 17.4 L12.9 17.4 L12.9 21.4 L11.1 21.4 Z", fill: "K" },
      { d: "M11.1 18.6 L12.9 19.2 M11.1 19.9 L12.9 20.5", stroke: "#2a1a0c", w: 0.4 },
      { d: circle(12, 22.3, 1.25), fill: "M" },
    ],
  },
  dagger: {
    grip: 18.9, iconScale: 1.45,
    parts: [
      { d: "M10.7 16 L10.7 9.6 L12 5.4 L13.3 9.6 L13.3 16 Z", fill: "L" },
      { d: "M12 5.8 L13.2 9.7 L13.2 15.9 L12 15.9 Z", fill: "M", bare: true },
      { d: "M11.3 9.6 L11.3 14", stroke: "G", w: 0.4, op: 0.9 },
      { d: "M8.6 15.8 L15.4 15.8 L15 17.1 L9 17.1 Z", fill: "M" },
      { d: "M11.1 17.1 L12.9 17.1 L12.9 20.6 L11.1 20.6 Z", fill: "K" },
      { d: "M11.1 18.2 L12.9 18.8 M11.1 19.4 L12.9 20", stroke: "#2a1a0c", w: 0.4 },
      { d: circle(12, 21.5, 1.1), fill: "M" },
    ],
  },
  rod: {
    grip: 18.5, iconScale: 1.22,
    parts: [
      { d: "M11.55 23 L12.45 23 L12.15 1.5 L11.85 1.5 Z", fill: "#5a3a1e" },
      { d: "M11 14.5 L13 14.5 L13 22 Q12 23 11 22 Z", fill: "#c8a070" },
      { d: "M11.4 16 L12.6 16 M11.4 20.5 L12.6 20.5", stroke: "#8a6a40", w: 0.4 },
      { d: circle(14.3, 17.6, 1.7), fill: "M" },
      { d: circle(14.3, 17.6, 0.6), fill: "D", bare: true },
      { d: "M12 11 L13 11 M12 6 L12.8 6", stroke: "M", w: 0.5 },
      { d: "M12 1.5 Q15.2 3.6 15.6 8.6 L15.6 12", stroke: "#ece6d4", w: 0.35, icon: true },
      { d: "M15.6 12 L16.8 13.6 L15.6 14.4 L14.4 13.6 Z", fill: "#d64545", bare: true, icon: true },
      { d: "M15.6 12.4 L16.2 13.6 L15.6 14 Z", fill: "#f0c858", bare: true, icon: true },
    ],
  },
  hammer: {
    grip: 19, iconScale: 1.3,
    parts: [
      ...handle(6.5),
      { d: "M7.4 2.6 L16.6 2.6 L16.6 7.6 L7.4 7.6 Z", fill: "M" },
      { d: "M14.8 2.8 L16.4 2.8 L16.4 7.4 L14.8 7.4 Z", fill: "L", bare: true },
      { d: "M8.2 3.4 L13.6 3.4", stroke: "G", w: 0.5, op: 0.8 },
    ],
  },
  net: {
    grip: 19.5, iconScale: 1.2,
    parts: [
      { d: "M11.4 9.4 L12.6 9.4 L12.6 23 L11.4 23 Z", fill: "W" },
      { d: circle(12, 5.4, 4.6), fill: "#d8cfb8", op: 0.18, bare: true },
      { d: "M8.3 2.6 L15.7 8.2 M8.3 8.2 L15.7 2.6 M12 0.8 L12 10 M7.4 5.4 L16.6 5.4", stroke: "#c8bea4", w: 0.35 },
      { d: circle(12, 5.4, 4.6), stroke: "#7a5a32", w: 0.8 },
    ],
  },
  pan: {
    grip: 19.5, iconScale: 1.2,
    parts: [
      { d: "M11.4 10 L12.6 10 L12.6 23 L11.4 23 Z", fill: "#3a3a3e" },
      { d: circle(12, 5.6, 5.2), fill: "D" },
      { d: circle(12, 5.6, 4), fill: "#26262a", bare: true },
      { d: "M10 4.6 Q12 3.4 14 5 Q13.4 7.4 11 7 Q9.6 6 10 4.6 Z", fill: "#c87a3a", bare: true },
    ],
  },
  club: {
    grip: 19.5, iconScale: 1.2,
    parts: [
      { d: "M11.3 11 L12.7 11 L12.9 22.6 Q12 23.4 11.1 22.6 Z", fill: "W" },
      { d: "M10.4 3 Q12 1.4 13.6 3 L14.4 11.4 Q12 13 9.6 11.4 Z", fill: "W" },
      { d: "M11 3.4 Q11.4 7 10.6 11", stroke: "w", w: 0.6 },
      { d: `${circle(11.2, 5.4, 0.6)} ${circle(13, 7.8, 0.6)} ${circle(11, 9.8, 0.6)}`, fill: "M" },
    ],
  },
  staff: {
    grip: 13, iconScale: 1, upright: true,
    parts: [
      { d: "M11.4 4.6 L12.6 4.6 L12.8 23 L11.2 23 Z", fill: "W" },
      { d: "M9.8 5.2 Q12 7.2 14.2 5.2", stroke: "w", w: 0.9 },
      { d: circle(12, 2.8, 2.4), fill: "#50ccff" },
      { d: circle(11.2, 2, 0.7), fill: "#e0f8ff", bare: true },
    ],
  },
  platebody: {
    grip: 12, iconScale: 1, upright: true,
    parts: [
      { d: "M7 4.2 L9.8 3 Q12 4.8 14.2 3 L17 4.2 L20.6 6.8 L19.4 12 L17.2 11.2 L17.2 19.6 Q12 21.4 6.8 19.6 L6.8 11.2 L4.6 12 L3.4 6.8 Z", fill: "M" },
      { d: "M9.8 3.2 Q11 4.4 12 4.7 L12 20.2 Q9 20.1 7 19.5 L7 11 L4.7 11.8 L3.6 6.9 L7.1 4.4 Z", fill: "L", op: 0.5, bare: true },
      { d: "M3.6 6.9 L7.1 4.4 L8 8 L4.4 9.6 Z M20.4 6.9 L16.9 4.4 L16 8 L19.6 9.6 Z", fill: "D", op: 0.55, bare: true },
      { d: "M12 5 L12 20.2", stroke: "D", w: 0.6 },
      { d: "M7.2 14.6 Q12 15.8 16.8 14.6 M7.2 17.2 Q12 18.4 16.8 17.2", stroke: "D", w: 0.5 },
      { d: "M9.8 3 Q12 4.8 14.2 3", stroke: "D", w: 0.6 },
      { d: `${circle(9, 8, 0.45)} ${circle(15, 8, 0.45)} ${circle(9, 12, 0.45)} ${circle(15, 12, 0.45)}`, fill: "G", op: 0.85, bare: true },
    ],
  },
};

/** Which hand-drawn shape and metal an item uses, or null for non-gear. */
export function gearFor(id: ItemId): { shape: GearShape; metal: Metal } | null {
  if (id === "fly_rod") return { shape: "rod", metal: "iron" };
  const m = /^(bronze|iron|steel|mithril)_(sword|dagger|axe|pick|platebody)$/.exec(id);
  return m ? { shape: m[2] as GearShape, metal: m[1] as Metal } : null;
}

export function gearColor(token: string | undefined, metal: Metal): string | undefined {
  if (!token) return undefined;
  return (METALS[metal] as unknown as Record<string, string>)[token] ?? WOOD[token] ?? token;
}

const pathCache = new Map<string, Path2D>();
const path2d = (d: string) => {
  let p = pathCache.get(d);
  if (!p) pathCache.set(d, (p = new Path2D(d)));
  return p;
};

/**
 * Draw a shape on the canvas held at (x, y): the grip sits on that point and
 * the head points along `angle` (0 = straight up, clockwise positive).
 * `len` is the on-screen length of the whole 24-unit box. `squash` scales
 * along the handle (negative flips it) to fake a swing seen side-on.
 */
export function drawGear(
  ctx: CanvasRenderingContext2D,
  shape: GearShape,
  metal: Metal,
  x: number,
  y: number,
  angle: number,
  len: number,
  squash = 1,
) {
  const def = GEAR[shape];
  const k = len / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(k, k * squash);
  ctx.translate(-12, -def.grip);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const p of def.parts) {
    if (p.icon) continue;
    const path = path2d(p.d);
    ctx.globalAlpha = p.op ?? 1;
    if (p.fill) {
      ctx.fillStyle = gearColor(p.fill, metal)!;
      ctx.fill(path);
      if (!p.bare) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 0.8;
        ctx.stroke(path);
      }
    }
    if (p.stroke) {
      ctx.strokeStyle = gearColor(p.stroke, metal)!;
      ctx.lineWidth = p.w ?? 0.6;
      ctx.stroke(path);
    }
  }
  ctx.restore();
}

/** Where the head end of a held shape is, for lines (fishing) and trails. */
export function gearTip(shape: GearShape, x: number, y: number, angle: number, len: number) {
  const reach = (GEAR[shape].grip - 1) * (len / 24);
  return { x: x + Math.sin(angle) * reach, y: y - Math.cos(angle) * reach };
}

export const GEAR_OUTLINE = OUTLINE;
