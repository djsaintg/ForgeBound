import { MAP_W, MAP_H, TILE, groundAt, objAt } from "./map";
import type { GameState, ItemId } from "./types";

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
      ctx.fillStyle = "#1e2226";
      ctx.beginPath();
      ctx.ellipse(cx, cy + s * 0.1, s * 0.3, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.78, s * 0.38, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const rockGrad = ctx.createRadialGradient(cx - s * 0.1, cy - s * 0.1, s * 0.05, cx, cy, s * 0.4);
    rockGrad.addColorStop(0, "#8a929a");
    rockGrad.addColorStop(0.7, "#585f68");
    rockGrad.addColorStop(1, "#363a40");
    ctx.fillStyle = rockGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.34, 0, Math.PI * 2);
    ctx.fill();

    const veinColor = ORE_COLORS[ch] ?? "#ffffff";
    ctx.fillStyle = veinColor;
    const vCount = 3 + Math.floor(h * 3);
    for (let i = 0; i < vCount; i++) {
      const vx = cx + ((h * (i + 4) * 31) % (s * 0.45)) - s * 0.22;
      const vy = cy + ((h * (i + 7) * 47) % (s * 0.45)) - s * 0.22;
      ctx.beginPath();
      ctx.moveTo(vx, vy - s * 0.07);
      ctx.lineTo(vx + s * 0.07, vy);
      ctx.lineTo(vx, vy + s * 0.07);
      ctx.lineTo(vx - s * 0.07, vy);
      ctx.fill();
    }
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
    const bubbleOffset = (time / 300) % Math.PI;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(bubbleOffset) * (s * 0.15), cy + Math.cos(bubbleOffset) * (s * 0.15), s * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    if (Math.sin(time / 450 + x) > 0.7) {
      ctx.fillStyle = ch === "t" ? "#88bacc" : "#e0a17e";
      ctx.beginPath();
      const fy = cy - Math.sin(time / 200) * (s * 0.25);
      ctx.ellipse(cx, fy, s * 0.14, s * 0.07, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ch === "M" || ch === "P") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, py + s * 0.85, s * 0.25, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const isMaro = ch === "P";
    ctx.fillStyle = isMaro ? "#2d4885" : "#7c3838";
    ctx.fillRect(cx - s * 0.2, py + s * 0.32, s * 0.4, s * 0.52);

    ctx.fillStyle = "#e0be38";
    ctx.fillRect(cx - s * 0.22, py + s * 0.54, s * 0.44, s * 0.08);

    ctx.fillStyle = "#f3cead";
    ctx.beginPath();
    ctx.arc(cx, py + s * 0.22, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    if (isMaro) {
      ctx.fillStyle = "#e8ecef";
      ctx.beginPath();
      ctx.arc(cx, py + s * 0.32, s * 0.15, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#5a3a1e";
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.25, py + s * 0.85);
      ctx.lineTo(cx + s * 0.25, py + s * 0.12);
      ctx.stroke();
      ctx.fillStyle = "#50ccff";
      ctx.beginPath();
      ctx.arc(cx + s * 0.25, py + s * 0.12, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      if (Math.random() < 0.1) spawnParticles(cx + s * 0.25, py + s * 0.12, 1, "#60dfff", 0.3);
    } else {
      ctx.fillStyle = "#285a30";
      ctx.fillRect(cx - s * 0.22, py + s * 0.08, s * 0.44, s * 0.09);
      ctx.fillStyle = "#e84545";
      ctx.beginPath();
      ctx.arc(cx + s * 0.18, py + s * 0.04, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
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
    ctx.fillStyle = "#63472e";
    ctx.fillRect(px + s * 0.2, py, s * 0.15, s);
    ctx.fillRect(px + s * 0.65, py, s * 0.15, s);
    ctx.fillRect(px, py + s * 0.25, s, s * 0.15);
    ctx.fillRect(px, py + s * 0.65, s, s * 0.15);
  }
}

// --- Player, Cow, Chicken, & Goblin 64-Bit Rendering with Limb Gait Animations ---
function drawCow64(ctx: CanvasRenderingContext2D, c: any, cx: number, cy: number, s: number, time: number) {
  let alpha = 1;
  if (c.hp <= 0) {
    if (!c.diedAt || time - c.diedAt > 700) return;
    alpha = 1 - (time - c.diedAt) / 700; // death fade
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const isMoving = c.x !== c.dx || c.y !== c.dy;
  const stride = isMoving ? Math.sin(time / 110) * (s * 0.08) : 0;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.35, s * 0.36, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Walking hooves
  ctx.fillStyle = "#1e2124";
  ctx.fillRect(cx - s * 0.25 + stride, cy + s * 0.15, s * 0.08, s * 0.2);
  ctx.fillRect(cx + s * 0.18 - stride, cy + s * 0.15, s * 0.08, s * 0.2);

  ctx.fillStyle = "#ecefef";
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.34, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1e2124";
  ctx.beginPath();
  ctx.arc(cx - s * 0.1, cy - s * 0.05, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.15, cy + s * 0.06, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  const bob = Math.sin(time / 400 + cx) * 2;
  ctx.fillStyle = "#dce1e3";
  ctx.beginPath();
  ctx.arc(cx + s * 0.28, cy - s * 0.05 + bob, s * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2a0b8";
  ctx.beginPath();
  ctx.arc(cx + s * 0.36, cy + bob, s * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e0c284";
  ctx.fillRect(cx + s * 0.25, cy - s * 0.22 + bob, s * 0.05, s * 0.12);

  // white hit-flash
  if (c.hit && c.hp > 0 && time - c.hit < 140) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (time - c.hit) / 140)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.38, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (alpha === 1) drawHPBar(ctx, cx, cy - s * 0.1, c.hp, c.maxHp, s);
}

function drawChicken64(ctx: CanvasRenderingContext2D, ch: any, cx: number, cy: number, s: number, time: number) {
  let alpha = 1;
  if (ch.hp <= 0) {
    if (!ch.diedAt || time - ch.diedAt > 700) return;
    alpha = 1 - (time - ch.diedAt) / 700;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const isMoving = ch.x !== ch.dx || ch.y !== ch.dy;
  const stride = isMoving ? Math.sin(time / 80) * (s * 0.06) : 0;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.25, s * 0.18, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Orange claw feet swinging in walking gait
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(cx - s * 0.08 + stride, cy + s * 0.1, s * 0.03, s * 0.15);
  ctx.fillRect(cx + s * 0.05 - stride, cy + s * 0.1, s * 0.03, s * 0.15);

  const peck = Math.sin(time / 150 + cx) > 0.5 ? Math.sin(time / 50) * 3 : 0;
  const henGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, s * 0.2);
  henGrad.addColorStop(0, "#ffffff");
  henGrad.addColorStop(0.8, "#fef3c7");
  henGrad.addColorStop(1, "#d97706");
  ctx.fillStyle = henGrad;
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.02, cy + s * 0.05, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx + s * 0.15, cy - s * 0.05 + peck, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(cx + s * 0.16, cy - s * 0.14 + peck, s * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.2, cy - s * 0.06 + peck);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.04 + peck);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.02 + peck);
  ctx.closePath();
  ctx.fill();

  if (ch.hit && ch.hp > 0 && time - ch.hit < 140) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (time - ch.hit) / 140)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.2, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (alpha === 1) drawHPBar(ctx, cx, cy + s * 0.05, ch.hp, ch.maxHp, s);
}

function drawGoblin64(ctx: CanvasRenderingContext2D, gb: any, cx: number, cy: number, s: number, time: number) {
  let alpha = 1;
  if (gb.hp <= 0) {
    if (!gb.diedAt || time - gb.diedAt > 700) return;
    alpha = 1 - (time - gb.diedAt) / 700;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const brigand = (gb.maxHp ?? 12) >= 20; // Bramble Brigands of the deep gully
  if (brigand) s *= 1.22;
  const isMoving = gb.x !== gb.dx || gb.y !== gb.dy;
  const stride = isMoving ? Math.sin(time / 100) * (s * 0.1) : 0;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.38, s * 0.26, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Walking leather boots swinging with gait
  ctx.fillStyle = "#362214";
  ctx.fillRect(cx - s * 0.14 + stride * 0.6, cy + s * 0.22, s * 0.1, s * 0.15);
  ctx.fillRect(cx + s * 0.04 - stride * 0.6, cy + s * 0.22, s * 0.1, s * 0.15);

  const bob = isMoving ? Math.cos(time / 100) * 2 : Math.sin(time / 200 + cx) * 2;
  ctx.fillStyle = brigand ? "#24361a" : "#3e6224";
  ctx.fillRect(cx - s * 0.18, cy - s * 0.08 + bob, s * 0.36, s * 0.32);
  ctx.fillStyle = brigand ? "#3a2412" : "#6b4423";
  ctx.fillRect(cx - s * 0.12, cy - s * 0.06 + bob, s * 0.24, s * 0.28);
  ctx.strokeStyle = brigand ? "#5c3a14" : "#854d1d";
  ctx.lineWidth = s * 0.04;
  ctx.strokeRect(cx - s * 0.12, cy - s * 0.06 + bob, s * 0.24, s * 0.28);

  ctx.fillStyle = brigand ? "#33511f" : "#558233";
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.18 + bob, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy - s * 0.18 + bob);
  ctx.lineTo(cx - s * 0.28, cy - s * 0.22 + bob);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.14 + bob);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.12, cy - s * 0.18 + bob);
  ctx.lineTo(cx + s * 0.28, cy - s * 0.22 + bob);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.14 + bob);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(cx - s * 0.07, cy - s * 0.2 + bob, 2.5, 2.5);
  ctx.fillRect(cx + s * 0.03, cy - s * 0.2 + bob, 2.5, 2.5);

  ctx.save();
  ctx.translate(cx + s * 0.22 + stride * 0.5, cy + bob);
  ctx.rotate(Math.sin(time / 200) * 0.5);
  ctx.fillStyle = "#4a2e18";
  ctx.fillRect(0, -s * 0.25, s * 0.08, s * 0.4);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-2, -s * 0.22, Math.max(3, s * 0.12), s * 0.06);
  ctx.restore();

  ctx.fillStyle = "#713f12";
  ctx.beginPath();
  ctx.arc(cx - s * 0.22 - stride * 0.4, cy + s * 0.05 + bob, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.arc(cx - s * 0.22 - stride * 0.4, cy + s * 0.05 + bob, s * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `bold ${Math.max(9, Math.floor(s * 0.18))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ef4444";
  ctx.fillText(brigand ? "Bramble Brigand Lvl 9" : "Goblin Lvl 5", cx, cy - s * 0.38 + bob);

  if (gb.hit && gb.hp > 0 && time - gb.hit < 140) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (time - gb.hit) / 140)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.26, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (alpha === 1) drawHPBar(ctx, cx, cy - s * 0.15, gb.hp, gb.maxHp, s);
}

// --- Player Walking Limb Animation ---
function drawPlayer64(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  px: number,
  py: number,
  s: number,
  time: number,
  facing = 1
) {
  const cx = px + s / 2;
  const isMoving = g.path.length > 0;
  const isWorking = g.action !== null;

  // ---- 6-frame walk cycle -------------------------------------------------
  // One full cycle takes ~500ms; we sample 6 keyframes and interpolate.
  const cycleMs = 500;
  const cyclePos = isMoving ? ((time % cycleMs) / cycleMs) * 6 : 0; // 0..6
  const frame = Math.floor(cyclePos);
  const frac = cyclePos - frame;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Per-frame poses (values are unit fractions of tile size s):
  //   L/R leg swing (+forward), L/R knee lift (positive raises the foot),
  //   torso bob (positive = crouch), arm swing (mirrors legs).
  //   Frames: 0 contact-L, 1 recoil, 2 pass-L, 3 contact-R, 4 recoil, 5 pass-R
  const legSwingF   = [ 0.14, 0.06, -0.06, -0.14, -0.06, 0.06,  0.14];
  const legLiftF    = [ 0.00, 0.08,  0.06,  0.00,  0.08, 0.06,  0.00];
  const oppLiftF    = [ 0.06, 0.00,  0.00,  0.06,  0.00, 0.00,  0.06];
  const bobF        = [ 0.02, 0.00, -0.02,  0.02,  0.00,-0.02,  0.02];

  const legSwing = isMoving ? lerp(legSwingF[frame], legSwingF[frame + 1], frac) * s : 0;
  const legLift  = isMoving ? lerp(legLiftF[frame],  legLiftF[frame + 1],  frac) * s : 0;
  const oppLift  = isMoving ? lerp(oppLiftF[frame],  oppLiftF[frame + 1],  frac) * s : 0;
  const bodyBob  = isMoving
    ? lerp(bobF[frame], bobF[frame + 1], frac) * s
    : (isWorking ? Math.sin(time / 70) * (s * 0.04) : 0);

  // Determine which leg is "front" this half-cycle
  const frontLegLead = frame < 3;
  const frontLift = frontLegLead ? legLift : oppLift;
  const backLift  = frontLegLead ? oppLift : legLift;
  const frontOff  = frontLegLead ?  legSwing : -legSwing;
  const backOff   = frontLegLead ? -legSwing :  legSwing;

  // Ground shadow — subtly pulses with body bob
  ctx.fillStyle = `rgba(0,0,0,${0.55 - bodyBob * 0.5})`;
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.87, s * (0.28 - bodyBob * 0.4), s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- Legs with bend at the knee ----------------------------------------
  const drawLeg = (offX: number, lift: number, isFront: boolean) => {
    const hipX = cx + offX * facing;
    const hipY = py + s * 0.6 + bodyBob;
    const footX = cx + (offX * 0.7) * facing;
    const footY = py + s * 0.86 - lift;
    // Trouser
    ctx.strokeStyle = isFront ? "#4a2e18" : "#3a2412";
    ctx.lineWidth = s * 0.11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    // Knee bend: mid-point pulled slightly forward as the foot lifts
    const kneeX = (hipX + footX) / 2 + (lift > 0 ? s * 0.05 * facing : 0);
    const kneeY = (hipY + footY) / 2;
    ctx.quadraticCurveTo(kneeX, kneeY, footX, footY - s * 0.05);
    ctx.stroke();
    // Boot
    ctx.fillStyle = "#2c1a0c";
    ctx.beginPath();
    ctx.ellipse(footX, footY - s * 0.02, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // Boot toe highlight
    ctx.fillStyle = "#5c3d23";
    ctx.fillRect(footX - s * 0.08, footY - s * 0.045, s * 0.16, s * 0.02);
  };
  // Back leg first (depth order)
  drawLeg(-0.09, backLift, false);
  drawLeg( 0.09 + backOff * 0.15, frontLift, true);

  // ---- Torso / armour ----------------------------------------------------
  const hasPlate = g.equipped?.armor === "bronze_platebody";
  const tunicGrad = ctx.createLinearGradient(cx - s * 0.2, 0, cx + s * 0.2, 0);
  if (hasPlate) {
    tunicGrad.addColorStop(0, "#8a5028");
    tunicGrad.addColorStop(0.5, "#d98240");
    tunicGrad.addColorStop(1, "#63381a");
  } else {
    tunicGrad.addColorStop(0, "#2c543a");
    tunicGrad.addColorStop(0.5, "#427a57");
    tunicGrad.addColorStop(1, "#1f3b28");
  }
  ctx.fillStyle = tunicGrad;
  ctx.fillRect(cx - s * 0.2, py + s * 0.35 + bodyBob, s * 0.4, s * 0.38);
  // Belt & buckle
  ctx.fillStyle = "#2c1c11";
  ctx.fillRect(cx - s * 0.21, py + s * 0.62 + bodyBob, s * 0.42, s * 0.08);
  ctx.fillStyle = "#ffd84b";
  ctx.fillRect(cx - s * 0.06, py + s * 0.61 + bodyBob, s * 0.12, s * 0.1);

  // ---- Arms: shoulders + counter-swinging hands --------------------------
  // Arms counter the legs: front leg forward → same-side arm back
  const frontArmSwing = -frontOff * 0.9;
  const backArmSwing  = -backOff  * 0.9;

  // Shoulder pauldrons
  ctx.fillStyle = hasPlate ? "#d98240" : "#95a1ae";
  ctx.beginPath();
  ctx.arc(cx - s * 0.2, py + s * 0.38 + bodyBob, s * 0.09, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.2, py + s * 0.38 + bodyBob, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Rear hand (behind torso plane) — only draw the fist
  ctx.fillStyle = "#f5cdab";
  const rearHandX = cx - s * 0.24 * facing + backArmSwing;
  const rearHandY = py + s * 0.55 + bodyBob + Math.abs(backArmSwing) * 0.3;
  ctx.beginPath();
  ctx.arc(rearHandX, rearHandY, s * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // ---- Head + hair -------------------------------------------------------
  ctx.fillStyle = "#f5cdab";
  ctx.beginPath();
  ctx.arc(cx, py + s * 0.25 + bodyBob, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c3d23";
  ctx.beginPath();
  ctx.arc(cx, py + s * 0.22 + bodyBob, s * 0.17, 0, Math.PI);
  ctx.fill();

  // ---- Front arm + weapon (drawn last, above torso) ----------------------
  const eq = g.equipped?.pick || g.equipped?.axe || g.equipped?.weapon || g.equipped?.rod;
  const frontShoulderX = cx + s * 0.2 * facing;
  const frontShoulderY = py + s * 0.4 + bodyBob;

  if (eq || isWorking) {
    ctx.save();
    ctx.translate(frontShoulderX + frontArmSwing * 0.4, frontShoulderY);
    if (isWorking) {
      // Sweeping combat / chopping weapon slash
      const swingAngle = Math.sin(time / 70) * 1.4 - 0.2;
      ctx.rotate(swingAngle * facing);
      if (Math.random() < 0.35) {
        spawnParticles(cx + s * 0.4 * facing, py + s * 0.4, 1, "#ffffff", 0.8);
      }
    } else {
      // Arm swings opposite the leg on the same side
      ctx.rotate((-0.15 + frontArmSwing * 0.05) * facing);
    }
    ctx.fillStyle = "#6e472a";
    ctx.fillRect(-2, -s * 0.05, Math.max(3, s * 0.07), s * 0.42);
    ctx.fillStyle = g.equipped?.pick ? "#b3c1d1" : (g.equipped?.axe ? "#869fb8" : "#f0c858");
    ctx.fillRect(-s * 0.15, s * 0.34, s * 0.3, Math.max(4, s * 0.09));
    // Fist
    ctx.fillStyle = "#f5cdab";
    ctx.beginPath();
    ctx.arc(0, s * 0.3, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Unarmed idle: front hand hangs at hip
    ctx.fillStyle = "#f5cdab";
    ctx.beginPath();
    ctx.arc(frontShoulderX, py + s * 0.6 + bodyBob, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
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
  player?: { dx: number; dy: number; facing: number }
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
          ctx.fillStyle = dep ? "#444" : "#a88";
          ctx.fillRect(px + effTile * 0.2, py + effTile * 0.2, effTile * 0.6, effTile * 0.6);
        }
      }

      // Draw Ground Items (Loot, Eggs, Bones, Coins)
      if (g.groundItems) {
        for (const gi of g.groundItems) {
          if (Math.round(gi.y) === y && Math.round(gi.x) === x) {
            const gix = gi.x * effTile - sx + effTile / 2;
            const giy = gi.y * effTile - sy + effTile / 2;
            if (is64) drawGroundItem64(ctx, gi.item, gix, giy, effTile, time);
            else {
              ctx.fillStyle = "#facc15";
              ctx.fillRect(gix - effTile * 0.15, giy - effTile * 0.15, effTile * 0.3, effTile * 0.3);
            }
          }
        }
      }

      // Draw wandering cows on this row
      for (const c of g.cows) {
        if (Math.round(c.y) === y && Math.round(c.x) === x) {
          const cpx = c.x * effTile - sx + effTile / 2;
          const cpy = c.y * effTile - sy + effTile / 2;
          if (is64) drawCow64(ctx, c, cpx, cpy, effTile, time);
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
            if (is64) drawChicken64(ctx, ch, chx, chy, effTile, time);
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
            if (is64) drawGoblin64(ctx, gb, gbx, gby, effTile, time);
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
        if (is64) drawPlayer64(ctx, g, ppx, ppy, effTile, time, player?.facing ?? 1);
        else {
          ctx.fillStyle = "#ff0";
          ctx.fillRect(ppx + effTile * 0.2, ppy + effTile * 0.2, effTile * 0.6, effTile * 0.6);
        }
      }
    }
  }

  // 2b. Ambient work particles: sawdust while felling trees, ore sparks while mining
  if (is64 && g.action && g.action.kind === "gather") {
    const a = g.action;
    if ((a.res === "tree" || a.res === "oak") && Math.random() < 0.35) {
      spawnParticles(a.x * effTile - sx + effTile / 2, a.y * effTile - sy + effTile * 0.55, 1, "#d9be82", 0.5);
    } else if (["copper", "tin", "iron", "coal", "gold"].includes(a.res) && Math.random() < 0.3) {
      const oreKey: Record<string, string> = { copper: "R", tin: "S", iron: "I", coal: "C", gold: "G" };
      spawnParticles(a.x * effTile - sx + effTile / 2, a.y * effTile - sy + effTile * 0.5, 1, ORE_COLORS[oreKey[a.res]] ?? "#ffffff", 0.6);
    }
  }

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
    const cyc = (Math.sin(time / 4500) + 1) / 2; // 0..1, 0 = deep night, 1 = midday
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
