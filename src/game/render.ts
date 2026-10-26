import { MAP_W, MAP_H, TILE, groundAt, objAt } from "./map";
import type { ChickenEnt, CowEnt, GameState, GoblinEnt, ItemId } from "./types";
import { drawFigure, dirFrom, type Dir, type Look } from "./figure";
import { drawChicken, drawCow } from "./creatures";
import { BURY_MS, STRIKES, dayCycle, emote, jobOf, strikesDone, toolFor, type Job } from "./anim";
import { METALS, type GearShape } from "./gear";
import { GROUND_ITEM_MS, GROUND_ITEM_WARN_MS } from "./data";
import { npcMarker, type NpcMarker } from "./quests";

export interface Cam {
  x: number;
  y: number;
}

export interface ClickFlag {
  x: number;
  y: number;
  t0: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}
const particles: Particle[] = [];

export function spawnParticles(x: number, y: number, count: number, color: string, speed = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (Math.random() * 0.8 + 0.3) * speed;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 0.3,
      color,
      size: Math.random() * 3 + 1.5,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015,
    });
  }
}

const hash = (x: number, y: number) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const ORE_COLORS: Record<string, string> = {
  R: "#e2864d",
  S: "#dee3ec",
  I: "#a05a30",
  C: "#2a2b34",
  G: "#ffcf33",
};

const ROCK_NAME: Record<string, string> = {
  R: "Copper",
  S: "Tin",
  I: "Iron",
  C: "Coal",
  G: "Gold",
};

// On-screen tile size in whole pixels. Every caller (render, camera, clamp,
// click-picking) must use this so the drawn grid and the maths agree.
export function tileSize(zoom: number): number {
  return Math.round(TILE * (zoom || 2.2));
}

export function clampCam(cam: Cam, w: number, h: number, zoom: number): Cam {
  const effTile = tileSize(zoom);
  const mapW = MAP_W * effTile;
  const mapH = MAP_H * effTile;
  
  if (mapW <= w) cam.x = mapW / 2;
  else cam.x = Math.max(w / 2, Math.min(mapW - w / 2, cam.x));
  
  if (mapH <= h) cam.y = mapH / 2;
  else cam.y = Math.max(h / 2, Math.min(mapH - h / 2, cam.y));
  
  return cam;
}

// --- 8-Bit Legacy Render Helpers ---
function render8BitGround(ctx: CanvasRenderingContext2D, gch: string, x: number, y: number, px: number, py: number, s: number) {
  const h = hash(x, y);
  if (gch === ".") ctx.fillStyle = `hsl(${100 + h * 15}, 40%, ${30 + h * 5}%)`;
  else if (gch === "#") ctx.fillStyle = `hsl(0, 0%, ${50 + h * 15}%)`;
  else if (gch === ",") ctx.fillStyle = `hsl(28, 45%, ${33 + h * 6}%)`;
  else if (gch === "_") ctx.fillStyle = `hsl(44, 65%, ${65 + h * 8}%)`;
  else if (gch === "b") ctx.fillStyle = `hsl(25, 55%, ${36 + h * 5}%)`;
  else if (gch === "~") ctx.fillStyle = "#2c6499";
  else if (gch === "m") ctx.fillStyle = `hsl(215, 8%, ${34 + h * 14}%)`;
  else ctx.fillStyle = "#1b2024";
  ctx.fillRect(px, py, s + 1, s + 1);
  if (gch === "m") {
    ctx.fillStyle = "#dfe5ea";
    ctx.fillRect(px + s * 0.35, py + s * 0.2, s * 0.3, s * 0.2);
  }
}

