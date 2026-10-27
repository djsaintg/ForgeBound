// The Wider Realm's architecture: building walls, floors and roofs, the
// chapel and churchyard furniture, the crypt and the waygates. Drawn in the
// same hand as render.ts (per-tile noise, a soft drop shadow under every
// object), which calls in here for the tiles and objects it doesn't know.
import { BUILDINGS, bonfireTile, buildingAt, groundAt, insideOf, objAt, type Building, type SignGlyph } from "./map";

const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const shadow = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a = 0.4) => {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** Tiles this module draws, and the objects. */
export const VILLAGE_GROUND = new Set(["W", "p", "q", "d", "k", "w", " "]);
export const VILLAGE_OBJ = new Set(["Z", "n", "j", "e", "y", "D", "U", "s"]);

// ----------------------------------------------------------------- floors --

function planks(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, s: number) {
  const h = hash(x, y);
  ctx.fillStyle = `hsl(28, 38%, ${30 + h * 4}%)`;
  ctx.fillRect(px, py, s + 0.5, s + 0.5);
  const rows = 3;
  for (let i = 0; i < rows; i++) {
    const ry = py + (i * s) / rows;
    ctx.fillStyle = `hsl(${26 + ((i + x) % 3) * 3}, 40%, ${33 + hash(x, y * 3 + i) * 6}%)`;
    ctx.fillRect(px, ry + 1, s + 0.5, s / rows - 2);
    // staggered butt joints
    const jx = px + ((hash(x * 7 + i, y) * 0.8 + 0.1) * s);
    ctx.fillStyle = "rgba(30,16,6,0.45)";
    ctx.fillRect(jx, ry + 1, Math.max(1, s * 0.03), s / rows - 2);
  }
}

function flags(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, s: number, dark: boolean) {
  const h = hash(x, y);
  ctx.fillStyle = dark ? "#1c1e24" : "#4c4a46";
  ctx.fillRect(px, py, s + 0.5, s + 0.5);
  // two irregular slabs per tile, offset by row
  const split = (0.35 + hash(y, x) * 0.3) * s;
  const slabs: [number, number, number, number][] = (y % 2 === 0)
    ? [[0, 0, split, s], [split, 0, s - split, s]]
    : [[0, 0, s, s * 0.5], [0, s * 0.5, s, s * 0.5]];
  slabs.forEach(([sx, sy, w, hh], i) => {
    const l = dark ? 17 + hash(x + i, y) * 6 : 46 + hash(x + i, y) * 10;
    ctx.fillStyle = dark ? `hsl(220, 8%, ${l}%)` : `hsl(35, 8%, ${l}%)`;
    ctx.fillRect(px + sx + 1, py + sy + 1, w - 2, hh - 2);
  });
  if (dark && h > 0.7) {
    // moss in the cracks
    ctx.fillStyle = "rgba(70,100,50,0.35)";
    ctx.fillRect(px + h * s * 0.6, py + s * 0.48, s * 0.25, Math.max(1, s * 0.04));
  }
}

// ------------------------------------------------------------------ walls --

const isWallAt = (x: number, y: number) => {
  const c = groundAt(x, y);
  return c === "W" || c === "w";
};

function wall(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, s: number, kind: "timber" | "stone" | "crypt") {
  const h = hash(x, y);
  // A wall seen from above and a little south: a cap on top and, where
  // nothing walls it in from the south, a tall front face.
  const front = !isWallAt(x, y + 1);
  const capH = front ? s * 0.38 : s;
  if (kind === "crypt") {
    ctx.fillStyle = `hsl(220, 9%, ${13 + h * 5}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
    if (front) {
      ctx.fillStyle = `hsl(220, 10%, ${20 + h * 5}%)`;
      ctx.fillRect(px, py + capH, s + 0.5, s - capH + 0.5);
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ry = py + capH + ((s - capH) * i) / 3;
        ctx.beginPath(); ctx.moveTo(px, ry); ctx.lineTo(px + s, ry); ctx.stroke();
        const jx = px + ((i % 2) * 0.5 + 0.25) * s;
        ctx.beginPath(); ctx.moveTo(jx, ry); ctx.lineTo(jx, ry + (s - capH) / 3); ctx.stroke();
      }
    }
    return;
  }
  if (kind === "stone") {
    ctx.fillStyle = `hsl(32, 6%, ${50 + h * 8}%)`;
    ctx.fillRect(px, py, s + 0.5, capH + 0.5);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(px, py, s + 0.5, Math.max(1, s * 0.06));
    if (front) {
      ctx.fillStyle = `hsl(30, 7%, ${36 + h * 6}%)`;
      ctx.fillRect(px, py + capH, s + 0.5, s - capH + 0.5);
      ctx.strokeStyle = "rgba(20,16,12,0.45)";
      ctx.lineWidth = Math.max(1, s / 30);
      for (let i = 0; i < 3; i++) {
        const ry = py + capH + ((s - capH) * i) / 3;
        ctx.beginPath(); ctx.moveTo(px, ry); ctx.lineTo(px + s, ry); ctx.stroke();
        const jx = px + (((i + x) % 2) * 0.5 + 0.25) * s;
        ctx.beginPath(); ctx.moveTo(jx, ry); ctx.lineTo(jx, ry + (s - capH) / 3); ctx.stroke();
      }
    }
  } else {
    // Timber frame and lime plaster
    ctx.fillStyle = "#5a3a20";
    ctx.fillRect(px, py, s + 0.5, capH + 0.5);
    if (front) {
      ctx.fillStyle = `hsl(42, 38%, ${76 + h * 6}%)`;
      ctx.fillRect(px, py + capH, s + 0.5, s - capH + 0.5);
      ctx.fillStyle = "#5a3a20";
      ctx.fillRect(px, py + capH, s + 0.5, Math.max(2, s * 0.07));
      ctx.fillRect(px, py + s - Math.max(2, s * 0.07), s + 0.5, Math.max(2, s * 0.07));
      if (x % 2 === 0) {
        ctx.fillRect(px + s * 0.45, py + capH, Math.max(2, s * 0.08), s - capH);
      } else {
        // a diagonal brace
        ctx.strokeStyle = "#5a3a20";
        ctx.lineWidth = Math.max(2, s * 0.07);
        ctx.beginPath(); ctx.moveTo(px, py + s); ctx.lineTo(px + s, py + capH); ctx.stroke();
      }
    }
  }
  // A window in some outward-facing walls
  if (front && h > 0.55 && groundAt(x, y + 1) !== "d" && !isWallAt(x - 1, y + 1) && !isWallAt(x + 1, y + 1)) {
    const wx = px + s * 0.3, wy = py + capH + (s - capH) * 0.2, ww = s * 0.4, wh = (s - capH) * 0.55;
    const b = buildingAt(x, y);
    const glass = b?.roof === "chapel";
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
    if (glass) {
      // stained glass: four coloured panes
      const cols = ["#c03a3a", "#3a6ac0", "#d8b040", "#3a9a5a"];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cols[(i + x) % 4];
        ctx.fillRect(wx + (i % 2) * ww / 2, wy + Math.floor(i / 2) * wh / 2, ww / 2 - 0.5, wh / 2 - 0.5);
      }
    } else {
      ctx.fillStyle = "#e8c878";
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = "#2a1c10";
      ctx.fillRect(wx + ww / 2 - 0.5, wy, 1, wh);
      ctx.fillRect(wx, wy + wh / 2 - 0.5, ww, 1);
    }
  }
}

/** Ground for the new tiles; false when it's a tile this module doesn't own. */
export function drawVillageGround(ctx: CanvasRenderingContext2D, gch: string, x: number, y: number, px: number, py: number, s: number, is64: boolean): boolean {
  if (!VILLAGE_GROUND.has(gch)) return false;
  const b = gch === "W" || gch === "d" ? buildingAt(x, y) : null;
  if (!is64) {
    const h = hash(x, y);
    ctx.fillStyle = gch === "p" ? `hsl(28, 40%, ${32 + h * 5}%)`
      : gch === "q" ? `hsl(35, 6%, ${46 + h * 8}%)`
      : gch === "d" ? "#3a2614"
      : gch === "W" ? (b?.walls === "timber" ? "#d8c89a" : "#8a8580")
      : gch === "k" ? `hsl(220, 8%, ${20 + h * 5}%)`
      : gch === "w" ? "#2c2e36" : "#08080a";
    ctx.fillRect(px, py, s + 1, s + 1);
    return true;
  }
  if (gch === "p") planks(ctx, x, y, px, py, s);
  else if (gch === "q") flags(ctx, x, y, px, py, s, false);
  else if (gch === "k") flags(ctx, x, y, px, py, s, true);
  else if (gch === "W") wall(ctx, x, y, px, py, s, b?.walls ?? "stone");
  else if (gch === "w") wall(ctx, x, y, px, py, s, "crypt");
  else if (gch === "d") {
    // The doorway: the building's floor, a worn threshold and the door swung open
    if (b?.walls === "timber") planks(ctx, x, y, px, py, s); else flags(ctx, x, y, px, py, s, false);
    ctx.fillStyle = "rgba(40,24,10,0.55)";
    ctx.fillRect(px, py + s * 0.78, s + 0.5, s * 0.22);
    ctx.fillStyle = "#6a4422";
    ctx.fillRect(px + s * 0.04, py + s * 0.06, s * 0.12, s * 0.7);
  } else {
    // solid rock round the crypt
    const h = hash(x, y);
    ctx.fillStyle = `hsl(220, 10%, ${4 + h * 3}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
  }
  return true;
}

// --------------------------------------------------------------- objects --

function candle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number, seed: number) {
  ctx.fillStyle = "#efe6cf";
  ctx.fillRect(x - s * 0.022, y, s * 0.044, s * 0.11);
  const flick = Math.sin(time / 110 + seed) * s * 0.008;
  ctx.fillStyle = "rgba(255,200,80,0.35)";
  ctx.beginPath(); ctx.arc(x, y - s * 0.03, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffcc4a";
  ctx.beginPath(); ctx.ellipse(x + flick, y - s * 0.035, s * 0.018, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
}

function waygate(ctx: CanvasRenderingContext2D, cx: number, py: number, s: number, time: number) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 600);
  // rune circle on the ground
  const gy = py + s * 0.72;
  const glow = ctx.createRadialGradient(cx, gy, 1, cx, gy, s * 0.7);
  glow.addColorStop(0, `rgba(140,220,255,${0.35 + pulse * 0.2})`);
  glow.addColorStop(1, "rgba(120,160,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.ellipse(cx, gy, s * 0.7, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(170,235,255,${0.55 + pulse * 0.3})`;
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath(); ctx.ellipse(cx, gy, s * 0.42, s * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = time / 2400 + (i / 6) * Math.PI * 2;
    ctx.fillStyle = `rgba(210,245,255,${0.5 + pulse * 0.4})`;
    ctx.fillRect(cx + Math.cos(a) * s * 0.42 - 1, gy + Math.sin(a) * s * 0.18 - 1, 2.5, 2.5);
  }
  // three standing stones, the back one first
  const stones: [number, number, number][] = [[0, -0.06, 0.62], [-0.42, 0.06, 0.52], [0.42, 0.06, 0.52]];
  for (const [dx, dy, hgt] of stones) {
    const sx = cx + dx * s, base = gy + dy * s;
    shadow(ctx, sx, base, s * 0.12, s * 0.05, 0.45);
    const grad = ctx.createLinearGradient(sx - s * 0.1, 0, sx + s * 0.1, 0);
    grad.addColorStop(0, "#9a9890");
    grad.addColorStop(1, "#5a5852");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.1, base);
    ctx.lineTo(sx - s * 0.08, base - hgt * s);
    ctx.quadraticCurveTo(sx, base - hgt * s - s * 0.06, sx + s * 0.08, base - hgt * s);
    ctx.lineTo(sx + s * 0.1, base);
    ctx.closePath();
    ctx.fill();
    // a glowing rune
    ctx.fillStyle = `rgba(150,230,255,${0.5 + pulse * 0.5})`;
    ctx.fillRect(sx - s * 0.015, base - hgt * s * 0.7, s * 0.03, s * 0.14);
    ctx.fillRect(sx - s * 0.045, base - hgt * s * 0.62, s * 0.09, s * 0.025);
  }
}

function crypt(ctx: CanvasRenderingContext2D, cx: number, py: number, s: number) {
  // A low stone vault with a gabled front, sunk a step into the ground
  const w = s * 1.5, top = py - s * 0.3, base = py + s * 0.92;
  shadow(ctx, cx, base, w * 0.55, s * 0.12, 0.45);
  ctx.fillStyle = "#6c6a64";
  ctx.fillRect(cx - w / 2, top + s * 0.35, w, base - top - s * 0.35);
  // gable
  ctx.fillStyle = "#57554f";
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 - s * 0.06, top + s * 0.38);
  ctx.lineTo(cx, top);
  ctx.lineTo(cx + w / 2 + s * 0.06, top + s * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3e3c38";
  ctx.fillRect(cx - s * 0.03, top - s * 0.18, s * 0.06, s * 0.2);
  ctx.fillRect(cx - s * 0.09, top - s * 0.12, s * 0.18, s * 0.05);
  // block lines
  ctx.strokeStyle = "rgba(20,18,14,0.35)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const ry = top + s * 0.35 + ((base - top - s * 0.35) * i) / 4;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, ry); ctx.lineTo(cx + w / 2, ry); ctx.stroke();
  }
  // the dark arch with iron-bound doors
  const dw = s * 0.56, dh = s * 0.7;
  ctx.fillStyle = "#0c0a08";
  ctx.beginPath();
  ctx.moveTo(cx - dw / 2, base);
  ctx.lineTo(cx - dw / 2, base - dh + dw / 2);
  ctx.arc(cx, base - dh + dw / 2, dw / 2, Math.PI, 0);
  ctx.lineTo(cx + dw / 2, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a2616";
  ctx.fillRect(cx - dw / 2 + 2, base - dh * 0.72, dw / 2 - 3, dh * 0.72);
  ctx.fillRect(cx + 1, base - dh * 0.72, dw / 2 - 3, dh * 0.72);
  ctx.fillStyle = "#5a5a60";
  for (const fy of [0.55, 0.25]) ctx.fillRect(cx - dw / 2 + 2, base - dh * fy, dw - 4, Math.max(1.5, s * 0.03));
  ctx.fillStyle = "#c8a040";
  ctx.beginPath(); ctx.arc(cx, base - dh * 0.4, s * 0.025, 0, Math.PI * 2); ctx.fill();
}

/**
 * The square's bonfire, centred on the corner its four tiles share: a ring of
 * fieldstones, a teepee of split logs and a tall, layered fire throwing embers.
 */
function bonfire(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, time: number) {
  const ry = cy + s * 0.2;
  // scorched earth
  const scorch = ctx.createRadialGradient(cx, ry, s * 0.1, cx, ry, s * 0.95);
  scorch.addColorStop(0, "rgba(20,10,4,0.85)");
  scorch.addColorStop(1, "rgba(20,10,4,0)");
  ctx.fillStyle = scorch;
  ctx.beginPath(); ctx.ellipse(cx, ry, s * 0.95, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();

  const stones = 14;
  const stone = (i: number) => {
    const a = (i / stones) * Math.PI * 2;
    const sx = cx + Math.cos(a) * s * 0.78, sy = ry + Math.sin(a) * s * 0.48;
    const r = s * (0.11 + hash(i, 7) * 0.04);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(sx + 1, sy + r * 0.5, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `hsl(30, 5%, ${38 + hash(i, 3) * 18}%)`;
    ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.4, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  };
  // the far half of the ring sits behind the fire
  for (let i = 0; i < stones; i++) if (Math.sin((i / stones) * Math.PI * 2) < 0) stone(i);

  // a teepee of split logs
  const apex = { x: cx, y: ry - s * 0.62 };
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const bx = cx + Math.cos(a) * s * 0.5, by = ry + Math.sin(a) * s * 0.3;
    ctx.strokeStyle = i % 2 ? "#4a2c14" : "#5e3a1c";
    ctx.lineWidth = s * 0.1;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(apex.x + (bx - cx) * 0.12, apex.y); ctx.stroke();
  }
  // glowing coals
  const coals = ctx.createRadialGradient(cx, ry, 1, cx, ry, s * 0.55);
  coals.addColorStop(0, "rgba(255,200,90,0.95)");
  coals.addColorStop(0.5, "rgba(230,90,20,0.7)");
  coals.addColorStop(1, "rgba(120,30,0,0)");
  ctx.fillStyle = coals;
  ctx.beginPath(); ctx.ellipse(cx, ry, s * 0.55, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();

  // flames: three layers of licking tongues, deep orange out to a white-hot core
  const layers: [string, number, number][] = [["rgba(220,70,10,0.85)", 1.35, 0.55], ["rgba(255,150,30,0.9)", 1.05, 0.4], ["rgba(255,230,140,0.95)", 0.7, 0.24]];
  for (const [color, height, width] of layers) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const n = 5;
    ctx.moveTo(cx - width * s, ry);
    for (let i = 0; i <= n; i++) {
      const fx = cx - width * s + (i / n) * width * 2 * s;
      const tall = (1 - Math.abs(i / n - 0.5) * 1.4) * height * s;
      const lick = Math.sin(time / 140 + i * 1.9 + height * 5) * s * 0.1;
      const tipX = fx + Math.sin(time / 230 + i) * s * 0.06;
      ctx.quadraticCurveTo(fx - s * 0.05, ry - tall * 0.5, tipX, ry - tall - lick);
      ctx.quadraticCurveTo(fx + s * 0.06, ry - tall * 0.4, fx + (width * s) / n, ry - s * 0.05);
    }
    ctx.lineTo(cx + width * s, ry);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < stones; i++) if (Math.sin((i / stones) * Math.PI * 2) >= 0) stone(i);

  // embers drifting up
  for (let i = 0; i < 10; i++) {
    const ph = (time / 1600 + i * 0.137) % 1;
    const ex = cx + Math.sin(i * 2.1 + ph * 6) * s * 0.45 * ph + (hash(i, 1) - 0.5) * s * 0.4;
    const ey = ry - s * 0.4 - ph * s * 1.9;
    ctx.fillStyle = `rgba(255,${180 + Math.round(60 * (1 - ph))},90,${1 - ph})`;
    ctx.fillRect(ex, ey, Math.max(1.5, s * 0.03), Math.max(1.5, s * 0.03));
  }
}

/** Objects for the new tiles; false when it's one this module doesn't own. */
export function drawVillageObject(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, px: number, py: number, s: number, time: number, is64: boolean): boolean {
  if (ch === "*") {
    const part = bonfireTile(x, y);
    if (!part) return false; // a lone campfire: render.ts draws it
    if (part === "anchor") {
      if (is64) bonfire(ctx, px, py, s, time);
      else {
        ctx.fillStyle = "#ff7a1a";
        ctx.fillRect(px - s * 0.7, py - s * 0.7, s * 1.4, s * 1.4);
      }
    }
    return true;
  }
  if (!VILLAGE_OBJ.has(ch)) return false;
  const cx = px + s / 2;
  const h = hash(x, y);
  if (!is64) {
    ctx.fillStyle = ch === "Z" ? "#7ad8ff" : ch === "y" || ch === "s" || ch === "D" ? "#9a988f" : ch === "j" ? "#ffcc4a" : "#8a5a30";
    ctx.fillRect(px + s * 0.2, py + s * 0.2, s * 0.6, s * 0.6);
    return true;
  }
  switch (ch) {
    case "Z":
      waygate(ctx, cx, py, s, time);
      break;
    case "n": {
      // a pew seen from behind: seat and backrest, joining its neighbours
      const l = objAt(x - 1, y) === "n", r = objAt(x + 1, y) === "n";
      const x0 = px + (l ? 0 : s * 0.08), x1 = px + s - (r ? 0 : s * 0.08);
      shadow(ctx, cx, py + s * 0.82, s * 0.5, s * 0.08, 0.3);
      ctx.fillStyle = "#5a3818";
      ctx.fillRect(x0, py + s * 0.55, x1 - x0, s * 0.2);
      ctx.fillStyle = "#7a5028";
      ctx.fillRect(x0, py + s * 0.3, x1 - x0, s * 0.18);
      ctx.fillStyle = "rgba(255,220,160,0.15)";
      ctx.fillRect(x0, py + s * 0.3, x1 - x0, s * 0.04);
      if (!l) { ctx.fillStyle = "#4a2c12"; ctx.fillRect(x0, py + s * 0.28, s * 0.07, s * 0.52); }
      if (!r) { ctx.fillStyle = "#4a2c12"; ctx.fillRect(x1 - s * 0.07, py + s * 0.28, s * 0.07, s * 0.52); }
      break;
    }
    case "j": {
      shadow(ctx, cx, py + s * 0.86, s * 0.18, s * 0.06, 0.4);
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(cx - s * 0.025, py + s * 0.3, s * 0.05, s * 0.55);
      ctx.fillRect(cx - s * 0.14, py + s * 0.82, s * 0.28, s * 0.04);
      ctx.fillRect(cx - s * 0.16, py + s * 0.3, s * 0.32, s * 0.035);
      for (const dx of [-0.13, 0, 0.13]) candle(ctx, cx + dx * s, py + s * (dx === 0 ? 0.17 : 0.2), s, time, x * 3 + dx * 10);
      break;
    }
    case "e": {
      shadow(ctx, cx, py + s * 0.86, s * 0.42, s * 0.07, 0.3);
      ctx.fillStyle = "#4a2c12";
      ctx.fillRect(px + s * 0.08, py + s * 0.1, s * 0.84, s * 0.76);
      ctx.fillStyle = "#6a4420";
      for (const sy of [0.32, 0.58, 0.82]) ctx.fillRect(px + s * 0.08, py + s * sy, s * 0.84, s * 0.05);
      const goods = ["#c05a3a", "#3a7ac0", "#d8b040", "#8a9a5a", "#e8e0d0"];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = goods[Math.floor(hash(x * 5 + i, y) * goods.length)];
        const gx = px + s * (0.14 + (i % 3) * 0.26), gy = py + s * (i < 3 ? 0.17 : 0.43);
        ctx.fillRect(gx, gy, s * 0.14, s * 0.15);
      }
      break;
    }
    case "y": {
      shadow(ctx, cx, py + s * 0.82, s * 0.24, s * 0.07, 0.4);
      const tilt = (h - 0.5) * 0.12;
      ctx.save();
      ctx.translate(cx, py + s * 0.8);
      ctx.rotate(tilt);
      const grad = ctx.createLinearGradient(-s * 0.2, 0, s * 0.2, 0);
      grad.addColorStop(0, "#a8a69c");
      grad.addColorStop(1, "#6a6860");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, 0);
      ctx.lineTo(-s * 0.2, -s * 0.38);
      ctx.arc(0, -s * 0.38, s * 0.2, Math.PI, 0);
      ctx.lineTo(s * 0.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(40,36,30,0.5)";
      ctx.fillRect(-s * 0.02, -s * 0.5, s * 0.04, s * 0.22);
      ctx.fillRect(-s * 0.09, -s * 0.44, s * 0.18, s * 0.04);
      if (h > 0.5) { ctx.fillStyle = "rgba(80,120,60,0.6)"; ctx.fillRect(-s * 0.2, -s * 0.08, s * 0.16, s * 0.08); }
      ctx.restore();
      if (h < 0.3) {
        ctx.fillStyle = "#e85a70";
        ctx.beginPath(); ctx.arc(cx + s * 0.22, py + s * 0.82, s * 0.04, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case "D":
      crypt(ctx, cx, py, s);
      break;
    case "U": {
      // steps climbing north toward a grey wash of daylight
      for (let i = 0; i < 5; i++) {
        const l = 18 + i * 7;
        ctx.fillStyle = `hsl(220, 6%, ${l}%)`;
        ctx.fillRect(px + s * 0.08, py + s * (0.8 - i * 0.16), s * 0.84, s * 0.16);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(px + s * 0.08, py + s * (0.8 - i * 0.16), s * 0.84, Math.max(1, s * 0.025));
      }
      const day = ctx.createLinearGradient(0, py - s * 0.2, 0, py + s * 0.5);
      day.addColorStop(0, "rgba(220,230,240,0.5)");
      day.addColorStop(1, "rgba(220,230,240,0)");
      ctx.fillStyle = day;
      ctx.fillRect(px + s * 0.08, py - s * 0.2, s * 0.84, s * 0.7);
      break;
    }
    case "s": {
      shadow(ctx, cx, py + s * 0.86, s * 0.46, s * 0.08, 0.45);
      ctx.fillStyle = "#4a4a50";
      ctx.fillRect(px + s * 0.06, py + s * 0.3, s * 0.88, s * 0.55);
      ctx.fillStyle = "#6a6a72";
      ctx.fillRect(px + s * 0.03, py + s * 0.22, s * 0.94, s * 0.2);
      // the carved sleeper on the lid
      ctx.fillStyle = "#7c7c84";
      ctx.beginPath(); ctx.arc(px + s * 0.2, py + s * 0.31, s * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px + s * 0.28, py + s * 0.26, s * 0.55, s * 0.1);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(px + s * 0.06, py + s * 0.42, s * 0.88, Math.max(1, s * 0.03));
      break;
    }
  }
  return true;
}

/** Candle stands and altars light the dark round them. */
export const isCandleLight = (ch: string) => ch === "j";

// ----------------------------------------------------------------- roofs --

/** Each roof's opacity, eased toward 0 while the hero is inside. */
const roofAlpha = new Map<string, number>();
let lastRoofT = 0;

const ROOF: Record<Building["roof"], { lit: string; shade: string; line: string; ridge: string }> = {
  slate: { lit: "#5a6070", shade: "#3c4250", line: "rgba(20,24,34,0.55)", ridge: "#2a2e3a" },
  thatch: { lit: "#c8a058", shade: "#9a763a", line: "rgba(90,60,20,0.55)", ridge: "#7a5a28" },
  tile: { lit: "#b8583a", shade: "#8a3e28", line: "rgba(60,20,10,0.5)", ridge: "#5a2818" },
  chapel: { lit: "#4e5868", shade: "#323a48", line: "rgba(14,18,26,0.6)", ridge: "#20242e" },
};

function signGlyph(ctx: CanvasRenderingContext2D, glyph: SignGlyph, cx: number, cy: number, r: number) {
  ctx.fillStyle = "#1a140c";
  ctx.strokeStyle = "#1a140c";
  ctx.lineWidth = Math.max(1, r * 0.18);
  switch (glyph) {
    case "anvil":
      ctx.fillRect(cx - r * 0.6, cy - r * 0.35, r * 1.2, r * 0.32);
      ctx.fillRect(cx - r * 0.18, cy - r * 0.05, r * 0.36, r * 0.32);
      ctx.fillRect(cx - r * 0.45, cy + r * 0.25, r * 0.9, r * 0.2);
      break;
    case "coin":
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillRect(cx - r * 0.08, cy - r * 0.3, r * 0.16, r * 0.6);
      break;
    case "bag":
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.12, r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - r * 0.2, cy - r * 0.55, r * 0.4, r * 0.3);
      break;
    case "guide":
      ctx.font = `bold ${Math.round(r * 1.3)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", cx, cy + r * 0.05);
      break;
    case "star":
      ctx.fillStyle = "#d8b25c";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r * 0.7 : r * 0.25;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.fill();
      break;
  }
}

function roof(ctx: CanvasRenderingContext2D, b: Building, sx: number, sy: number, s: number, time: number, smoke: (x: number, y: number) => void) {
  const st = ROOF[b.roof];
  const lift = s * 0.55; // roofs stand above the walls
  const eave = s * 0.14;
  const x0 = b.x0 * s - sx - eave, x1 = (b.x1 + 1) * s - sx + eave;
  const y0 = b.y0 * s - sy - lift, y1 = (b.y1 + 1) * s - sy - s * 0.25;
  const mid = y0 + (y1 - y0) * 0.45;
  // shadow cast on the ground to the south-east
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x0 + s * 0.2, y1, x1 - x0, s * 0.3);
  // back (north, sunlit) and front (south, shaded) slopes
  ctx.fillStyle = st.lit;
  ctx.fillRect(x0, y0, x1 - x0, mid - y0);
  ctx.fillStyle = st.shade;
  ctx.fillRect(x0, mid, x1 - x0, y1 - mid);
  // courses of slate, tile or straw
  ctx.strokeStyle = st.line;
  ctx.lineWidth = Math.max(1, s / 28);
  const step = b.roof === "thatch" ? s * 0.18 : s * 0.24;
  for (let y = y0 + step; y < y1 - 1; y += step) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    if (b.roof !== "thatch") {
      const off = Math.round((y - y0) / step) % 2 ? step * 0.5 : 0;
      for (let x = x0 + off; x < x1; x += step * 1.1) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.min(y1, y + step)); ctx.stroke();
      }
    } else {
      for (let x = x0; x < x1; x += s * 0.09) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.03, y + step * 0.8); ctx.stroke();
      }
    }
  }
  // ridge and gable ends
  ctx.fillStyle = st.ridge;
  ctx.fillRect(x0, mid - s * 0.06, x1 - x0, s * 0.12);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x0, y0, s * 0.08, y1 - y0);
  ctx.fillRect(x1 - s * 0.08, y0, s * 0.08, y1 - y0);
  // eave edge
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x0, y1 - s * 0.06, x1 - x0, s * 0.06);

  if (b.chimney) {
    const cx = x1 - s * 1.1, cy = y0 + s * 0.15;
    ctx.fillStyle = "#6a625a";
    ctx.fillRect(cx, cy, s * 0.36, s * 0.5);
    ctx.fillStyle = "#3e3832";
    ctx.fillRect(cx - s * 0.04, cy, s * 0.44, s * 0.08);
    if (Math.random() < 0.08) smoke(cx + s * 0.18, cy);
  }
  if (b.roof === "chapel") {
    // a bell tower over the door end, topped with the star of the dawn
    const tx = (x0 + x1) / 2, ty = y1 - s * 1.6;
    ctx.fillStyle = "#6c6a64";
    ctx.fillRect(tx - s * 0.5, ty, s, s * 1.3);
    ctx.fillStyle = "#1a1612";
    ctx.beginPath();
    ctx.moveTo(tx - s * 0.22, ty + s * 0.75);
    ctx.lineTo(tx - s * 0.22, ty + s * 0.4);
    ctx.arc(tx, ty + s * 0.4, s * 0.22, Math.PI, 0);
    ctx.lineTo(tx + s * 0.22, ty + s * 0.75);
    ctx.fill();
    const swing = Math.sin(time / 1400) * 0.15;
    ctx.save();
    ctx.translate(tx, ty + s * 0.28);
    ctx.rotate(swing);
    ctx.fillStyle = "#c89a40";
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.36); ctx.quadraticCurveTo(-s * 0.1, s * 0.05, 0, s * 0.05);
    ctx.quadraticCurveTo(s * 0.1, s * 0.05, s * 0.12, s * 0.36); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = st.shade;
    ctx.beginPath();
    ctx.moveTo(tx - s * 0.62, ty); ctx.lineTo(tx, ty - s * 0.9); ctx.lineTo(tx + s * 0.62, ty); ctx.closePath(); ctx.fill();
    signGlyph(ctx, "star", tx, ty - s * 1.05, s * 0.3);
  }
}

/** Every door on screen gets its sign, whether or not the roof is showing. */
function sign(ctx: CanvasRenderingContext2D, b: Building, sx: number, sy: number, s: number, alpha: number) {
  if (!b.sign || b.roof === "chapel") return;
  // the first doorway along the building's wall line
  let door: { x: number; y: number } | null = null;
  for (let y = b.y0; y <= b.y1 && !door; y++) for (let x = b.x0; x <= b.x1; x++) if (groundAt(x, y) === "d") { door = { x, y }; break; }
  if (!door) return;
  const south = door.y === b.y1;
  const cx = (door.x + 1.5) * s - sx;
  const cy = south ? door.y * s - sy + s * 0.15 : door.y * s - sy - s * 0.3;
  const r = s * 0.24;
  ctx.save();
  ctx.globalAlpha = Math.max(0.85, alpha);
  ctx.strokeStyle = "#2a1c10";
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 1.3); ctx.lineTo(cx - r * 0.6, cy - r); ctx.moveTo(cx + r * 0.6, cy - r * 1.3); ctx.lineTo(cx + r * 0.6, cy - r); ctx.stroke();
  ctx.fillStyle = "#8a5a2c";
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e8d6a8";
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
  signGlyph(ctx, b.sign, cx, cy, r * 0.75);
  ctx.restore();
}

/**
 * Roofs over every building on screen, drawn above everything inside them.
 * The one the hero stands in fades away so they can see in.
 */
export function drawRoofs(ctx: CanvasRenderingContext2D, heroX: number, heroY: number, sx: number, sy: number, s: number, w: number, h: number, time: number, is64: boolean, smoke: (x: number, y: number) => void) {
  const dt = Math.min(100, time - lastRoofT);
  lastRoofT = time;
  const inside = insideOf(Math.round(heroX), Math.round(heroY));
  for (const b of BUILDINGS) {
    const target = inside === b ? 0 : 1;
    let a = roofAlpha.get(b.id) ?? target;
    a += (target - a) * Math.min(1, dt / 160);
    roofAlpha.set(b.id, a);
    const left = b.x0 * s - sx - s, right = (b.x1 + 1) * s - sx + s;
    const top = b.y0 * s - sy - s * 2.6, bottom = (b.y1 + 1) * s - sy + s;
    if (right < 0 || left > w || bottom < 0 || top > h) continue;
    if (a > 0.02) {
      ctx.save();
      ctx.globalAlpha = a;
      if (is64) roof(ctx, b, sx, sy, s, time, smoke);
      else {
        ctx.fillStyle = ROOF[b.roof].shade;
        ctx.fillRect(b.x0 * s - sx, b.y0 * s - sy - s * 0.4, (b.x1 - b.x0 + 1) * s, (b.y1 - b.y0 + 1) * s);
      }
      ctx.restore();
    }
    if (is64) sign(ctx, b, sx, sy, s, a);
  }
}

/** Roof colour for the minimap. */
export const roofColor = (b: Building) => ROOF[b.roof].shade;
