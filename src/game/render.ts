import { MAP_W, MAP_H, TILE, groundAt, objAt } from "./map";
import { ENEMY_TYPES } from "./data";
import type { EnemyEnt, GameState } from "./types";

export interface Cam { x: number; y: number; }
export interface ClickFlag { x: number; y: number; t0: number; }

const hash = (x: number, y: number) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const ORE_COLORS: Record<string, string> = {
  R: "#d0783f", S: "#c9cdd6", I: "#b06a3c", C: "#35353c", G: "#e8c040",
};
const ROCK_NAME: Record<string, string> = {
  R: "Copper", S: "Tin", I: "Iron", C: "Coal", G: "Gold",
};

export function clampCam(cam: Cam, w: number, h: number): Cam {
  const maxX = MAP_W * TILE - w / 2, maxY = MAP_H * TILE - h / 2;
  return {
    x: Math.max(w / 2, Math.min(maxX, cam.x)),
    y: Math.max(h / 2, Math.min(maxY, cam.y)),
  };
}

function drawGround(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, time: number) {
  const gch = groundAt(x, y);
  const h = hash(x, y);
  const s = TILE;
  if (gch === ".") {
    ctx.fillStyle = `hsl(${104 + h * 14}, ${30 + h * 8}%, ${27 + h * 7}%)`;
    ctx.fillRect(px, py, s + 1, s + 1);
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 1;
    const n = 2 + Math.floor(h * 3);
    for (let i = 0; i < n; i++) {
      const bx = px + 4 + hash(x + i, y) * (s - 8);
      const by = py + 5 + hash(x, y + i) * (s - 9);
      ctx.beginPath();
      ctx.moveTo(bx, by + 4);
      ctx.quadraticCurveTo(bx + 1.5, by, bx + 3, by + 1);
      ctx.stroke();
    }
  } else if (gch === ",") {
    ctx.fillStyle = `hsl(30, ${26 + h * 10}%, ${34 + h * 8}%)`;
    ctx.fillRect(px, py, s + 1, s + 1);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px + hash(x * 3 + i, y) * (s - 4) + 2, py + hash(x, y * 5 + i) * (s - 4) + 2, 2.5, 2);
    }
  } else if (gch === "#") {
    ctx.fillStyle = `hsl(40, 7%, ${40 + ((x + y) % 2) * 5 + h * 3}%)`;
    ctx.fillRect(px, py, s + 1, s + 1);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, s, s);
  } else if (gch === "_") {
    ctx.fillStyle = `hsl(45, ${38 + h * 10}%, ${62 + h * 6}%)`;
    ctx.fillRect(px, py, s + 1, s + 1);
    ctx.fillStyle = "rgba(120,90,40,0.25)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px + hash(x + i * 7, y) * s, py + hash(x, y + i * 11) * s, 2, 1.5);
    }
  } else if (gch === "b") {
    ctx.fillStyle = "#7a4e28";
    ctx.fillRect(px, py, s + 1, s + 1);
    ctx.fillStyle = "#8f5d33";
    for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8 + 1, s, 5.5);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(px + 1, py, 2, s);
    ctx.fillRect(px + s - 3, py, 2, s);
  } else if (gch === "~") {
    const deep = groundAt(x, y - 1) === "~" && groundAt(x, y + 1) === "~";
    ctx.fillStyle = deep ? "#1d4f6e" : "#27638a";
    ctx.fillRect(px, py, s + 1, s + 1);
    ctx.strokeStyle = "rgba(190,230,255,0.22)";
    ctx.lineWidth = 1.4;
    const ph = time * 1.1 + h * 9;
    for (let i = 0; i < 2; i++) {
      const wy = py + 8 + i * 13 + Math.sin(ph + i * 2) * 2;
      ctx.beginPath();
      ctx.moveTo(px + 3, wy);
      ctx.quadraticCurveTo(px + s / 2, wy + Math.sin(ph * 1.4 + i) * 3, px + s - 3, wy);
      ctx.stroke();
    }
  }
}