// --- 64-Bit HD Remastered Terrain Rendering ---
function render64BitGround(ctx: CanvasRenderingContext2D, gch: string, x: number, y: number, px: number, py: number, s: number, time: number) {
  const h = hash(x, y);
  const h2 = hash(y * 11, x * 17);
  
  if (gch === ".") {
    const baseLight = 26 + h * 8 + Math.sin(time / 2000 + x * 0.5) * 1.5;
    ctx.fillStyle = `hsl(${105 + h * 18}, ${38 + h * 12}%, ${baseLight}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);

    if (s > 20 && h > 0.3) {
      ctx.fillStyle = `rgba(30, 80, 20, 0.25)`;
      const tufts = 2 + Math.floor(h2 * 3);
      for (let i = 0; i < tufts; i++) {
        const tx = px + ((h * (i + 3) * 13) % (s * 0.7)) + s * 0.15;
        const ty = py + ((h2 * (i + 5) * 17) % (s * 0.7)) + s * 0.15;
        const sway = Math.sin(time / 600 + x + y + i) * (s * 0.04);
        ctx.beginPath();
        ctx.moveTo(tx - sway, ty - s * 0.15);
        ctx.lineTo(tx - s * 0.06, ty);
        ctx.lineTo(tx + s * 0.06, ty);
        ctx.fillStyle = `hsl(${112 + h * 10}, 50%, ${33 + i * 4}%)`;
        ctx.fill();
      }
    }
  } else if (gch === "#") {
    ctx.fillStyle = `hsl(215, 8%, ${36 + h * 6}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
    ctx.strokeStyle = "rgba(10, 15, 25, 0.45)";
    ctx.lineWidth = Math.max(1, s / 24);
    ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(px + 2, py + 2, s - 4, s * 0.25);
  } else if (gch === ",") {
    ctx.fillStyle = `hsl(28, ${42 + h * 8}%, ${30 + h * 7}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
    if (s > 24) {
      const pCount = 1 + Math.floor(h2 * 4);
      for (let i = 0; i < pCount; i++) {
        const px2 = px + ((h * (i + 1) * 23) % (s * 0.8)) + s * 0.1;
        const py2 = py + ((h2 * (i + 2) * 29) % (s * 0.8)) + s * 0.1;
        ctx.fillStyle = `rgba(30, 20, 15, 0.4)`;
        ctx.beginPath();
        ctx.arc(px2, py2 + 1, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsl(32, 20%, ${45 + (i % 3) * 8}%)`;
        ctx.beginPath();
        ctx.arc(px2, py2, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gch === "_") {
    const wetness = Math.sin(time / 1000 + x * 0.8) * 4;
    ctx.fillStyle = `hsl(42, ${62 + h * 10}%, ${62 + h * 6 + wetness * 0.2}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
  } else if (gch === "b") {
    ctx.fillStyle = `hsl(25, 48%, ${30 + h * 4}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
    const planks = 4;
    const pHeight = s / planks;
    for (let i = 0; i < planks; i++) {
      const pyP = py + i * pHeight;
      ctx.fillStyle = i % 2 === 0 ? `hsl(27, 52%, ${34 + h * 3}%)` : `hsl(24, 46%, ${28 + h * 3}%)`;
      ctx.fillRect(px + 1, pyP + 1, s - 2, pHeight - 2);
      ctx.fillStyle = "#828994";
      ctx.fillRect(px + s * 0.1, pyP + pHeight * 0.4, s * 0.06, s * 0.06);
      ctx.fillRect(px + s * 0.84, pyP + pHeight * 0.4, s * 0.06, s * 0.06);
    }
  } else if (gch === "~") {
    const flow = (time / 800 + x * 0.5 + y * 0.3) % (Math.PI * 2);
    const wave = Math.sin(flow) * 4;
    ctx.fillStyle = `hsl(205, ${68 + Math.sin(flow) * 10}%, ${28 + wave * 0.8 + h * 5}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);
    
    ctx.strokeStyle = `rgba(180, 230, 255, ${0.15 + Math.sin(flow) * 0.08})`;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    const ry = py + s * 0.4 + Math.sin(flow * 2) * (s * 0.1);
    ctx.moveTo(px + s * 0.1, ry);
    ctx.quadraticCurveTo(px + s * 0.5, ry - s * 0.1, px + s * 0.9, ry);
    ctx.stroke();
  } else if (gch === "m") {
    // --- Border mountain range: rocky base, faceted peak, snow cap ---
    // Rocky scree base so the ridge reads as continuous between tiles.
    ctx.fillStyle = `hsl(212, 10%, ${20 + h * 6}%)`;
    ctx.fillRect(px, py, s + 0.5, s + 0.5);

    const peakX = px + s * (0.28 + h * 0.44);
    const peakY = py + s * (0.02 + h2 * 0.3);
    const baseY = py + s + 0.5;

    // Sunlit left face
    ctx.fillStyle = `hsl(210, 12%, ${40 + h * 9}%)`;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.12, baseY);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(peakX, baseY);
    ctx.closePath();
    ctx.fill();

    // Shadowed right face
    ctx.fillStyle = `hsl(216, 14%, ${24 + h * 5}%)`;
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(px + s * 1.12, baseY);
    ctx.lineTo(peakX, baseY);
    ctx.closePath();
    ctx.fill();

    // Ridge-line highlight
    ctx.strokeStyle = `rgba(220, 228, 235, ${0.18 + h * 0.1})`;
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(px - s * 0.12, baseY);
    ctx.lineTo(peakX, peakY);
    ctx.stroke();

    // Jagged snow cap on taller peaks
    if (h2 > 0.22) {
      const snowH = s * (0.14 + h2 * 0.14);
      ctx.fillStyle = "#e9edf1";
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX - s * 0.11, peakY + snowH);
      ctx.lineTo(peakX - s * 0.04, peakY + snowH * 0.66);
      ctx.lineTo(peakX + s * 0.03, peakY + snowH * 0.94);
      ctx.lineTo(peakX + s * 0.12, peakY + snowH * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    // Faint mist pooling in the valleys
    const mist = (Math.sin(time / 2600 + x * 0.7) + 1) / 2;
    ctx.fillStyle = `rgba(205, 216, 220, ${0.05 + mist * 0.06})`;
    ctx.fillRect(px, py + s * 0.72, s + 0.5, s * 0.3);
  }
}

// --- Ground Item Renderer ---
function drawGroundItem64(ctx: CanvasRenderingContext2D, item: ItemId, cx: number, cy: number, s: number, time: number) {
  const hover = Math.sin(time / 250 + cx) * 2;
  ctx.fillStyle = item === "coins" || item === "egg" || item.includes("bronze") ? "rgba(255, 215, 0, 0.35)" : "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.25, s * 0.18, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  if (item === "egg") {
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + hover, s * 0.09, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === "coins") {
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(cx - 3, cy + hover, s * 0.07, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy + hover + 2, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === "bones") {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(cx - s * 0.1, cy - 2 + hover, s * 0.2, s * 0.06);
    ctx.beginPath();
    ctx.arc(cx - s * 0.1, cy - 3 + hover, 3, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.1, cy - 3 + hover, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === "raw_beef" || item === "raw_chicken") {
    ctx.fillStyle = item === "raw_beef" ? "#991b1b" : "#fca5a5";
    ctx.beginPath();
    ctx.ellipse(cx, cy + hover, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx + s * 0.06, cy + hover, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.arc(cx, cy + hover, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- RS3 Health Bar Renderer ---
function drawHPBar(ctx: CanvasRenderingContext2D, cx: number, cy: number, hp: number, maxHp: number, s: number) {
  if (hp >= maxHp) return;
  const barW = s * 0.7;
  const barH = Math.max(5, s * 0.1);
  const px = cx - barW / 2;
  const py = cy - s * 0.45;

  ctx.fillStyle = "#1e1e24";
  ctx.fillRect(px - 1, py - 1, barW + 2, barH + 2);

  ctx.fillStyle = "#dc2626";
  ctx.fillRect(px, py, barW, barH);

  const pct = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(px, py, barW * pct, barH);
}

// --- Mining rocks ---------------------------------------------------------
// A faceted boulder, a little different on every tile: lit top face, shaded
// flank, cracks, ore crystals set into the stone and rubble at its foot.
// Emptied rocks sink to a low, bare rubble mound until they respawn.
const ROCK_TONES: Record<string, [string, string, string]> = {
  R: ["#8a7c6c", "#665a4e", "#40372f"],
  S: ["#959590", "#6c6c68", "#454542"],
  I: ["#7e6e62", "#5c4e44", "#3a302a"],
  C: ["#5e5a58", "#43403f", "#282625"],
  G: ["#8c8070", "#675c50", "#40382f"],
};

function drawOreRock(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, cx: number, py: number, s: number, time: number, depleted: boolean) {
  const [light, mid, dark] = ROCK_TONES[ch] ?? ROCK_TONES.R;
  const r = (i: number) => hash(x * 7 + i, y * 13 - i); // stable per-tile randomness
  const base = py + s * 0.8;
  const height = depleted ? 0.16 : 0.44 + r(1) * 0.1;
  const width = depleted ? 0.36 : 0.36 + r(2) * 0.06;
  const bcx = cx + (r(3) - 0.5) * s * 0.06;

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(bcx, base, s * (width + 0.04), s * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outline: a jittered dome — flat-ish base, lumpy shoulders, an off-centre peak
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.PI + (i / n) * Math.PI; // left base → over the top → right base
    const jit = i === 0 || i === n ? 0 : (r(10 + i) - 0.5) * 0.1;
    const peak = 1 + Math.max(0, 1 - Math.abs(i / n - (0.35 + r(4) * 0.3)) * 4) * 0.12;
    pts.push([bcx + Math.cos(t) * s * (width + jit * 0.5), base + Math.sin(t) * s * (height * peak + jit)]);
  }
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.quadraticCurveTo(bcx, base + s * 0.06, pts[0][0], pts[0][1]);
    ctx.closePath();
  };
  outline();
  ctx.fillStyle = mid;
  ctx.fill();
  ctx.strokeStyle = "#1c1814";
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke();

  ctx.save();
  outline();
  ctx.clip();
  // Lit top face (upper-left) and shaded right flank
  const ridge = pts[Math.floor(n * (0.45 + r(5) * 0.2))];
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1] - s * height * 0.35);
  for (const p of pts.slice(1, Math.floor(n * 0.6) + 1)) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(ridge[0] + s * 0.02, ridge[1] + s * height * 0.45);
  ctx.lineTo(bcx - s * width * 0.6, base - s * height * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(ridge[0] + s * 0.02, ridge[1] + s * height * 0.45);
  for (const p of pts.slice(Math.floor(n * 0.7))) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(bcx + s * width, base + s * 0.05);
  ctx.lineTo(bcx, base + s * 0.05);
  ctx.closePath();
  ctx.fill();
  // Grounded base shading
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(bcx - s * width, base - s * 0.05, s * width * 2, s * 0.12);

  if (!depleted) {
    // Cracks
    ctx.strokeStyle = "rgba(20,16,12,0.7)";
    ctx.lineWidth = Math.max(1, s * 0.012);
    for (let i = 0; i < 2; i++) {
      const sx = bcx + (r(20 + i) - 0.5) * s * width * 1.2;
      const sy = base - s * height * (0.55 + r(22 + i) * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (r(24 + i) - 0.5) * s * 0.12, sy + s * 0.08);
      ctx.lineTo(sx + (r(26 + i) - 0.5) * s * 0.16, sy + s * 0.15);
      ctx.stroke();
    }
    // Ore crystals set into the stone: faceted chips with a lit edge
    const vein = ORE_COLORS[ch] ?? "#ffffff";
    const count = 4 + Math.floor(r(30) * 3);
    for (let i = 0; i < count; i++) {
      const ox = bcx + (r(31 + i) - 0.5) * s * width * 1.5;
      const oy = base - s * height * (0.2 + r(41 + i) * 0.6);
      const k = s * (0.04 + r(51 + i) * 0.035);
      ctx.fillStyle = vein;
      ctx.beginPath();
      ctx.moveTo(ox - k, oy);
      ctx.lineTo(ox - k * 0.2, oy - k * 0.9);
      ctx.lineTo(ox + k, oy - k * 0.3);
      ctx.lineTo(ox + k * 0.4, oy + k * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(20,16,12,0.8)";
      ctx.lineWidth = Math.max(0.75, s * 0.008);
      ctx.stroke();
      ctx.fillStyle = ch === "C" ? "rgba(170,180,210,0.55)" : "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(ox - k * 0.7, oy - k * 0.1);
      ctx.lineTo(ox - k * 0.2, oy - k * 0.75);
      ctx.lineTo(ox, oy - k * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    if (ch === "G") {
      // Gold catches the light now and then
      const tw = (Math.sin(time / 300 + x * 3 + y) + 1) / 2;
      if (tw > 0.8) {
        const gx = bcx + (r(60) - 0.5) * s * width, gy = base - s * height * 0.6;
        ctx.strokeStyle = `rgba(255,248,200,${(tw - 0.8) * 5})`;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(gx - s * 0.05, gy); ctx.lineTo(gx + s * 0.05, gy);
        ctx.moveTo(gx, gy - s * 0.05); ctx.lineTo(gx, gy + s * 0.05);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // Rubble at the foot
  for (let i = 0; i < 4; i++) {
    const rx = bcx + (r(70 + i) - 0.5) * s * (width * 2 + 0.15);
    const ry = base + s * (0.02 + r(80 + i) * 0.06);
    const rr = s * (0.025 + r(90 + i) * 0.025);
    ctx.fillStyle = i % 2 ? mid : dark;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rr * 1.3, rr, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- 64-Bit Object Renderers ---
function drawObject64(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, px: number, py: number, s: number, time: number, depleted: boolean) {
  const h = hash(x, y);
  const cx = px + s / 2;
  const cy = py + s / 2;

  if (depleted) {
    if (ch === "T" || ch === "O") {
      // Felled tree: stump + toppled trunk + scattered sawdust until regrowth
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.28, py + s * 0.82, s * 0.34, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Toppled trunk lying to the side
      const logG = ctx.createLinearGradient(0, py + s * 0.68, 0, py + s * 0.86);
      logG.addColorStop(0, "#7a532e");
      logG.addColorStop(1, "#4a2f18");
      ctx.fillStyle = logG;
      ctx.save();
      ctx.translate(cx + s * 0.3, py + s * 0.77);
      ctx.rotate(-0.12);
      ctx.fillRect(-s * 0.32, -s * 0.07, s * 0.64, s * 0.14);
      ctx.restore();
      // Cut end with growth rings
      ctx.fillStyle = "#b48b57";
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.62, py + s * 0.73, s * 0.06, s * 0.08, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a6238";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.62, py + s * 0.73, s * 0.03, s * 0.04, -0.12, 0, Math.PI * 2);
      ctx.stroke();

      // Stump
      ctx.fillStyle = "#3e2716";
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.12, py + s * 0.78, s * 0.2, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b48b57";
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.12, py + s * 0.72, s * 0.16, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a6238";
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.12, py + s * 0.72, s * 0.08, s * 0.045, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sawdust specks
      ctx.fillStyle = "rgba(222, 190, 130, 0.8)";
      for (let i = 0; i < 5; i++) {
        const dx = ((h * (i + 3) * 37) % (s * 0.9)) - s * 0.45;
        const dy = ((h * (i + 5) * 53) % (s * 0.3)) + s * 0.72;
        ctx.fillRect(cx + dx, py + dy, s * 0.03, s * 0.03);
      }
    } else if (ORE_COLORS[ch]) {
      drawOreRock(ctx, ch, x, y, cx, py, s, time, true);
    }
    return;
  }

  if (ch === "H") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.85, s * 0.42, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    const tentGrad = ctx.createRadialGradient(cx, py + s * 0.4, s * 0.1, cx, py + s * 0.5, s * 0.45);
    tentGrad.addColorStop(0, "#8a5d3b");
    tentGrad.addColorStop(0.7, "#593820");
    tentGrad.addColorStop(1, "#362010");
    ctx.fillStyle = tentGrad;
    ctx.beginPath();
    ctx.moveTo(cx, py + s * 0.12);
    ctx.lineTo(cx + s * 0.42, py + s * 0.85);
    ctx.lineTo(cx - s * 0.42, py + s * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#140b05";
    ctx.beginPath();
    ctx.moveTo(cx, py + s * 0.48);
    ctx.lineTo(cx + s * 0.16, py + s * 0.85);
    ctx.lineTo(cx - s * 0.16, py + s * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#e8e1cf";
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, py + s * 0.75);
    ctx.quadraticCurveTo(cx - s * 0.25, py + s * 0.5, cx - s * 0.1, py + s * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, py + s * 0.75);
    ctx.quadraticCurveTo(cx + s * 0.25, py + s * 0.5, cx + s * 0.1, py + s * 0.4);
    ctx.stroke();

  } else if (ch === "V") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.85, s * 0.2, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5c4028";
    ctx.fillRect(cx - s * 0.04, py + s * 0.1, s * 0.08, s * 0.75);

    ctx.fillStyle = "#eae6dc";
    ctx.beginPath();
    ctx.arc(cx, py + s * 0.14, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.fillRect(cx - s * 0.04, py + s * 0.12, s * 0.025, s * 0.03);
    ctx.fillRect(cx + s * 0.015, py + s * 0.12, s * 0.025, s * 0.03);

    const wave = Math.sin(time / 250 + x) * (s * 0.05);
    ctx.fillStyle = "#a82828";
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.04, py + s * 0.2);
    ctx.lineTo(cx + s * 0.4 + wave, py + s * 0.25);
    ctx.lineTo(cx + s * 0.35 - wave, py + s * 0.42);
    ctx.lineTo(cx + s * 0.04, py + s * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(cx + s * 0.18 + wave * 0.5, py + s * 0.32, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

  } else if (ch === "c") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(px + s * 0.15, py + s * 0.25, s * 0.7, s * 0.6);
    ctx.fillStyle = "#8a5830";
    ctx.fillRect(px + s * 0.15, py + s * 0.35, s * 0.7, s * 0.45);
    ctx.fillStyle = "#5c371b";
    ctx.fillRect(px + s * 0.1, py + s * 0.2, s * 0.8, s * 0.2);
    ctx.fillStyle = "#261306";
    ctx.beginPath();
    ctx.arc(cx, py + s * 0.6, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ecc848";
    ctx.fillRect(cx - s * 0.12, py + s * 0.7, s * 0.24, s * 0.06);

  } else if (ch === "h") {
    // --- Square hay bale: cuboid straw block bound with twine ---
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.06, py + s * 0.82, s * 0.38, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    const x0 = px + s * 0.14;
    const y0 = py + s * 0.46;
    const bw = s * 0.54;
    const bh = s * 0.34;
    const dxx = s * 0.18; // depth skew right
    const dyy = -s * 0.13; // depth skew up

    // Right (shadowed) face
    const sideG = ctx.createLinearGradient(x0 + bw, 0, x0 + bw + dxx, 0);
    sideG.addColorStop(0, "#b98a1a");
    sideG.addColorStop(1, "#8a6210");
    ctx.fillStyle = sideG;
    ctx.beginPath();
    ctx.moveTo(x0 + bw, y0);
    ctx.lineTo(x0 + bw + dxx, y0 + dyy);
    ctx.lineTo(x0 + bw + dxx, y0 + dyy + bh);
    ctx.lineTo(x0 + bw, y0 + bh);
    ctx.closePath();
    ctx.fill();

    // Top (sunlit) face
    const topG = ctx.createLinearGradient(0, y0 + dyy, 0, y0);
    topG.addColorStop(0, "#fde68a");
    topG.addColorStop(1, "#e8c34a");
    ctx.fillStyle = topG;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dxx, y0 + dyy);
    ctx.lineTo(x0 + bw + dxx, y0 + dyy);
    ctx.lineTo(x0 + bw, y0);
    ctx.closePath();
    ctx.fill();

    // Front face
    const frontG = ctx.createLinearGradient(0, y0, 0, y0 + bh);
    frontG.addColorStop(0, "#f2cf5e");
    frontG.addColorStop(0.55, "#dcae2c");
    frontG.addColorStop(1, "#b9861a");
    ctx.fillStyle = frontG;
    ctx.fillRect(x0, y0, bw, bh);

    // Vertical straw striations on the front
    ctx.strokeStyle = "rgba(120, 84, 16, 0.4)";
    ctx.lineWidth = Math.max(1, s * 0.015);
    for (let i = 1; i < 6; i++) {
      const lx = x0 + (bw / 6) * i + Math.sin(i * 3.7) * s * 0.01;
      ctx.beginPath();
      ctx.moveTo(lx, y0 + s * 0.02);
      ctx.lineTo(lx + Math.sin(i) * s * 0.012, y0 + bh - s * 0.02);
      ctx.stroke();
    }
    // A few straw lines on the top face too
    ctx.strokeStyle = "rgba(146, 102, 18, 0.35)";
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(x0 + bw * t, y0);
      ctx.lineTo(x0 + bw * t + dxx, y0 + dyy);
      ctx.stroke();
    }

    // Twine binding straps (front + wrap over the top)
    ctx.strokeStyle = "#6b4a14";
    ctx.lineWidth = Math.max(1.5, s * 0.045);
    for (const t of [0.28, 0.7]) {
      const sx2 = x0 + bw * t;
      ctx.beginPath();
      ctx.moveTo(sx2, y0 + bh);
      ctx.lineTo(sx2, y0);
      ctx.lineTo(sx2 + dxx, y0 + dyy);
      ctx.stroke();
    }

    // Crisp edge outline
    ctx.strokeStyle = "rgba(60, 40, 8, 0.5)";
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.strokeRect(x0, y0, bw, bh);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dxx, y0 + dyy);
    ctx.lineTo(x0 + bw + dxx, y0 + dyy);
    ctx.lineTo(x0 + bw, y0);
    ctx.moveTo(x0 + bw, y0 + bh);
    ctx.lineTo(x0 + bw + dxx, y0 + dyy + bh);
    ctx.lineTo(x0 + bw + dxx, y0 + dyy);
    ctx.stroke();

    // Loose straw wisps poking out of the top
    ctx.strokeStyle = "#f7dd7a";
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (let i = 0; i < 4; i++) {
      const wx = x0 + dxx * 0.5 + bw * (0.15 + i * 0.22);
      const wy = y0 + dyy * 0.5;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.sin(i * 2.3) * s * 0.05, wy - s * (0.06 + (i % 2) * 0.04));
      ctx.stroke();
    }

  } else if (ch === "T" || ch === "O") {
    const isOak = ch === "O";
    const sway = Math.sin(time / 800 + x + y) * (s * 0.04);
    
    ctx.fillStyle = "rgba(10, 25, 10, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.82, s * (isOak ? 0.38 : 0.28), s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    const trunkW = s * (isOak ? 0.22 : 0.14);
    const trunkH = s * (isOak ? 0.45 : 0.38);
    const trunkGrate = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
    trunkGrate.addColorStop(0, "#51361c");
    trunkGrate.addColorStop(0.5, "#7a532e");
    trunkGrate.addColorStop(1, "#362210");
    ctx.fillStyle = trunkGrate;
    ctx.fillRect(cx - trunkW / 2 + sway * 0.3, py + s * 0.82 - trunkH, trunkW, trunkH);

    const leafColors = isOak
      ? ["#1a4714", "#2e7025", "#47963d", "#64b857"]
      : ["#215224", "#35803a", "#54a85a", "#78cc7d"];
    
    const tiers = isOak ? 4 : 3;
    for (let t = 0; t < tiers; t++) {
      const tierRadius = (s * (isOak ? 0.46 : 0.38)) * (1 - t * 0.16);
      const tierY = py + s * 0.58 - t * (s * 0.18) + Math.sin(time / 600 + t) * 2;
      
      ctx.fillStyle = leafColors[Math.min(t, leafColors.length - 1)];
      ctx.beginPath();
      ctx.arc(cx + sway * (1 + t * 0.2), tierY, tierRadius, 0, Math.PI * 2);
      ctx.fill();

      if (s > 20) {
        ctx.fillStyle = leafColors[Math.min(t + 1, leafColors.length - 1)];
        ctx.beginPath();
        ctx.arc(cx + sway * (1 + t * 0.2) - tierRadius * 0.2, tierY - tierRadius * 0.2, tierRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (ORE_COLORS[ch]) {
    drawOreRock(ctx, ch, x, y, cx, py, s, time, false);
  } else if (ch === "F") {
    // --- Realistic blast furnace: masonry body, arched hearth, contained flames, chimney smoke ---
    // Ground contact shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.88, s * 0.42, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tapered stone body
    const bodyG = ctx.createLinearGradient(px, 0, px + s, 0);
    bodyG.addColorStop(0, "#4d463e");
    bodyG.addColorStop(0.5, "#6e675c");
    bodyG.addColorStop(1, "#3c362e");
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(px + s * 0.16, py + s * 0.86);
    ctx.lineTo(px + s * 0.2, py + s * 0.2);
    ctx.lineTo(px + s * 0.8, py + s * 0.2);
    ctx.lineTo(px + s * 0.84, py + s * 0.86);
    ctx.closePath();
    ctx.fill();

    // Chimney collar + cap
    ctx.fillStyle = "#57504634";
    ctx.fillStyle = "#575046";
    ctx.fillRect(px + s * 0.3, py + s * 0.08, s * 0.4, s * 0.14);
    ctx.fillStyle = "#2f2a24";
    ctx.fillRect(px + s * 0.26, py + s * 0.05, s * 0.48, s * 0.05);

    // Masonry mortar courses (staggered brick joints)
    ctx.strokeStyle = "rgba(18,14,10,0.55)";
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (let r = 0; r < 4; r++) {
      const yy = py + s * (0.3 + r * 0.14);
      ctx.beginPath();
      ctx.moveTo(px + s * 0.18, yy);
      ctx.lineTo(px + s * 0.82, yy);
      ctx.stroke();
      const off = r % 2 ? s * 0.36 : s * 0.58;
      ctx.beginPath();
      ctx.moveTo(px + off, yy);
      ctx.lineTo(px + off, yy + s * 0.14);
      ctx.stroke();
    }

    // Arched hearth mouth (dark)
    const mouthPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.18, py + s * 0.86);
      ctx.lineTo(cx - s * 0.18, py + s * 0.62);
      ctx.quadraticCurveTo(cx, py + s * 0.46, cx + s * 0.18, py + s * 0.62);
      ctx.lineTo(cx + s * 0.18, py + s * 0.86);
      ctx.closePath();
    };
    mouthPath();
    ctx.fillStyle = "#140803";
    ctx.fill();

    // Flames contained inside the hearth (clipped)
    ctx.save();
    mouthPath();
    ctx.clip();
    const ff = Math.sin(time / 120) * 0.5 + Math.sin(time / 73 + 2) * 0.5;
    const fh = s * (0.3 + ff * 0.05);
    const fsway = Math.sin(time / 170) * s * 0.04;
    const flame = (w: number, h: number, color: string, off: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - w, py + s * 0.86);
      ctx.quadraticCurveTo(cx - w * 0.9, py + s * 0.86 - h * 0.5, cx + off, py + s * 0.86 - h);
      ctx.quadraticCurveTo(cx + w * 0.9, py + s * 0.86 - h * 0.5, cx + w, py + s * 0.86);
      ctx.closePath();
      ctx.fill();
    };
    flame(s * 0.15, fh, "rgba(230,80,15,0.95)", 0);
    flame(s * 0.1, fh * 0.72, "rgba(255,175,50,0.95)", fsway * 0.5);
    flame(s * 0.05, fh * 0.45, "rgba(255,240,190,1)", fsway);
    // Glowing ember bed
    ctx.fillStyle = `rgba(255,120,30,${0.5 + ff * 0.2})`;
    ctx.fillRect(cx - s * 0.17, py + s * 0.82, s * 0.34, s * 0.05);
    ctx.restore();

    // Soft warm spill from the hearth only (no more giant halo)
    const spill = ctx.createRadialGradient(cx, py + s * 0.78, 2, cx, py + s * 0.78, s * 0.5);
    spill.addColorStop(0, "rgba(255,140,40,0.22)");
    spill.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.82, s * 0.5, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Embers at the mouth + chimney smoke
    if (Math.random() < 0.12) spawnParticles(cx + (Math.random() - 0.5) * s * 0.2, py + s * 0.6, 1, "#ff9a3c", 0.5);
    if (Math.random() < 0.18) spawnParticles(cx + (Math.random() - 0.5) * s * 0.1, py + s * 0.05, 1, "rgba(140,140,148,0.55)", 0.35);
  } else if (ch === "A") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.78, s * 0.32, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#694a2e";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.65, s * 0.26, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - s * 0.26, py + s * 0.55, s * 0.52, s * 0.15);

    const anvilGrad = ctx.createLinearGradient(cx - s * 0.3, 0, cx + s * 0.3, 0);
    anvilGrad.addColorStop(0, "#484f56");
    anvilGrad.addColorStop(0.5, "#828994");
    anvilGrad.addColorStop(1, "#35393d");
    ctx.fillStyle = anvilGrad;
    ctx.fillRect(cx - s * 0.18, py + s * 0.38, s * 0.36, s * 0.2);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.38, py + s * 0.38);
    ctx.lineTo(cx + s * 0.38, py + s * 0.38);
    ctx.lineTo(cx + s * 0.28, py + s * 0.5);
    ctx.lineTo(cx - s * 0.28, py + s * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (ch === "B") {
    ctx.fillStyle = "#4a321a";
    ctx.fillRect(px + s * 0.1, py + s * 0.35, s * 0.8, s * 0.5);
    ctx.fillStyle = "#73502c";
    ctx.fillRect(px + s * 0.05, py + s * 0.3, s * 0.9, s * 0.12);

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1e5fa0" : "#d8c060";
      ctx.fillRect(px + s * 0.08 + (i * s * 0.84) / 4, py + s * 0.08, (s * 0.84) / 4, s * 0.25);
    }
    ctx.fillStyle = "#ffd53a";
    ctx.font = `bold ${Math.max(12, s * 0.35)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💰", cx, py + s * 0.6);
  } else if (ch === "*") {
    // --- Realistic campfire: stone ring, crossed logs, layered teardrop flames ---
    // Subtle warm light pool on the ground
    const pool = ctx.createRadialGradient(cx, cy + s * 0.12, 2, cx, cy + s * 0.12, s * 0.6);
    pool.addColorStop(0, "rgba(255,150,45,0.26)");
    pool.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.18, s * 0.6, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ring of hearth stones
    ctx.fillStyle = "#4b5056";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * s * 0.27, cy + s * 0.2 + Math.sin(a) * s * 0.13, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#666c73";
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * s * 0.27, cy + s * 0.19 + Math.sin(a) * s * 0.13, s * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crossed logs
    ctx.strokeStyle = "#5a3a1e";
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.18, cy + s * 0.04);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy + s * 0.2);
    ctx.lineTo(cx - s * 0.18, cy + s * 0.04);
    ctx.stroke();
    // Log end grain
    ctx.fillStyle = "#8a6a3e";
    ctx.beginPath();
    ctx.arc(cx + s * 0.18, cy + s * 0.04, s * 0.045, 0, Math.PI * 2);
    ctx.arc(cx - s * 0.18, cy + s * 0.04, s * 0.045, 0, Math.PI * 2);
    ctx.fill();

    // Layered teardrop flames (outer → core), flickering
    const ff = Math.sin(time / 110) * 0.5 + Math.sin(time / 67 + 1.7) * 0.5;
    const fh = s * (0.44 + ff * 0.07);
    const fsway = Math.sin(time / 160) * s * 0.05;
    const flame = (w: number, h: number, color: string, off: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy + s * 0.1);
      ctx.quadraticCurveTo(cx - w * 0.9, cy - h * 0.45, cx + off, cy - h);
      ctx.quadraticCurveTo(cx + w * 0.9, cy - h * 0.45, cx + w, cy + s * 0.1);
      ctx.closePath();
      ctx.fill();
    };
    flame(s * 0.16, fh, "rgba(235,85,15,0.95)", 0);
    flame(s * 0.11, fh * 0.74, "rgba(255,180,55,0.95)", fsway * 0.5);
    flame(s * 0.055, fh * 0.48, "rgba(255,245,200,1)", fsway);

    if (Math.random() < 0.2) {
      spawnParticles(cx + (Math.random() - 0.5) * s * 0.18, cy, 1, "#ff9a3c", 0.6);
    }
  } else if (ch === "f" || ch === "t") {
    drawFishingSpot(ctx, ch === "t", x, y, cx, cy, s, time);
  } else if (ch === "M" || ch === "P") {
    drawTownsfolk(ctx, ch === "P", cx, py, s, time);
  } else if (ch === "%" || ch === "^") {
    if (ch === "%") {
      const fColors = ["#e85a70", "#9b5ae8", "#5ae8dc", "#f4d03f"];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = fColors[Math.floor((h + i * 0.3) * 4) % fColors.length];
        const fx = px + s * 0.3 + (i * s * 0.2);
        const fy = py + s * 0.5 + Math.sin(x + i) * s * 0.15;
        ctx.beginPath();
        ctx.arc(fx, fy, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (ch === "=") {
    drawFence(ctx, x, y, px, py, s);
  } else if (ch === "L") {
    drawAltar(ctx, cx, py, s, time);
  }
}

// --- Fishing spots -----------------------------------------------------------
// A patch of churned water: bubbles rise, swell and pop into ripple rings on a
// staggered loop, so the spot always fizzes. The trout current adds foam
// streaks dragged by the flow; both have a fish leaping now and then.
function drawFishingSpot(ctx: CanvasRenderingContext2D, trout: boolean, x: number, y: number, cx: number, cy: number, s: number, time: number) {
  // churned, lighter water under the bubbles
  const churn = ctx.createRadialGradient(cx, cy, 1, cx, cy, s * 0.42);
  churn.addColorStop(0, "rgba(200,235,245,0.22)");
  churn.addColorStop(1, "rgba(200,235,245,0)");
  ctx.fillStyle = churn;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.42, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (trout) {
    ctx.strokeStyle = "rgba(235,248,252,0.45)";
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const k = (time / 900 + i / 4 + hash(x + i, y)) % 1;
      const sx0 = cx - s * 0.4 + k * s * 0.8;
      const sy0 = cy - s * 0.2 + i * s * 0.13;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.beginPath();
      ctx.moveTo(sx0 - s * 0.12, sy0);
      ctx.quadraticCurveTo(sx0, sy0 - s * 0.03, sx0 + s * 0.12, sy0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // a staggered set of bubbles, each on its own rise-swell-pop cycle
  const count = trout ? 7 : 9;
  for (let i = 0; i < count; i++) {
    const seed = hash(x * 13 + i * 7.1, y * 5 + i * 3.3);
    // One shared clock with evenly spread phases, so some are always mid-rise
    const period = 1800 + seed * 500;
    const k = (time / period + i / count + seed * 0.15) % 1;
    const bx = cx + (hash(i * 3.7 + x, y + i * 1.9) - 0.5) * s * 0.62 + Math.sin(time / 500 + i) * s * 0.02 + (trout ? k * s * 0.08 : 0);
    const by = cy + (hash(y + i * 2.3, x + i * 4.1) - 0.5) * s * 0.42 - k * s * 0.06;
    const rMax = s * (0.035 + seed * 0.05);
    if (k < 0.82) {
      const r = rMax * (0.4 + 0.6 * Math.min(1, k / 0.45));
      ctx.fillStyle = "rgba(225,245,252,0.28)";
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = Math.max(0.8, s * 0.012);
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(bx - r * 0.35, by - r * 0.35, Math.max(0.6, r * 0.28), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // pop: a quick expanding ring
      const q = (k - 0.82) / 0.18;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - q)})`;
      ctx.lineWidth = Math.max(0.8, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(bx, by, rMax * (1 + q * 1.6), rMax * (0.6 + q), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // a fish leaps clear of the water now and then
  const leap = (time / 2600 + hash(x, y)) % 1;
  if (leap < 0.22) {
    const q = leap / 0.22;
    const fx = cx - s * 0.18 + q * s * 0.36;
    const fy = cy - Math.sin(q * Math.PI) * s * 0.28;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(-0.9 + q * 1.8);
    ctx.fillStyle = trout ? "#9cc4d2" : "#e8a684";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.12, s * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, 0); ctx.lineTo(-s * 0.17, -s * 0.05); ctx.lineTo(-s * 0.17, s * 0.05);
    ctx.fill();
    ctx.restore();
  }
}

// --- Prayer altar -----------------------------------------------------------
// A carved stone altar under a white cloth, two candles and a soft holy glow
// that breathes slowly, so it reads as somewhere to pray from across the square.
function drawAltar(ctx: CanvasRenderingContext2D, cx: number, py: number, s: number, time: number) {
  const breathe = 0.5 + 0.5 * Math.sin(time / 900);

  const glow = ctx.createRadialGradient(cx, py + s * 0.4, 2, cx, py + s * 0.4, s * 0.75);
  glow.addColorStop(0, `rgba(255,248,210,${0.22 + breathe * 0.14})`);
  glow.addColorStop(1, "rgba(255,240,190,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, py + s * 0.4, s * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.86, s * 0.4, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // stepped plinth and body
  ctx.fillStyle = "#6f6a62";
  ctx.fillRect(cx - s * 0.4, py + s * 0.74, s * 0.8, s * 0.1);
  const body = ctx.createLinearGradient(0, py + s * 0.42, 0, py + s * 0.76);
  body.addColorStop(0, "#c9c3b5");
  body.addColorStop(1, "#8d877b");
  ctx.fillStyle = body;
  ctx.fillRect(cx - s * 0.32, py + s * 0.44, s * 0.64, s * 0.32);
  // carved panel
  ctx.strokeStyle = "rgba(60,55,48,0.55)";
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.strokeRect(cx - s * 0.22, py + s * 0.5, s * 0.44, s * 0.2);
  ctx.fillStyle = "rgba(60,55,48,0.5)";
  ctx.fillRect(cx - s * 0.015, py + s * 0.53, s * 0.03, s * 0.14);
  ctx.fillRect(cx - s * 0.06, py + s * 0.57, s * 0.12, s * 0.03);

  // top slab with a white cloth and gold trim hanging over the front
  ctx.fillStyle = "#ddd8cc";
  ctx.fillRect(cx - s * 0.38, py + s * 0.38, s * 0.76, s * 0.07);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(cx - s * 0.16, py + s * 0.36, s * 0.32, s * 0.2);
  ctx.fillStyle = "#d8b25c";
  ctx.fillRect(cx - s * 0.16, py + s * 0.54, s * 0.32, s * 0.025);

  // candles with flickering flames
  for (const side of [-1, 1]) {
    const kx = cx + side * s * 0.27;
    ctx.fillStyle = "#efe6cf";
    ctx.fillRect(kx - s * 0.025, py + s * 0.24, s * 0.05, s * 0.14);
    const flick = Math.sin(time / 110 + side * 2) * s * 0.008;
    ctx.fillStyle = "rgba(255,200,80,0.35)";
    ctx.beginPath();
    ctx.arc(kx, py + s * 0.2, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc4a";
    ctx.beginPath();
    ctx.ellipse(kx + flick, py + s * 0.2, s * 0.022, s * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6d0";
    ctx.beginPath();
    ctx.ellipse(kx + flick, py + s * 0.21, s * 0.01, s * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Paddock fence ----------------------------------------------------------
// One post per tile, with two split rails running only toward neighbouring
// fence tiles, so runs, corners and gate gaps join up. East–west rails are
// seen side-on; north–south rails are seen end-on as a single plank.
const FENCE = { post: "#6e4c2c", postDark: "#4a3019", postTop: "#9a7048", rail: "#8a6238", railLight: "#b08458", railDark: "#5a3c20" };

function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, s: number) {
  const cx = px + s / 2;
  const isFence = (dx: number, dy: number) => objAt(x + dx, y + dy) === "=";
  const lean = (hash(x, y) - 0.5) * s * 0.03; // posts aren't perfectly plumb
  const railYs = [0.42, 0.62];

  // Rails toward the north/south neighbour: one plank seen end-on, drawn
  // behind the post (the run continues into the next row)
  const vRail = (toY: number) => {
    const top = py + s * 0.38, bottom = toY;
    ctx.fillStyle = FENCE.railDark;
    ctx.fillRect(cx - s * 0.045, Math.min(top, bottom), s * 0.09, Math.abs(bottom - top));
    ctx.fillStyle = FENCE.rail;
    ctx.fillRect(cx - s * 0.03, Math.min(top, bottom), s * 0.05, Math.abs(bottom - top));
  };
  if (isFence(0, -1)) vRail(py - s * 0.62);
  if (isFence(0, 1)) vRail(py + s * 0.62);

  // Ground shadow under the post (and along an east–west run)
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.82, s * 0.12, s * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  const west = isFence(-1, 0), east = isFence(1, 0);
  if (west || east) {
    const x0 = west ? px : cx, x1 = east ? px + s : cx;
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(x0, py + s * 0.8, x1 - x0, s * 0.05);
  }

  // Post: square-cut with a lit face, a shaded side and a weathered top
  const pw = s * 0.14, top = py + s * 0.27, bottom = py + s * 0.84;
  ctx.fillStyle = FENCE.post;
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2 + lean, top);
  ctx.lineTo(cx + pw / 2 + lean, top);
  ctx.lineTo(cx + pw / 2, bottom);
  ctx.lineTo(cx - pw / 2, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FENCE.postDark;
  ctx.fillRect(cx + pw * 0.15, top + s * 0.02, pw * 0.35, bottom - top - s * 0.02);
  ctx.fillStyle = FENCE.postTop;
  ctx.beginPath();
  ctx.ellipse(cx + lean, top, pw / 2, s * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();

  // East–west split rails, slightly sagging between posts, nailed to the post
  for (const ry of railYs) {
    const yy = py + s * ry;
    const rail = (from: number, to: number) => {
      const sag = s * 0.012;
      ctx.fillStyle = FENCE.rail;
      ctx.beginPath();
      ctx.moveTo(from, yy - s * 0.035);
      ctx.quadraticCurveTo((from + to) / 2, yy - s * 0.035 + sag, to, yy - s * 0.035);
      ctx.lineTo(to, yy + s * 0.035);
      ctx.quadraticCurveTo((from + to) / 2, yy + s * 0.035 + sag, from, yy + s * 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = FENCE.railLight;
      ctx.fillRect(Math.min(from, to), yy - s * 0.035, Math.abs(to - from), s * 0.015);
      ctx.fillStyle = FENCE.railDark;
      ctx.fillRect(Math.min(from, to), yy + s * 0.022, Math.abs(to - from), s * 0.013);
    };
    if (west) rail(px - 1, cx);
    if (east) rail(cx, px + s + 1);
    if (west || east) {
      ctx.fillStyle = "#2a1c10";
      ctx.fillRect(cx - s * 0.012, yy - s * 0.012, s * 0.024, s * 0.024); // nail
    }
  }
}

// --- Per-job hero poses ---------------------------------------------------
// Drawn facing right; the caller mirrors for facing left. Positions are tile
// fractions from the hero tile's top-centre; `ang` is the held tool's angle
// (0 = head straight up, clockwise positive).
interface Pose {
  hx: number; hy: number; ang: number;
  squash?: number;             // foreshortening along the handle (side-on swing)
  rear?: [number, number];     // rear hand brought forward too
  bob?: number;                // extra crouch, tile fractions
  trail?: number;              // slash trail: the swing's start angle
  lump?: boolean;              // ore carried in both hands (smelting)
}

const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 at contact, 1 fully wound up. Contact lands as the strike's slot ends. */
function strikeCurve(q: number, hold: number, raiseEnd: number): number {
  if (q < hold) return 0;
  if (q < raiseEnd) return ease((q - hold) / (raiseEnd - hold));
  const t = (q - raiseEnd) / (1 - raiseEnd);
  return 1 - t * t; // accelerating into the blow
}

const TOOL_LEN: Record<GearShape, number> = {
  axe: 0.5, pick: 0.52, sword: 0.62, dagger: 0.42, rod: 0.95, hammer: 0.36, net: 0.62, pan: 0.4, platebody: 0.4, club: 0.44, staff: 0.9,
};

function poseFor(job: Job | null, g: GameState, time: number): Pose {
  const a = g.action;
  const p = a ? Math.min(1, a.progress / a.cycle) : 0;
  const q = job && STRIKES[job] ? (p * STRIKES[job]) % 1 : p;
  const blend = (c: Pose, w: Pose, b: number): Pose => ({
    ...c, hx: mix(c.hx, w.hx, b), hy: mix(c.hy, w.hy, b), ang: mix(c.ang, w.ang, b),
  });

  switch (job) {
    case "chop": {
      // A level swing at trunk height: the axe sweeps from behind (seen
      // foreshortened) to side-on at contact, with a shuddering "thunk" hold.
      const b = strikeCurve(q, 0.18, 0.68);
      const pose = blend({ hx: 0.44, hy: 0.52, ang: Math.PI / 2 }, { hx: -0.06, hy: 0.46, ang: Math.PI / 2 }, b);
      let sq = mix(1, -0.6, b);
      if (Math.abs(sq) < 0.22) sq = sq < 0 ? -0.22 : 0.22;
      if (q < 0.18) pose.ang += Math.sin(time / 16) * 0.06 * (1 - q / 0.18);
      return { ...pose, squash: sq };
    }
    case "mine": {
      // Overhead downward strike with a recoil off the rock.
      const b = strikeCurve(q, 0.16, 0.68);
      const pose = blend({ hx: 0.36, hy: 0.64, ang: 2.35 }, { hx: 0.0, hy: 0.06, ang: -0.85 }, b);
      if (q < 0.16) pose.ang -= Math.sin((q / 0.16) * Math.PI) * 0.18;
      return { ...pose, bob: (1 - b) * 0.035 };
    }
    case "smith": {
      // Short rapid hammer taps, the other hand steadying the work.
      const b = strikeCurve(q, 0.2, 0.55);
      return { ...blend({ hx: 0.38, hy: 0.58, ang: 2.0 }, { hx: 0.34, hy: 0.46, ang: 1.0 }, b), rear: [0.24, 0.62] };
    }
    case "smelt": {
      // Both arms forward, feeding the ore into the furnace mouth.
      const push = 0.09 * ease(p < 0.8 ? p / 0.8 : 1 - (p - 0.8) / 0.2);
      return { hx: 0.32 + push, hy: 0.52, ang: 0, rear: [0.26 + push, 0.55], lump: p < 0.82 };
    }
    case "cook":
      // Arm held out over the fire, the pan turning gently.
      return { hx: 0.42, hy: 0.53, ang: 1.62 + Math.sin(time / 260) * 0.12 };
    case "fish_rod": {
      // A quick cast, then a still hold; a tug as the fish bites.
      const t = Math.min(1, p / 0.16);
      const pose: Pose = { hx: mix(0.06, 0.3, ease(t)), hy: mix(0.42, 0.5, t), ang: mix(-0.7, 0.95, ease(t)) };
      if (t >= 1) pose.ang += Math.sin(time / 600) * 0.04;
      if (p > 0.86) pose.ang += 0.25 * Math.sin(((p - 0.86) / 0.14) * Math.PI);
      return pose;
    }
    case "fish_net":
      // Dip the net into the shallows and lift it back out.
      return { hx: 0.36, hy: 0.56, ang: 1.75 - 0.5 * Math.cos(p * Math.PI * 2) };
    case "stab": {
      const b = strikeCurve(q, 0.12, 0.78);
      return blend({ hx: 0.5, hy: 0.5, ang: Math.PI / 2 }, { hx: 0.14, hy: 0.52, ang: 1.45 }, b);
    }
    case "slash": {
      const b = strikeCurve(q, 0.12, 0.72);
      const pose = blend({ hx: 0.42, hy: 0.56, ang: 2.1 }, { hx: 0.08, hy: 0.24, ang: -1.1 }, b);
      return q >= 0.72 ? { ...pose, trail: -1.1 } : pose;
    }
    case "punch": {
      const b = strikeCurve(q, 0.12, 0.8);
      return { ...blend({ hx: 0.5, hy: 0.46, ang: 0 }, { hx: 0.2, hy: 0.5, ang: 0 }, b), rear: [0.16, 0.42] };
    }
    default:
      // Idle / walking: the arm swings freely (see drawPlayer64)
      return { hx: 0.24, hy: 0.58, ang: 0.5 };
  }
}

// Impact bursts: fired when a strike lands (or a cycle completes), using the
// same schedule as the game loop's impact sounds.
let lastWork: { job: Job; progress: number; cycle: number; tx: number; ty: number; color: string } | null = null;

function workImpacts(g: GameState, job: Job | null, aim: { x: number; y: number } | null, s: number) {
  const a = g.action;
  const prev = lastWork;
  lastWork = a && job && aim && g.path.length === 0
    ? { job, progress: a.progress, cycle: a.cycle, tx: aim.x, ty: aim.y, color: a.kind === "gather" ? ORE_COLORS[RES_ORE[a.res] ?? ""] ?? "#ffffff" : "#ffffff" }
    : null;
  if (!prev) return;
  const cur = lastWork;
  const landed = cur && cur.job === prev.job && cur.progress >= prev.progress
    ? strikesDone(cur.progress, cur.cycle, cur.job) > strikesDone(prev.progress, prev.cycle, prev.job)
    : prev.progress / prev.cycle > 0.85; // the cycle finished (timer reset or action ended)
  if (!landed) return;
  const { tx, ty } = prev;
  switch (prev.job) {
    case "chop": spawnParticles(tx, ty + s * 0.1, 7, "#d9be82", 0.9); spawnParticles(tx, ty + s * 0.1, 3, "#8a5a30", 0.7); break;
    case "mine": spawnParticles(tx, ty, 6, prev.color, 1.3); spawnParticles(tx, ty, 4, "#fff6c8", 1.5); break;
    case "smith": spawnParticles(tx, ty - s * 0.1, 6, "#ffd84b", 1.6); spawnParticles(tx, ty - s * 0.1, 4, "#ffffff", 1.8); break;
    case "smelt": spawnParticles(tx, ty, 6, "#ff9a3c", 0.8); break;
    case "cook": spawnParticles(tx, ty - s * 0.15, 4, "#b8b0a0", 0.4); break;
    case "fish_rod":
    case "fish_net": spawnParticles(tx, ty, 8, "#9fd8ef", 0.9); break;
    default: spawnParticles(tx, ty, 4, "#ffffff", 1.0); // combat hit
  }
}

const RES_ORE: Record<string, string> = { copper: "R", tin: "S", iron: "I", coal: "C", gold: "G" };

/** 0..1 kneel depth while burying bones. */
function kneelAmount(time: number) {
  const t = (time - emote.buryAt) / BURY_MS;
  return t >= 0 && t < 1 ? Math.min(1, Math.sin(t * Math.PI) * 2.5) : 0;
}

/** Legacy 8-bit hero: a simple stick for the job's tool, following the same pose. */
function drawPlayer8Tool(ctx: CanvasRenderingContext2D, g: GameState, px: number, py: number, s: number, time: number, facing: number) {
  const job = g.action && g.path.length === 0 ? jobOf(g) : null;
  const tool = job ? toolFor(g, job) : null;
  if (!job || !tool) return;
  const pose = poseFor(job, g, time);
  const hx = px + s / 2 + pose.hx * s * facing;
  const hy = py + pose.hy * s;
  const len = TOOL_LEN[tool.shape] * s * 0.8 * Math.abs(pose.squash ?? 1);
  ctx.strokeStyle = METALS[tool.metal].M;
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + Math.sin(pose.ang) * len * facing * Math.sign(pose.squash ?? 1), hy - Math.cos(pose.ang) * len);
  ctx.stroke();
}

// --- Livestock, goblins & townsfolk ---------------------------------------
// Every walker keeps the last way it faced; foes turn to face the hero and
// swing on the hero's combat timer, so blows meet on the same frame.
const npcDirs = new Map<string, Dir>();

function npcRig(
  key: string,
  e: { id: number; x: number; y: number; dx: number; dy: number },
  g: GameState,
  kind: "cow" | "chicken" | "goblin",
  fallback: Dir,
  time: number,
  gaitMs: number,
) {
  const a = g.action;
  const engaged = a?.kind === "combat" && a.targetKind === kind && a.targetId === e.id && g.path.length === 0;
  const moving = e.x !== e.dx || e.y !== e.dy;
  let dir = npcDirs.get(key) ?? fallback;
  if (moving) dir = dirFrom(e.dx - e.x, e.dy - e.y, dir);
  else if (engaged) dir = dirFrom(g.x - e.x, g.y - e.y, dir);
  npcDirs.set(key, dir);
  // 0..1 through the exchange; the foe's blow lands with the hero's
  const swing = engaged && a ? strikeCurve(Math.min(1, a.progress / a.cycle), 0.12, 0.72) : null;
  return { dir, walk: moving ? (time / gaitMs) * Math.PI * 2 + e.id : null, swing };
}

function fadeOut(e: { hp: number; diedAt?: number }, time: number): number | null {
  if (e.hp > 0) return 1;
  if (!e.diedAt || time - e.diedAt > 700) return null;
  return 1 - (time - e.diedAt) / 700; // death fade
}

function hitFlash(ctx: CanvasRenderingContext2D, e: { hp: number; hit?: number }, time: number, cx: number, cy: number, rx: number, ry: number) {
  if (e.hit && e.hp > 0 && time - e.hit < 140) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (time - e.hit) / 140)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCow64(ctx: CanvasRenderingContext2D, c: CowEnt, cx: number, cy: number, s: number, time: number, g: GameState) {
  const alpha = fadeOut(c, time);
  if (alpha === null) return;
  const r = npcRig(`c${c.id}`, c, g, "cow", "right", time, 900);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawCow(ctx, cx, cy, s, { dir: r.dir, walk: r.walk, time, seed: c.id, attack: r.swing === null ? 0 : 1 - r.swing });
  hitFlash(ctx, c, time, cx, cy, s * 0.38, s * 0.26);
  ctx.restore();
  if (alpha === 1) drawHPBar(ctx, cx, cy - s * 0.1, c.hp, c.maxHp, s);
}

function drawChicken64(ctx: CanvasRenderingContext2D, ch: ChickenEnt, cx: number, cy: number, s: number, time: number, g: GameState) {
  const alpha = fadeOut(ch, time);
  if (alpha === null) return;
  const r = npcRig(`h${ch.id}`, ch, g, "chicken", "left", time, 420);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawChicken(ctx, cx, cy, s, { dir: r.dir, walk: r.walk, time, seed: ch.id, attack: r.swing === null ? 0 : 1 - r.swing });
  hitFlash(ctx, ch, time, cx, cy, s * 0.2, s * 0.16);
  ctx.restore();
  if (alpha === 1) drawHPBar(ctx, cx, cy + s * 0.05, ch.hp, ch.maxHp, s);
}

const GOBLIN: Look = {
  skin: "#558233", skinDark: "#3e6224", ears: "pointy", eyes: "#ef4444",
  tunic: ["#4a2e16", "#6b4423", "#854d1d"], sleeve: "#558233", sleeveDark: "#3e6224",
  trousers: "#4a3418", trousersDark: "#36240f", boots: "#362214", belt: "#2c1c11",
  height: 0.82,
};
// Bramble Brigands of the deep gully: bigger, darker, meaner
const BRIGAND: Look = {
  ...GOBLIN, skin: "#33511f", skinDark: "#24361a", eyes: "#ff6a3a",
  tunic: ["#24180c", "#3a2412", "#5c3a14"], sleeve: "#33511f", sleeveDark: "#24361a",
  height: 1, bulk: 1.15,
};

function drawGoblin64(ctx: CanvasRenderingContext2D, gb: GoblinEnt, cx: number, cy: number, s: number, time: number, g: GameState) {
  const alpha = fadeOut(gb, time);
  if (alpha === null) return;
  const brigand = (gb.maxHp ?? 12) >= 20;
  const look = brigand ? BRIGAND : GOBLIN;
  const r = npcRig(`g${gb.id}`, gb, g, "goblin", "down", time, 480);
  const b = r.swing;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawFigure(ctx, look, {
    dir: r.dir, walk: r.walk, time: time + gb.id * 300, stance: b !== null,
    // A club slash, same arc as the hero's sword
    hand: b === null ? null : [mix(0.42, 0.08, b) - 0.14, mix(0.56, 0.24, b)],
    tool: { shape: "club", metal: "iron", len: brigand ? 0.5 : 0.44, ang: b === null ? undefined : mix(2.1, -1.1, b) },
    shield: "#713f12",
  }, cx, cy - s / 2, s);
  ctx.font = `bold ${Math.max(9, Math.floor(s * 0.18))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ef4444";
  ctx.fillText(brigand ? "Bramble Brigand Lvl 9" : "Goblin Lvl 5", cx, cy - s * (brigand ? 0.47 : 0.33));
  hitFlash(ctx, gb, time, cx, cy, s * 0.26, s * 0.3);
  ctx.restore();
  if (alpha === 1) drawHPBar(ctx, cx, cy - s * 0.15, gb.hp, gb.maxHp, s);
}

const ROKA: Look = {
  skin: "#f3cead", skinDark: "#d8b08c", hair: "#3a2a1a",
  hat: { color: "#285a30", band: "#1d4424", pom: "#e84545" },
  tunic: ["#5a2626", "#7c3838", "#9a4c4c"], sleeve: "#7c3838", sleeveDark: "#5a2626",
  trousers: "#3a2412", trousersDark: "#2a1a0c", boots: "#2c1a0c", belt: "#e0be38", robe: true,
};
const MARO: Look = {
  skin: "#f3cead", skinDark: "#d8b08c", hair: "#e8ecef", beard: "#e8ecef",
  tunic: ["#1f3466", "#2d4885", "#4060a8"], sleeve: "#2d4885", sleeveDark: "#1f3466",
  trousers: "#2a2a3a", trousersDark: "#1e1e2a", boots: "#2c1a0c", belt: "#e0be38", robe: true,
};

/** Roka at the trading post and Old Maro the guide, standing to greet the hero. */
export function drawTownsfolk(ctx: CanvasRenderingContext2D, isMaro: boolean, cx: number, py: number, s: number, time: number) {
  if (!isMaro) {
    drawFigure(ctx, ROKA, { dir: "down", walk: null, time, rear: [0.0, 0.58], hand: [0.02, 0.56] }, cx, py, s);
    return;
  }
  const out = drawFigure(ctx, MARO, {
    dir: "down", walk: null, time: time + 900, hand: [0.06, 0.5],
    tool: { shape: "staff", metal: "iron", len: 0.9, ang: 0 },
  }, cx, py, s);
  if (out.tip && Math.random() < 0.1) spawnParticles(out.tip.x, out.tip.y, 1, "#60dfff", 0.3);
}

// --- Quest markers ------------------------------------------------------------
// Where the quest-giving townsfolk stand: Roka at "M", Old Maro at "P".
const NPC_TILES: { x: number; y: number; npc: "maro" | "roka" }[] = [];
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    const o = objAt(x, y);
    if (o === "M") NPC_TILES.push({ x, y, npc: "roka" });
    else if (o === "P") NPC_TILES.push({ x, y, npc: "maro" });
  }
}

/** A gold or blue ! (quest on offer) or ? (ready to hand in), bobbing above the head. */
function drawQuestMarker(ctx: CanvasRenderingContext2D, m: Exclude<NpcMarker, null>, cx: number, py: number, s: number, time: number, is64: boolean) {
  const daily = m === "daily" || m === "daily-turnin";
  const glyph = m === "turnin" || m === "daily-turnin" ? "?" : "!";
  const [light, mid, dark] = daily ? ["#d8f0ff", "#4aa8ff", "#1a5aa8"] : ["#fff4b8", "#ffc81e", "#b07810"];
  const bob = Math.sin(time / 380) * s * 0.04;
  const y = py - s * 0.22 + bob;
  const size = Math.max(16, Math.round(s * 0.42));

  ctx.save();
  if (is64) {
    const glow = ctx.createRadialGradient(cx, y - size * 0.35, 1, cx, y - size * 0.35, size * 0.8);
    glow.addColorStop(0, daily ? "rgba(90,170,255,0.45)" : "rgba(255,210,60,0.45)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, y - size * 0.35, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `900 ${size}px 'Cinzel', Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeStyle = "rgba(20,12,4,0.95)";
  ctx.strokeText(glyph, cx, y);
  if (is64) {
    const grad = ctx.createLinearGradient(0, y - size * 0.8, 0, y);
    grad.addColorStop(0, light);
    grad.addColorStop(0.5, mid);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
  } else ctx.fillStyle = mid;
  ctx.fillText(glyph, cx, y);
  ctx.restore();
}

// --- The hero ----------------------------------------------------------------
const HERO: Look = {
  skin: "#f5cdab", skinDark: "#d9b090", hair: "#5c3d23",
  tunic: ["#1f3b28", "#427a57", "#5a9a70"], sleeve: "#3a6b4c", sleeveDark: "#2a4f38",
  trousers: "#4a2e18", trousersDark: "#36210f", boots: "#2c1a0c", belt: "#2c1c11", buckle: "#ffd84b",
};
const HERO_PLATE: Look = {
  ...HERO, plate: true,
  tunic: ["#63381a", "#d98240", "#e8a060"], sleeve: "#c87638", sleeveDark: "#9a5a2a",
};

function drawPlayer64(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  px: number,
  py: number,
  s: number,
  time: number,
  dir: Dir,
  aim: { x: number; y: number } | null = null
) {
  const cx = px + s / 2;
  const isMoving = g.path.length > 0;
  // The action timer only runs once the hero has arrived, so the swing waits too.
  const isWorking = g.action !== null && !isMoving;
  const kneel = kneelAmount(time);
  const job = isWorking && !kneel ? jobOf(g) : null;
  const pose = poseFor(job, g, time);
  const tool = kneel ? null : toolFor(g, job);

  // Poses were laid out for a wider shoulder; -0.14 moves them onto this one.
  const out = drawFigure(ctx, g.equipped?.armor === "bronze_platebody" ? HERO_PLATE : HERO, {
    dir,
    walk: isMoving ? (time / 560) * Math.PI * 2 : null,
    time,
    bob: pose.bob,
    kneel,
    stance: !!job,
    hand: kneel ? [0.22, 0.84 - 0.13 * kneel] : job ? [pose.hx - 0.14, pose.hy] : null,
    rear: job && pose.rear ? [pose.rear[0] - 0.14, pose.rear[1]] : null,
    tool: tool && {
      shape: tool.shape, metal: tool.metal, len: TOOL_LEN[tool.shape],
      ang: job ? pose.ang : undefined, squash: job ? pose.squash : undefined,
    },
  }, cx, py, s);
  const hand = out.hand;

  if (pose.trail !== undefined && out.tip) {
    // Motion smear behind a sword slash
    const r = Math.hypot(out.tip.x - hand.x, out.tip.y - hand.y) * 0.8;
    const a0 = out.screenAng(pose.trail) - Math.PI / 2, a1 = out.toolAng - Math.PI / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, r, a0, a1, a1 < a0);
    ctx.stroke();
  }
  if (job === "fish_rod" && aim && out.tip && (g.action?.progress ?? 0) / (g.action?.cycle ?? 1) > 0.1) {
    // Line from the rod tip to a bobber on the water
    const by = aim.y + Math.sin(time / 400) * s * 0.03;
    ctx.strokeStyle = "rgba(236,230,212,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(out.tip.x, out.tip.y);
    ctx.quadraticCurveTo((out.tip.x + aim.x) / 2, Math.max(out.tip.y, by) + s * 0.1, aim.x, by);
    ctx.stroke();
    ctx.fillStyle = "#e04040";
    ctx.beginPath();
    ctx.arc(aim.x, by, s * 0.05, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#f4f0e4";
    ctx.beginPath();
    ctx.arc(aim.x, by, s * 0.05, 0, Math.PI);
    ctx.fill();
  }
  if (pose.lump) {
    // Ore cradled between both hands, lit by the furnace
    ctx.fillStyle = "#4a4038";
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y - s * 0.04, s * 0.08, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9a3c";
    ctx.fillRect(hand.x - s * 0.02, hand.y - s * 0.07, s * 0.04, s * 0.025);
  }
  if (kneel && time - emote.buryAt < BURY_MS * 0.5) {
    // The bones, going into the ground
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(hand.x - s * 0.06, hand.y + s * 0.02, s * 0.12, s * 0.035);
  }
  if (job === "smelt") {
    // Furnace glow washing over the hero's front
    const flicker = 0.22 + Math.sin(time / 90) * 0.05 + Math.sin(time / 37) * 0.03;
    const f = out.front;
    const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, s * 0.6);
    glow.addColorStop(0, `rgba(255,150,60,${flicker})`);
    glow.addColorStop(1, "rgba(255,150,60,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glow;
    ctx.fillRect(f.x - s * 0.6, f.y - s * 0.6, s * 1.2, s * 1.2);
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.font = `bold ${Math.max(11, Math.floor(s * 0.22))}px 'Alegreya Sans', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(g.name, cx + 1, py + 3);
  ctx.fillStyle = "#00ffa6";
  ctx.fillText(g.name, cx, py + 2);

  drawHPBar(ctx, cx, py + s * 0.2, g.hp, g.maxHp, s);
}

// --- Main Render Master Engine ---
export function render(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  cam: Cam,
  clicks: ClickFlag[],
  w: number,
  h: number,
  time: number,
  player?: { dx: number; dy: number; dir: Dir }
) {
  ctx.clearRect(0, 0, w, h);
  
  const effTile = tileSize(g.zoom);
  const sx = Math.floor(cam.x - w / 2);
  const sy = Math.floor(cam.y - h / 2);
  // Sub-tile interpolated hero position (smooth follow) when supplied.
  const hx = player ? player.dx : g.x;
  const hy = player ? player.dy : g.y;

  const tx0 = Math.max(0, Math.floor(sx / effTile) - 1);
  const ty0 = Math.max(0, Math.floor(sy / effTile) - 1);
  const tx1 = Math.min(MAP_W - 1, Math.ceil((sx + w) / effTile) + 1);
  const ty1 = Math.min(MAP_H - 1, Math.ceil((sy + h) / effTile) + 1);

  const is64 = (g.graphicsMode ?? "64bit") === "64bit";

  // Where the hero is working (a tree, rock, station or foe), in screen space.
  // The hero turns to face it, and fishing lines and impact bursts aim at it.
  let aim: { x: number; y: number } | null = null;
  const act = g.action;
  if (act?.kind === "combat") {
    const foes: { id: number; x: number; y: number }[] =
      act.targetKind === "cow" ? g.cows : act.targetKind === "chicken" ? g.chickens ?? [] : g.goblins ?? [];
    const foe = foes.find((f) => f.id === act.targetId);
    if (foe) aim = { x: foe.x * effTile - sx + effTile / 2, y: foe.y * effTile - sy + effTile / 2 };
  } else if (act) {
    aim = { x: act.x * effTile - sx + effTile / 2, y: act.y * effTile - sy + effTile / 2 };
  }
  const working = !!act && g.path.length === 0;
  // Face the way the hero walks, or turn toward the work
  const heroCx = hx * effTile - sx + effTile / 2;
  const heroCy = hy * effTile - sy + effTile / 2;
  let heroDir: Dir = player?.dir ?? "down";
  if (working && aim && Math.hypot(aim.x - heroCx, aim.y - heroCy) > effTile * 0.3) heroDir = dirFrom(aim.x - heroCx, aim.y - heroCy, heroDir);
  const facing = heroDir === "left" ? -1 : 1;

  // 1. Draw Terrain Layer
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const gch = groundAt(x, y);
      const px = x * effTile - sx;
      const py = y * effTile - sy;
      if (is64) render64BitGround(ctx, gch, x, y, px, py, effTile, time);
      else render8BitGround(ctx, gch, x, y, px, py, effTile);
    }
  }

  // 2. Draw Objects, Ground Loot, NPCs, and Monsters in depth-sorted order
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const px = x * effTile - sx;
      const py = y * effTile - sy;
      
      const och = objAt(x, y);
      if (och) {
        const key = `${x},${y}`;
        const dep = !!(g.depleted[key] && time < g.depleted[key]);
        if (is64) drawObject64(ctx, och, x, y, px, py, effTile, time, dep);
        else {
          ctx.fillStyle = dep ? "#444" : och === "L" ? "#eeeaf8" : "#a88";
          ctx.fillRect(px + effTile * 0.2, py + effTile * 0.2, effTile * 0.6, effTile * 0.6);
        }
      }

      // Draw Ground Items (Loot, Eggs, Bones, Coins)
      if (g.groundItems) {
        for (const gi of g.groundItems) {
          if (Math.round(gi.y) === y && Math.round(gi.x) === x) {
            const gix = gi.x * effTile - sx + effTile / 2;
            const giy = gi.y * effTile - sy + effTile / 2;
            // Blink through the last seconds before it despawns
            const left = GROUND_ITEM_MS - (time - gi.t);
            if (left < GROUND_ITEM_WARN_MS) ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(time / 140));
            if (is64) drawGroundItem64(ctx, gi.item, gix, giy, effTile, time);
            else {
              ctx.fillStyle = "#facc15";
              ctx.fillRect(gix - effTile * 0.15, giy - effTile * 0.15, effTile * 0.3, effTile * 0.3);
            }
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw wandering cows on this row
      for (const c of g.cows) {
        if (Math.round(c.y) === y && Math.round(c.x) === x) {
          const cpx = c.x * effTile - sx + effTile / 2;
          const cpy = c.y * effTile - sy + effTile / 2;
          if (is64) drawCow64(ctx, c, cpx, cpy, effTile, time, g);
          else if (c.hp > 0) {
            ctx.fillStyle = "#fff";
            ctx.fillRect(cpx - effTile * 0.3, cpy - effTile * 0.3, effTile * 0.6, effTile * 0.6);
          }
        }
      }

      // Draw wandering chickens on this row
      if (g.chickens) {
        for (const ch of g.chickens) {
          if (Math.round(ch.y) === y && Math.round(ch.x) === x) {
            const chx = ch.x * effTile - sx + effTile / 2;
            const chy = ch.y * effTile - sy + effTile / 2;
            if (is64) drawChicken64(ctx, ch, chx, chy, effTile, time, g);
            else if (ch.hp > 0) {
              ctx.fillStyle = "#fbbf24";
              ctx.fillRect(chx - effTile * 0.2, chy - effTile * 0.2, effTile * 0.4, effTile * 0.4);
            }
          }
        }
      }

      // Draw tribal goblins on this row
      if (g.goblins) {
        for (const gb of g.goblins) {
          if (Math.round(gb.y) === y && Math.round(gb.x) === x) {
            const gbx = gb.x * effTile - sx + effTile / 2;
            const gby = gb.y * effTile - sy + effTile / 2;
            if (is64) drawGoblin64(ctx, gb, gbx, gby, effTile, time, g);
            else if (gb.hp > 0) {
              ctx.fillStyle = "#22c55e";
              ctx.fillRect(gbx - effTile * 0.3, gby - effTile * 0.3, effTile * 0.6, effTile * 0.6);
            }
          }
        }
      }

      // Draw hero player if at this Y row (interpolated for smooth motion)
      if (Math.round(hy) === y && Math.round(hx) === x) {
        const ppx = hx * effTile - sx;
        const ppy = hy * effTile - sy;
        if (is64) drawPlayer64(ctx, g, ppx, ppy, effTile, time, heroDir, aim);
        else {
          ctx.fillStyle = "#ff0";
          ctx.fillRect(ppx + effTile * 0.2, ppy + effTile * 0.2, effTile * 0.6, effTile * 0.6);
          drawPlayer8Tool(ctx, g, ppx, ppy, effTile, time, facing);
        }
      }
    }
  }

  // 2b. Impact bursts: sawdust, ore sparks, anvil sparks, splashes — on the blow
  if (is64) workImpacts(g, working ? jobOf(g) : null, aim, effTile);

  // 3. Render and Update 64-Bit Particle System
  if (is64) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // 3b. Quest markers over Maro's and Roka's heads, drawn above everything else in the world
  for (const n of NPC_TILES) {
    if (n.x < tx0 || n.x > tx1 || n.y < ty0 || n.y > ty1) continue;
    const m = npcMarker(g, n.npc);
    if (m) drawQuestMarker(ctx, m, n.x * effTile + effTile / 2 - sx, n.y * effTile - sy, effTile, time, is64);
  }

  // 4. Click target destination flags
  const now = performance.now();
  for (const c of clicks) {
    const age = (now - c.t0) / 600;
    if (age >= 1) continue;
    const cpx = c.x * effTile + effTile / 2 - sx;
    const cpy = c.y * effTile + effTile / 2 - sy;
    const sc = 1 + age * 0.6;
    const al = 1 - age;
    ctx.save();
    ctx.translate(cpx, cpy);
    ctx.rotate(Math.PI / 4 + time / 200);
    ctx.scale(sc, sc);
    ctx.strokeStyle = `rgba(255, 215, 60, ${0.9 * al})`;
    ctx.lineWidth = Math.max(2, effTile * 0.05);
    ctx.strokeRect(-effTile * 0.25, -effTile * 0.25, effTile * 0.5, effTile * 0.5);
    ctx.restore();
  }

  // 5. Floating text feedbacks
  for (const f of g.floats) {
    const age = (now - f.t) / 1400;
    if (age >= 1) continue;
    const fpx = f.x * effTile + effTile / 2 - sx;
    const fpy = f.y * effTile - age * 42 - sy;
    ctx.font = `800 ${Math.max(13, Math.floor(effTile * 0.28))}px 'Alegreya Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(0, 0, 0, ${0.75 * (1 - age)})`;
    ctx.fillText(f.text, fpx + 1.5, fpy + 1.5);
    ctx.fillStyle = f.color.replace(")", `,${1 - age})`).replace("rgb", "rgba");
    ctx.fillText(f.text, fpx, fpy);
  }

  // 6. Atmospheric lighting pass — additive light sources over a night wash.
  // Two stages: a bluish darkness overlay proportional to time-of-day, then an
  // additive "lighter" pass that carves warm haloes around every fire on screen.
  if (is64) {
    const cyc = dayCycle(time); // 0..1, 0 = deep night, 1 = midday
    const night = 0.06 + (1 - cyc) * 0.28;

    // A) Cool night wash across the whole viewport
    ctx.fillStyle = `rgba(18, 24, 52, ${night})`;
    ctx.fillRect(0, 0, w, h);

    // B) Additive light sources — each fire tile punches warm light back in.
    //    Flicker is per-source so the forge and campfire pulse independently.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const och = objAt(x, y);
        if (och !== "F" && och !== "*") continue;
        const key = `${x},${y}`;
        if (g.depleted[key] && time < g.depleted[key]) continue;

        // Position matches where the sprite actually renders its flame
        const lx = x * effTile - sx + effTile / 2;
        const ly = y * effTile - sy + (och === "F" ? effTile * 0.7 : effTile * 0.55);

        // Per-source flicker (deterministic per tile so two forges don't sync)
        const seed = x * 91 + y * 137;
        const flicker = 0.85 + 0.15 * Math.sin(time / (och === "F" ? 180 : 120) + seed);
        const radius = (och === "F" ? effTile * 2.6 : effTile * 2.0) * flicker;
        const intensity = (och === "F" ? 0.55 : 0.45) * (0.6 + night * 1.4); // brighter at night

        const glow = ctx.createRadialGradient(lx, ly, effTile * 0.08, lx, ly, radius);
        glow.addColorStop(0,    `rgba(255, 210, 140, ${intensity})`);
        glow.addColorStop(0.35, `rgba(255, 150,  50, ${intensity * 0.55})`);
        glow.addColorStop(0.7,  `rgba(180,  70,  15, ${intensity * 0.18})`);
        glow.addColorStop(1,    "rgba(80, 20, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // C) Soft screen-edge vignette (subtle, unchanged from before)
    const heroGlow = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.9);
    heroGlow.addColorStop(0, "rgba(0,0,0,0)");
    heroGlow.addColorStop(1, "rgba(5, 8, 14, 0.35)");
    ctx.fillStyle = heroGlow;
    ctx.fillRect(0, 0, w, h);
  }
}

export { ROCK_NAME };