function drawObj(ctx: CanvasRenderingContext2D, g: GameState, x: number, y: number, px: number, py: number, time: number, now: number) {
  const ch = objAt(x, y);
  if (!ch) return;
  const h = hash(x, y);
  const cx = px + TILE / 2, cy = py + TILE / 2;
  const key = `${x},${y}`;
  const depUntil = g.depleted[key];
  const depleted = depUntil !== undefined && now < depUntil.t;

  if (ch === "%") {
    const cols = ["#e8d24a", "#d8d8f0", "#e07a5a"];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[(Math.floor(h * 9) + i) % 3];
      ctx.beginPath();
      ctx.arc(px + 6 + hash(x + i, y * 3) * 20, py + 6 + hash(x * 5, y + i) * 20, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ch === "^") {
    ctx.strokeStyle = "rgba(90,130,60,0.85)";
    ctx.lineWidth = 1.6;
    const sway = Math.sin(time * 1.6 + h * 8) * 2;
    for (let i = 0; i < 4; i++) {
      const bx = px + 6 + i * 6 + h * 3;
      ctx.beginPath();
      ctx.moveTo(bx, py + TILE - 4);
      ctx.quadraticCurveTo(bx + sway * 0.4, py + 16, bx + sway, py + 6 + i * 2);
      ctx.stroke();
    }
  } else if (ch === "=") {
    ctx.fillStyle = "#6e4a26";
    ctx.fillRect(cx - 2.5, cy - 8, 5, 18);
    ctx.fillStyle = "#84582e";
    ctx.fillRect(px - 1, cy - 5, TILE + 2, 3.4);
    ctx.fillRect(px - 1, cy + 3, TILE + 2, 3.4);
  } else if (ch === "T" || ch === "O") {
    const oak = ch === "O";
    const r = oak ? 15 : 11.5;
    const g1 = oak ? "#2c4a20" : "#33571f", g2 = oak ? "#3a622a" : "#40702a", g3 = oak ? "#4a7a34" : "#508a36";

    if (depleted) {
      const rec = g.depleted[key];
      const fell = rec?.t ? now - (rec.t - (oak ? 18000 : 12000)) : 0; // ms since the chop
      const p = Math.min(1, fell / 650);
      const dir = h > 0.5 ? 1 : -1;
      if (p < 1) {
        // the tree topples
        ctx.save();
        ctx.translate(cx, cy + 11);
        ctx.rotate(dir * p * 1.35);
        ctx.globalAlpha = 1 - p * 0.12;
        ctx.fillStyle = oak ? "#5a3a1e" : "#6e4a26";
        ctx.fillRect(-2.6, -11, 5.2, 12);
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(0, -13, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(-r * 0.35, -13 - r * 0.3, r * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = g3;
        ctx.beginPath(); ctx.arc(r * 0.3, -13 - r * 0.45, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        // stump, sawdust and a fallen log until regrowth
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath(); ctx.ellipse(cx, cy + 10, r * 0.85, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = oak ? "#4c3318" : "#5c3f22";
        ctx.beginPath(); ctx.ellipse(cx, cy + 4, r * 0.42, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = oak ? "#a8834e" : "#c09a5e";
        ctx.beginPath(); ctx.ellipse(cx, cy + 1.4, r * 0.42, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = oak ? "#7a5a30" : "#8a6a3e";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy + 1.4, r * 0.24, r * 0.15, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy + 1.4, r * 0.1, r * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
        const lx = cx + dir * (r + 5), ly = cy + 8;
        ctx.fillStyle = oak ? "#5c3f22" : "#7a5a2e";
        ctx.beginPath(); ctx.ellipse(lx, ly, 9.5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = oak ? "#8a6a3e" : "#a8834e";
        ctx.beginPath(); ctx.ellipse(lx - dir * 8.6, ly, 3.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(210,180,120,0.5)";
        ctx.fillRect(cx - dir * 5, cy + 8, 2, 1.5);
        ctx.fillRect(cx - dir * 8, cy + 10, 1.6, 1.2);
      }
    } else {
      const sway = Math.sin(time * 1.2 + h * 10) * 1.8;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 11, r * 0.9, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = oak ? "#5a3a1e" : "#6e4a26";
      ctx.fillRect(cx - 2.6, cy + 1, 5.2, 11);
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(cx + sway * 0.5, cy - 2, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx - r * 0.35 + sway * 0.7, cy - r * 0.3, r * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = g3;
      ctx.beginPath(); ctx.arc(cx + r * 0.3 + sway, cy - r * 0.45, r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
  } else if ("RSICG".includes(ch)) {
    if (depleted) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath(); ctx.ellipse(cx, cy + 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4c4c52";
      ctx.beginPath(); ctx.ellipse(cx, cy + 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.beginPath(); ctx.ellipse(cx, cy + 10, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5f6168";
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy + 8);
      ctx.lineTo(cx - 8, cy - 6);
      ctx.lineTo(cx + 1, cy - 10);
      ctx.lineTo(cx + 10, cy - 3);
      ctx.lineTo(cx + 11, cy + 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#71747c";
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 6); ctx.lineTo(cx + 1, cy - 10); ctx.lineTo(cx + 6, cy - 2); ctx.lineTo(cx - 4, cy + 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = ORE_COLORS[ch];
      for (let i = 0; i < 4; i++) {
        const gx = cx - 7 + hash(x + i * 3, y) * 14;
        const gy = cy - 6 + hash(x, y + i * 7) * 12;
        ctx.fillRect(gx, gy, 3.2, 2.6);
      }
    }
  } else if (ch === "F") {
    ctx.fillStyle = "#55534e";
    ctx.fillRect(px + 3, py + 2, TILE - 6, TILE - 4);
    ctx.fillStyle = "#67655e";
    ctx.fillRect(px + 3, py + 2, TILE - 6, 5);
    ctx.fillStyle = "#242320";
    ctx.beginPath();
    ctx.moveTo(cx - 6, py + TILE - 2);
    ctx.lineTo(cx - 6, py + 14);
    ctx.quadraticCurveTo(cx, py + 8, cx + 6, py + 14);
    ctx.lineTo(cx + 6, py + TILE - 2);
    ctx.closePath(); ctx.fill();
    const fl = 0.6 + 0.4 * Math.sin(time * 7 + h * 9);
    ctx.fillStyle = `rgba(255,140,40,${0.55 * fl})`;
    ctx.beginPath(); ctx.arc(cx, py + TILE - 7, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(200,200,210,0.16)";
    for (let i = 0; i < 3; i++) {
      const st = (time * 0.7 + i * 0.33 + h) % 1;
      ctx.beginPath();
      ctx.arc(cx + Math.sin(st * 6 + i) * 3, py - st * 18, 2.4 + st * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ch === "A") {
    ctx.fillStyle = "#5c3f22";
    ctx.fillRect(px + 7, py + 14, TILE - 14, 14);
    ctx.fillStyle = "#2e2e34";
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 14); ctx.lineTo(px + 9, py + 6); ctx.lineTo(px + 20, py + 6);
    ctx.lineTo(px + 27, py + 10); ctx.lineTo(px + 23, py + 15); ctx.lineTo(px + 8, py + 15);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#45454e";
    ctx.fillRect(px + 9, py + 6.5, 10, 3);
  } else if (ch === "B") {
    ctx.fillStyle = "#6e4a26";
    ctx.fillRect(px + 3, py + 6, TILE - 6, TILE - 8);
    ctx.fillStyle = "#84582e";
    ctx.fillRect(px + 3, py + 6, TILE - 6, 5);
    ctx.fillStyle = "#d8b25c";
    ctx.beginPath(); ctx.arc(cx, py + 19, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6e4a26";
    ctx.font = "700 6px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("B", cx, py + 21.4);
  } else if (ch === "*") {
    ctx.fillStyle = "#55534e";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 7 + 3, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#5c3f22"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy + 5); ctx.lineTo(cx + 7, cy - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 7, cy + 5); ctx.lineTo(cx - 7, cy - 1); ctx.stroke();
    const fl = Math.sin(time * 11 + h * 5);
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    grad.addColorStop(0, "rgba(255,190,80,0.5)");
    grad.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff9c2e";
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 3);
    ctx.quadraticCurveTo(cx - 4 + fl, cy - 8, cx, cy - 12 - fl * 2);
    ctx.quadraticCurveTo(cx + 4 - fl, cy - 7, cx + 5, cy + 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.moveTo(cx - 2.5, cy + 2);
    ctx.quadraticCurveTo(cx, cy - 6 + fl, cx + 2.5, cy + 2);
    ctx.closePath(); ctx.fill();
  } else if (ch === "f" || ch === "t") {
    const trout = ch === "t";
    for (let i = 0; i < 2; i++) {
      const rp = (time * 0.55 + i * 0.5 + h) % 1;
      ctx.strokeStyle = `rgba(220,245,255,${0.5 * (1 - rp)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 3 + rp * 10, (3 + rp * 10) * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const bob = Math.sin(time * 3 + h * 7) * 1.5;
    ctx.fillStyle = trout ? "#e86a3a" : "#e8d24a";
    ctx.beginPath(); ctx.arc(cx, cy + bob - 2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx, cy + bob - 3.2, 1.1, 0, Math.PI * 2); ctx.fill();
  } else if (ch === "c") {
    // henhouse
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 11, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a6a3e";
    ctx.fillRect(px + 4, py + 12, TILE - 8, 16);
    ctx.strokeStyle = "#6e5230"; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 12 + i * 4);
      ctx.lineTo(px + TILE - 4, py + 12 + i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = "#7a4e28";
    ctx.beginPath();
    ctx.moveTo(px + 1, py + 13); ctx.lineTo(px + 16, py + 2); ctx.lineTo(px + 31, py + 13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#241a10";
    ctx.fillRect(px + 12, py + 17, 8, 11);
    ctx.fillStyle = "#f4efdf";
    ctx.beginPath(); ctx.ellipse(px + 24.5, py + 26, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (ch === "e") {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6e5a34";
    ctx.beginPath();
    ctx.moveTo(px + 2, py + 26); ctx.lineTo(px + 16, py + 3); ctx.lineTo(px + 30, py + 26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#57462a";
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 3); ctx.lineTo(px + 30, py + 26); ctx.lineTo(px + 16, py + 26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2c2416";
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 26); ctx.lineTo(px + 16, py + 14); ctx.lineTo(px + 20, py + 26);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#4a3c22"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(px + 16, py + 3); ctx.lineTo(px + 16, py - 1); ctx.stroke();
  } else if (ch === "M" || ch === "P") {
    const maro = ch === "P";
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, 8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = maro ? "#7a5a34" : "#5a3a72";
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 10); ctx.lineTo(cx - 5, cy - 4); ctx.lineTo(cx + 5, cy - 4); ctx.lineTo(cx + 7, cy + 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = maro ? "#8a6a42" : "#6e4a8a";
    ctx.fillRect(cx - 5, cy - 4, 10, 5);
    ctx.fillStyle = "#e0b48c";
    ctx.beginPath(); ctx.arc(cx, cy - 8, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = maro ? "#9a8a72" : "#3a2a4a";
    ctx.beginPath(); ctx.arc(cx, cy - 10, 4.6, Math.PI, 0); ctx.fill();
    ctx.font = "600 10px 'Alegreya Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(maro ? "Old Maro" : "Roka · Trader", cx + 0.8, cy - 15.2);
    ctx.fillStyle = maro ? "#e8d24a" : "#c9a5e8";
    ctx.fillText(maro ? "Old Maro" : "Roka · Trader", cx, cy - 16);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyEnt, time: number, now: number, sx: number, sy: number) {
  const def = ENEMY_TYPES[e.type];
  const px = e.x * TILE + TILE / 2 - sx;
  const py = e.y * TILE + TILE / 2 - sy;
  const dying = e.deathAt > 0;
  let alpha = 1, scale = 1;
  if (dying) {
    const d = (now - e.deathAt) / 900;
    if (d >= 1) return;
    alpha = 1 - d;
    scale = 1 - d * 0.45;
  }
  const shadowR = e.type === "cow" ? 11 : e.type === "chicken" ? 5.5 : e.type === "goblin" ? 8 : 10;
  const bob = Math.sin(time * 3 + e.hx * 2) * 1.1;
  ctx.fillStyle = `rgba(0,0,0,${0.25 * alpha})`;
  ctx.beginPath();
  ctx.ellipse(px, py + 9, shadowR, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px, py);
  ctx.scale(scale, scale);
  if (e.type === "goblin") {
    ctx.fillStyle = "#4f8f3a";
    ctx.beginPath(); ctx.ellipse(0, bob, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6aa84e";
    ctx.beginPath(); ctx.ellipse(0, bob + 2, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4f8f3a";
    ctx.beginPath(); ctx.moveTo(-6, -6 + bob); ctx.lineTo(-11, -11 + bob); ctx.lineTo(-3.5, -8 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -6 + bob); ctx.lineTo(11, -11 + bob); ctx.lineTo(3.5, -8 + bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8d24a";
    ctx.beginPath();
    ctx.arc(-2.6, -3 + bob, 1.5, 0, Math.PI * 2);
    ctx.arc(2.6, -3 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#241c08";
    ctx.fillRect(-3, -3.4 + bob, 1, 1.6);
    ctx.fillRect(2.2, -3.4 + bob, 1, 1.6);
    ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(7, 2 + bob); ctx.lineTo(12, -6 + bob); ctx.stroke();
    ctx.fillStyle = "#84582e";
    ctx.beginPath(); ctx.arc(12.5, -7 + bob, 3, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === "brigand") {
    ctx.fillStyle = "#5a3a4a";
    ctx.beginPath();
    ctx.moveTo(-9, 10); ctx.lineTo(-6, -6 + bob);
    ctx.quadraticCurveTo(0, -12 + bob, 6, -6 + bob);
    ctx.lineTo(9, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2a1c22";
    ctx.beginPath(); ctx.arc(0, -5 + bob, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8604a";
    ctx.beginPath();
    ctx.arc(-1.6, -5.4 + bob, 1, 0, Math.PI * 2);
    ctx.arc(1.6, -5.4 + bob, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9cdd6"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(8, 4 + bob); ctx.lineTo(12, -2 + bob); ctx.stroke();
  } else if (e.type === "cow") {
    ctx.fillStyle = "#ece6da";
    ctx.beginPath(); ctx.ellipse(0, bob, 10, 6.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a4a3a";
    ctx.beginPath(); ctx.ellipse(-3, -2 + bob, 3.4, 2.4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, 2 + bob, 2.6, 1.9, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ece6da";
    ctx.beginPath(); ctx.arc(9, -4 + bob, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d8b8a0";
    ctx.beginPath(); ctx.arc(10.6, -2.6 + bob, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a3230";
    ctx.fillRect(8.6, -6 + bob, 1.3, 1.3);
  } else {
    // chicken
    ctx.fillStyle = "#f2ede2";
    ctx.beginPath(); ctx.ellipse(0, 1 + bob * 0.7, 6, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -1 + bob); ctx.lineTo(-9, -6 + bob); ctx.lineTo(-3.4, -3 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -5 + bob, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c23a2a";
    ctx.beginPath();
    ctx.arc(4.2, -8 + bob, 1.2, 0, Math.PI * 2);
    ctx.arc(5.8, -8.4 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8a030";
    ctx.beginPath();
    ctx.moveTo(7.6, -5 + bob); ctx.lineTo(10.4, -4.2 + bob); ctx.lineTo(7.6, -3.4 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#241c08";
    ctx.beginPath(); ctx.arc(5.6, -5.6 + bob, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e8a030"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-1.4, 5 + bob); ctx.lineTo(-1.4, 9);
    ctx.moveTo(1.6, 5 + bob); ctx.lineTo(1.6, 9);
    ctx.stroke();
  }
  if (now - e.flash < 130) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(0, bob, 9.5, 8.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
  }
  ctx.restore();
  if (!dying && e.hp < def.hp) {
    const w = 22;
    const pct = Math.max(0, e.hp / def.hp);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(px - w / 2, py - 16, w, 3.6);
    ctx.fillStyle = pct > 0.4 ? "#6ac04a" : "#d0442c";
    ctx.fillRect(px - w / 2 + 0.5, py - 15.5, (w - 1) * pct, 2.6);
  }
  ctx.font = "600 10px 'Alegreya Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(def.name, px + 0.8, py - 19.2);
  ctx.fillStyle = dying ? "#8a8a8a" : "#e88a7a";
  ctx.fillText(def.name, px, py - 20);
  ctx.globalAlpha = 1;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D, g: GameState,
  dx: number, dy: number, facing: number, moving: boolean,
  time: number, sx: number, sy: number
) {
  const px = dx * TILE + TILE / 2 - sx;
  const py = dy * TILE + TILE / 2 - sy;
  const bob = moving ? Math.sin(time * 12) * 1.6 : Math.sin(time * 2.4) * 0.7;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(px, py + 11, 8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  // cape
  ctx.fillStyle = "#a02c2c";
  ctx.beginPath();
  ctx.moveTo(px - 5, py - 3 + bob);
  ctx.quadraticCurveTo(px - facing * 6, py + 6, px - facing * 4, py + 11);
  ctx.lineTo(px + facing * 2, py + 9 + bob);
  ctx.closePath(); ctx.fill();
  // legs
  ctx.fillStyle = "#3e3428";
  const step = moving ? Math.sin(time * 12) * 2.4 : 0;
  ctx.fillRect(px - 3.4, py + 5, 3, 6 + step * 0.4);
  ctx.fillRect(px + 0.6, py + 5, 3, 6 - step * 0.4);
  // body
  ctx.fillStyle = "#6e5433";
  ctx.beginPath();
  ctx.moveTo(px - 5.5, py + 6 + bob); ctx.lineTo(px - 4.5, py - 4 + bob); ctx.lineTo(px + 4.5, py - 4 + bob); ctx.lineTo(px + 5.5, py + 6 + bob);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#8a6a3e";
  ctx.fillRect(px - 4.5, py - 4 + bob, 9, 3);
  // head + helm
  ctx.fillStyle = "#e0b48c";
  ctx.beginPath(); ctx.arc(px, py - 8.4 + bob, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#55606e";
  ctx.beginPath(); ctx.arc(px, py - 10 + bob, 4.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  ctx.fillRect(px - 5, py - 10.6 + bob, 10, 1.8);
  ctx.fillStyle = "#2a2420";
  ctx.fillRect(px + facing * 1.6 - 0.7, py - 8.6 + bob, 1.4, 1.6);

  // tool swing while acting
  if (g.action) {
    const prog = g.action.progress / g.action.cycle;
    const ang = -0.9 + Math.sin(prog * Math.PI * 2) * 1.1;
    const hx = px + facing * 6, hy = py - 1 + bob;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang * facing);
    ctx.strokeStyle = "#7a5a2e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.stroke();
    ctx.fillStyle = "#9aa0a8";
    ctx.beginPath();
    ctx.moveTo(-4, -13); ctx.lineTo(4, -11); ctx.lineTo(2.4, -7.6); ctx.lineTo(-2.4, -8.8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // progress arc
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py - 2, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.stroke();
    ctx.strokeStyle = "#d8b25c";
    ctx.beginPath(); ctx.arc(px, py - 2, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.stroke();
  }
  // name
  ctx.font = "700 11px 'Alegreya Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(g.name, px + 0.8, py - 17.2);
  ctx.fillStyle = "#7ee06a";
  ctx.fillText(g.name, px, py - 18);
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  w: number, h: number,
  cam: Cam,
  time: number,
  now: number,
  player: { dx: number; dy: number; facing: number; moving: boolean },
  clicks: ClickFlag[]
) {
  const sx = cam.x - w / 2, sy = cam.y - h / 2;
  ctx.fillStyle = "#101a0e";
  ctx.fillRect(0, 0, w, h);

  const x0 = Math.max(0, Math.floor(sx / TILE) - 1);
  const y0 = Math.max(0, Math.floor(sy / TILE) - 1);
  const x1 = Math.min(MAP_W - 1, Math.ceil((sx + w) / TILE) + 1);
  const y1 = Math.min(MAP_H - 1, Math.ceil((sy + h) / TILE) + 1);

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      drawGround(ctx, x, y, x * TILE - sx, y * TILE - sy, time);
    }
  }

  // eggs waiting on the ground
  for (const eg of g.eggs) {
    const px = eg.x * TILE + TILE / 2 - sx;
    const py = eg.y * TILE + TILE / 2 - sy;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(px, py + 5, 4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f4efdf";
    ctx.beginPath(); ctx.ellipse(px, py + 1, 3.4, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.ellipse(px - 1, py - 0.6, 1.1, 1.8, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  // ground-level water objects first, then props row by row
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = objAt(x, y);
      if (ch === "f" || ch === "t" || ch === "%") drawObj(ctx, g, x, y, x * TILE - sx, y * TILE - sy, time, now);
    }
    for (let x = x0; x <= x1; x++) {
      const ch = objAt(x, y);
      if (ch && ch !== "f" && ch !== "t" && ch !== "%") drawObj(ctx, g, x, y, x * TILE - sx, y * TILE - sy, time, now);
    }
    for (const e of g.enemies) {
      if (Math.floor(e.y) === y) drawEnemy(ctx, e, time, now, sx, sy);
    }
    if (Math.floor(player.dy) === y) {
      drawPlayer(ctx, g, player.dx, player.dy, player.facing, player.moving, time, sx, sy);
    }
  }
  // player may be above the last drawn row edge
  if (Math.floor(player.dy) > y1) {
    drawPlayer(ctx, g, player.dx, player.dy, player.facing, player.moving, time, sx, sy);
  }

  // click flags
  for (const c of clicks) {
    const age = (now - c.t0) / 600;
    if (age >= 1) continue;
    const px = c.x * TILE + TILE / 2 - sx, py = c.y * TILE + TILE / 2 - sy;
    const sc = 1 + age * 0.5, al = 1 - age;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    ctx.scale(sc, sc);
    ctx.strokeStyle = `rgba(255,220,90,${0.9 * al})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
  }

  // floating texts
  for (const f of g.floats) {
    const age = (now - f.t) / 1300;
    if (age >= 1) continue;
    const px = f.x * TILE + TILE / 2 - sx;
    const py = f.y * TILE - age * 26 - sy;
    ctx.font = "800 13px 'Alegreya Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(0,0,0,${0.55 * (1 - age)})`;
    ctx.fillText(f.text, px + 0.8, py + 0.8);
    ctx.fillStyle = f.color.replace(")", `,${1 - age})`).replace("rgb", "rgba");
    ctx.fillText(f.text, px, py);
  }

  // combat hitsplats
  for (const s of g.splats) {
    const age = (now - s.t) / 900;
    if (age >= 1) continue;
    const px = s.x * TILE + TILE / 2 - sx;
    const py = s.y * TILE + 8 - age * 22 - sy;
    const r = 8.5 * Math.min(1, 0.4 + age * 4);
    ctx.globalAlpha = age > 0.7 ? (1 - age) / 0.3 : 1;
    ctx.fillStyle = s.n === 0 ? "#5a5a5a" : s.kind === "deal" ? "#c22a20" : "#2a4ac2";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "800 11px 'Alegreya Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(s.n), px, py + 4);
    ctx.globalAlpha = 1;
  }

  // slow ambient day cycle + vignette
  const cyc = (Math.sin(time / 75) + 1) / 2; // 0..1
  ctx.fillStyle = `rgba(20,26,60,${0.05 + cyc * 0.1})`;
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(6,8,4,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

export { ROCK_NAME };
