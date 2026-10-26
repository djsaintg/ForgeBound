import { GEAR, drawGear, type GearShape, type Metal } from "./gear";

// A jointed humanoid shared by the hero, goblins and townsfolk, drawn from
// the side, the front or the back.
//
// Body coordinates: f = forward, d = down from the top of the tile, l = the
// figure's right; all tile fractions. Limb angles are measured from straight
// down, positive = forward. Side views draw facing right and mirror for left;
// in front/back views "forward" reads as down/up the screen.

export type Dir = "down" | "up" | "left" | "right";

/** Facing for a movement step, keeping `fallback` when standing still. */
export function dirFrom(dx: number, dy: number, fallback: Dir): Dir {
  if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) return fallback;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
}

export interface Look {
  skin: string;
  skinDark: string;
  hair?: string;
  beard?: string;
  hat?: { color: string; band: string; pom?: string };
  ears?: "round" | "pointy";
  eyes?: string;
  tunic: [string, string, string]; // dark, mid, light
  sleeve: string;
  sleeveDark: string;
  trousers: string;
  trousersDark: string;
  boots: string;
  belt?: string;
  buckle?: string;
  robe?: boolean;   // long robe to the ankles
  plate?: boolean;  // bronze platebody detailing
  height?: number;  // 1 = the hero
  bulk?: number;    // torso width
}

export interface Hold {
  shape: GearShape;
  metal: Metal;
  len: number;       // tile fractions
  ang?: number;      // side-view angle (0 = head up, + forward); omitted = carried at rest
  squash?: number;   // side-on foreshortening (axe sweep)
}

export interface Rig {
  dir: Dir;
  walk: number | null;           // stride phase (radians) while walking
  time: number;                  // for idle breathing
  bob?: number;                  // extra crouch
  kneel?: number;                // 0..1
  stance?: boolean;              // feet braced apart (working)
  hand?: [number, number] | null; // near hand target (f, d); null = free swing
  rear?: [number, number] | null; // off hand target
  tool?: Hold | null;
  shield?: string | null;        // off-hand round shield colour
}

export interface FigureOut {
  hand: { x: number; y: number };   // near hand, screen space
  rear: { x: number; y: number };
  tip: { x: number; y: number } | null; // head end of the held tool
  toolAng: number;                   // held tool's on-screen angle
  screenAng: (a: number) => number;  // project another side-view angle the same way
  front: { x: number; y: number };   // a point just in front of the chest
}

const THIGH = 0.14, SHIN = 0.13, UPPER = 0.13, FORE = 0.13;
const GROUND = 0.88;
const DEPTH = 0.35; // how much "forward" moves a point down/up the screen in front/back views

type V = { f: number; d: number; l: number };
const v = (f: number, d: number, l = 0): V => ({ f, d, l });
const seg = (o: V, ang: number, len: number, l = o.l): V => ({ f: o.f + Math.sin(ang) * len, d: o.d + Math.cos(ang) * len, l });

/** Two-bone reach in the body's forward/down plane; the elbow bends down and back. */
function reach(sh: V, t: [number, number], l1: number, l2: number, handL: number): { elbow: V; hand: V } {
  let df = t[0] - sh.f, dd = t[1] - sh.d;
  let dist = Math.hypot(df, dd) || 1e-6;
  const max = (l1 + l2) * 0.999;
  if (dist > max) { df *= max / dist; dd *= max / dist; dist = max; }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))));
  const base = Math.atan2(dd, df);
  const e1 = { f: sh.f + Math.cos(base + a) * l1, d: sh.d + Math.sin(base + a) * l1 };
  const e2 = { f: sh.f + Math.cos(base - a) * l1, d: sh.d + Math.sin(base - a) * l1 };
  const e = e1.d - e1.f * 0.5 > e2.d - e2.f * 0.5 ? e1 : e2;
  return { elbow: v(e.f, e.d, (sh.l + handL) / 2), hand: v(sh.f + df, sh.d + dd, handL) };
}

export function drawFigure(ctx: CanvasRenderingContext2D, look: Look, rig: Rig, cx: number, py: number, s: number): FigureOut {
  const h = look.height ?? 1;
  const bulk = look.bulk ?? 1;
  const view: "side" | "down" | "up" = rig.dir === "left" || rig.dir === "right" ? "side" : rig.dir;
  const facing = rig.dir === "left" ? -1 : 1;
  const walking = rig.walk !== null;
  const phase = rig.walk ?? 0;
  const stride = Math.sin(phase);
  const kneel = rig.kneel ?? 0;
  const bob = walking ? Math.abs(stride) * 0.025 : (rig.bob ?? 0) + kneel * 0.13 + Math.sin(rig.time / 650) * 0.005;
  const S = s * h;

  // Body → screen (inside the mirrored frame for side views). Height scales
  // the figure about the ground line so short folk keep their feet down.
  const P = (p: V) => {
    const y = py + s * (GROUND - (GROUND - (p.d + bob)) * h);
    if (view === "side") return { x: cx + p.f * S, y };
    if (view === "down") return { x: cx - p.l * S, y: y + p.f * S * DEPTH };
    return { x: cx + p.l * S, y: y - p.f * S * DEPTH };
  };
  // A side-view tool angle (plus side-on squash) → on-screen angle and length factor
  const project = (ang: number, squash = 1) => {
    const lat = Math.sqrt(Math.max(0, 1 - squash * squash));
    const f = Math.sin(ang) * squash, u = Math.cos(ang) * (Math.abs(squash) < 1 ? 1 : squash);
    const x = view === "side" ? f : view === "down" ? -lat : lat;
    const up = view === "side" ? u : view === "down" ? u - f * DEPTH : u + f * DEPTH;
    return { ang: Math.atan2(x, up), k: Math.max(0.2, Math.hypot(x, up)), forward: f };
  };

  ctx.save();
  if (view === "side" && facing < 0) {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const line = (pts: V[], color: string, w: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * S;
    ctx.beginPath();
    pts.forEach((p, i) => { const q = P(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    ctx.stroke();
  };
  const dot = (p: V, r: number, color: string) => {
    const q = P(p);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, r * S, 0, Math.PI * 2);
    ctx.fill();
  };

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(cx, py + s * GROUND, S * (0.2 + Math.abs(stride) * 0.04), S * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- Legs: the thigh swings with the stride and the knee folds while that
  // leg swings through; straight and planted otherwise.
  const legAngles = (ph: number): [number, number] => {
    const thigh = Math.sin(ph) * 0.5;
    return [thigh, thigh - Math.max(0, Math.cos(ph)) * 0.75];
  };
  const kneelLegs: [number, number][] = [[1.35, 0.05], [0.05, -1.45]]; // near, far
  const still: [number, number][] = rig.stance ? [[0.18, 0.02], [-0.16, -0.05]] : [[0.06, 0], [-0.06, 0]];
  const legs = (walking ? [legAngles(phase), legAngles(phase + Math.PI)] : still)
    .map((a, i) => [a[0] + (kneelLegs[i][0] - a[0]) * kneel, a[1] + (kneelLegs[i][1] - a[1]) * kneel] as [number, number]);
  const legHip = (near: boolean) => view === "side" ? v(near ? 0.03 : -0.03, 0.6) : v(0, 0.6, near ? 0.065 : -0.065);
  const drawLeg = (near: boolean) => {
    const [thigh, shin] = legs[near ? 0 : 1];
    const hip = legHip(near);
    const knee = seg(hip, thigh, THIGH);
    const foot = seg(knee, shin, SHIN);
    if (look.robe) {
      // Under a robe only the boots show
      const q = P(foot);
      ctx.fillStyle = look.boots;
      ctx.beginPath();
      ctx.ellipse(q.x + (view === "side" ? S * 0.03 : 0), q.y, S * 0.055, S * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    line([hip, knee, foot], near ? look.trousers : look.trousersDark, 0.085);
    const q = P(foot);
    ctx.fillStyle = look.boots;
    ctx.beginPath();
    if (view === "side") ctx.ellipse(q.x + S * 0.03, q.y + S * 0.005, S * 0.065, S * 0.04, 0, 0, Math.PI * 2);
    else ctx.ellipse(q.x, q.y + S * 0.01, S * 0.045, S * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // ---- Arms ------------------------------------------------------------------
  const shoulderL = view === "side" ? 0 : 0.14 * bulk;
  const shN = v(view === "side" ? 0.03 : 0, 0.37, shoulderL);
  const shF = v(view === "side" ? -0.04 : 0, 0.37, -shoulderL);
  const swing = walking ? stride * 0.55 : 0;
  const fk = (sh: V, upper: number, fore: number) => {
    const elbow = seg(sh, upper, UPPER);
    return { elbow, hand: seg(elbow, fore, FORE) };
  };
  // Reaching forward pulls the hand in toward the body's centre line
  const handL = (sh: V, t: [number, number]) => sh.l * (1 - 0.5 * Math.max(0, Math.min(1, (t[0] - sh.f) / 0.25)));
  const near = rig.hand ? reach(shN, rig.hand, UPPER, FORE, handL(shN, rig.hand)) : fk(shN, -swing + 0.05, -swing + 0.45);
  const far = rig.rear ? reach(shF, rig.rear, UPPER, FORE, handL(shF, rig.rear)) : fk(shF, swing - 0.05, swing + 0.35);
  const drawArm = (sh: V, a: { elbow: V; hand: V }, isNear: boolean) => {
    line([sh, a.elbow], isNear || view !== "side" ? look.sleeve : look.sleeveDark, 0.08);
    line([a.elbow, a.hand], isNear || view !== "side" ? look.skin : look.skinDark, 0.065);
  };
  const fist = (p: V, isNear: boolean) => dot(p, 0.048, isNear || view !== "side" ? look.skin : look.skinDark);

  // ---- Held tool ---------------------------------------------------------------
  const tool = rig.tool;
  const toolAngSide = tool ? (tool.ang ?? 0.9 - swing * 0.6) : 0;
  const proj = project(toolAngSide, tool?.ang === undefined ? 1 : tool.squash ?? 1);
  const handScreen = P(near.hand);
  const drawTool = () => {
    if (!tool) return;
    drawGear(ctx, tool.shape, tool.metal, handScreen.x, handScreen.y, proj.ang, tool.len * S, proj.k);
  };
  // In front of the body from the front, behind it from the back
  const toolInFront = view === "side" || (view === "down" ? proj.forward >= -0.1 : proj.forward < -0.1);

  const shield = () => {
    if (!rig.shield) return;
    const q = P(far.hand);
    const w = view === "side" ? 0.045 : 0.1;
    ctx.fillStyle = rig.shield;
    ctx.beginPath();
    ctx.ellipse(q.x, q.y, w * S, 0.1 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = Math.max(1, S * 0.02);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(q.x, q.y, S * 0.025, 0, Math.PI * 2);
    ctx.fill();
  };

  // ---- Torso -------------------------------------------------------------------
  const drawTorso = () => {
    const wS = (view === "side" ? 0.115 : 0.14) * bulk, wW = (view === "side" ? 0.095 : 0.11) * bulk;
    const hemD = look.robe ? 0.85 : 0.65, hemW = look.robe ? wW + 0.06 : wW + 0.01;
    const tl = P(v(-wS, 0.34)), tr = P(v(wS, 0.34)), wl = P(v(-hemW, hemD)), wr = P(v(hemW, hemD));
    // In front/back views the torso spans the lateral axis instead
    if (view !== "side") {
      tl.x = cx - wS * S; tr.x = cx + wS * S; wl.x = cx - hemW * S; wr.x = cx + hemW * S;
    }
    const [dark, mid, light] = look.tunic;
    const grad = ctx.createLinearGradient(tl.x, 0, tr.x, 0);
    if (view === "side") { grad.addColorStop(0, dark); grad.addColorStop(0.6, mid); grad.addColorStop(1, light); }
    else { grad.addColorStop(0, dark); grad.addColorStop(0.5, view === "down" ? light : mid); grad.addColorStop(1, dark); }
    const waist = P(v(0, 0.6));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y + S * 0.03);
    ctx.quadraticCurveTo(tl.x, tl.y, tl.x + S * 0.04, tl.y);
    ctx.lineTo(tr.x - S * 0.04, tr.y);
    ctx.quadraticCurveTo(tr.x, tr.y, tr.x, tr.y + S * 0.03);
    ctx.lineTo(cx + (wW + 0.005) * S * (view === "side" ? 1 : 1), waist.y);
    ctx.lineTo(wr.x, wr.y);
    ctx.lineTo(wl.x, wl.y);
    ctx.lineTo(cx - (wW + 0.005) * S, waist.y);
    ctx.closePath();
    ctx.fill();

    const thin = Math.max(1, S * 0.015);
    if (look.plate) {
      ctx.strokeStyle = "rgba(60,30,10,0.6)";
      ctx.lineWidth = thin;
      const x = view === "side" ? P(v(0.03, 0)).x : cx;
      ctx.beginPath();
      ctx.moveTo(x, P(v(0, 0.37)).y);
      ctx.lineTo(x, P(v(0, 0.57)).y);
      ctx.stroke();
    } else if (view !== "up") {
      // Collar: a V at the front, a curve from the side
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(1, S * 0.02);
      ctx.beginPath();
      if (view === "down") {
        const c = P(v(0, 0.34));
        ctx.moveTo(c.x - S * 0.04, c.y);
        ctx.lineTo(c.x, c.y + S * 0.05);
        ctx.lineTo(c.x + S * 0.04, c.y);
      } else {
        const c = P(v(0.03, 0.35));
        ctx.arc(c.x, c.y, S * 0.045, 0.2, Math.PI - 0.2);
      }
      ctx.stroke();
    }
    if (look.belt) {
      const b = P(v(0, 0.56));
      const bw = (view === "side" ? 0.105 : 0.12) * bulk;
      ctx.fillStyle = look.belt;
      ctx.fillRect(cx - bw * S, b.y, bw * 2 * S, S * 0.05);
      if (look.buckle && view !== "up") {
        const bx = view === "side" ? cx + S * 0.06 : cx - S * 0.025;
        ctx.fillStyle = look.buckle;
        ctx.fillRect(bx, b.y - S * 0.005, S * 0.05, S * 0.06);
      }
    }
    if (look.robe) {
      // A sash hanging from the belt and a hem line
      ctx.strokeStyle = dark;
      ctx.lineWidth = thin;
      const hem = P(v(0, 0.83));
      ctx.beginPath();
      ctx.moveTo(wl.x + S * 0.01, hem.y);
      ctx.lineTo(wr.x - S * 0.01, hem.y);
      ctx.stroke();
    }
  };

  // ---- Head ----------------------------------------------------------------------
  const drawHead = () => {
    const neck = P(v(0, 0.3));
    ctx.fillStyle = look.skinDark;
    ctx.fillRect(neck.x - S * 0.03, neck.y, S * 0.06, S * 0.06);
    const hc = P(v(view === "side" ? 0.02 : 0, 0.2));
    const r = S * 0.115;
    const ears = (x: number, y: number, dirX: number) => {
      ctx.fillStyle = look.ears === "pointy" ? look.skin : look.skinDark;
      ctx.beginPath();
      if (look.ears === "pointy") {
        ctx.moveTo(x, y - S * 0.035);
        ctx.lineTo(x + dirX * S * 0.17, y - S * 0.07);
        ctx.lineTo(x, y + S * 0.035);
      } else {
        ctx.arc(x, y, S * 0.025, 0, Math.PI * 2);
      }
      ctx.fill();
    };
    if (view === "side" && look.ears === "pointy") ears(hc.x - S * 0.02, hc.y + S * 0.01, -1);
    if (view !== "side") { ears(hc.x - r * 0.95, hc.y + S * 0.01, -1); ears(hc.x + r * 0.95, hc.y + S * 0.01, 1); }

    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(hc.x, hc.y, r, 0, Math.PI * 2);
    ctx.fill();

    const eye = look.eyes ?? "#2a1a10";
    const eyeR = Math.max(1, S * 0.016);
    if (view === "side") {
      if (look.hair) {
        // A cap over the crown that falls down the back of the head
        ctx.fillStyle = look.hair;
        ctx.beginPath();
        ctx.arc(hc.x, hc.y, r * 1.06, Math.PI * 0.95, Math.PI * 2.05);
        ctx.lineTo(hc.x + S * 0.02, hc.y - S * 0.035);
        ctx.quadraticCurveTo(hc.x - S * 0.06, hc.y - S * 0.01, hc.x - S * 0.08, hc.y + S * 0.09);
        ctx.lineTo(hc.x - S * 0.12, hc.y + S * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      if (look.ears !== "pointy") ears(hc.x - S * 0.02, hc.y + S * 0.015, -1);
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(hc.x + S * 0.065, hc.y + S * 0.005, eyeR, 0, Math.PI * 2);
      ctx.fill();
      if (look.beard) {
        ctx.fillStyle = look.beard;
        ctx.beginPath();
        ctx.moveTo(hc.x + S * 0.1, hc.y + S * 0.04);
        ctx.quadraticCurveTo(hc.x + S * 0.08, hc.y + S * 0.2, hc.x - S * 0.01, hc.y + S * 0.16);
        ctx.lineTo(hc.x - S * 0.02, hc.y + S * 0.06);
        ctx.closePath();
        ctx.fill();
      }
    } else if (view === "down") {
      if (look.hair) {
        ctx.fillStyle = look.hair;
        ctx.beginPath();
        ctx.arc(hc.x, hc.y, r * 1.06, Math.PI * 1.02, Math.PI * 1.98);
        ctx.quadraticCurveTo(hc.x + r * 0.5, hc.y - r * 0.55, hc.x, hc.y - r * 0.5);
        ctx.quadraticCurveTo(hc.x - r * 0.5, hc.y - r * 0.55, hc.x - r * 1.05, hc.y + r * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = eye;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hc.x + sx * S * 0.042, hc.y + S * 0.01, eyeR, 0, Math.PI * 2);
        ctx.fill();
      }
      if (look.beard) {
        ctx.fillStyle = look.beard;
        ctx.beginPath();
        ctx.moveTo(hc.x - r * 0.85, hc.y + r * 0.3);
        ctx.quadraticCurveTo(hc.x, hc.y + r * 2.1, hc.x + r * 0.85, hc.y + r * 0.3);
        ctx.quadraticCurveTo(hc.x, hc.y + r * 0.75, hc.x - r * 0.85, hc.y + r * 0.3);
        ctx.fill();
      } else {
        ctx.strokeStyle = look.skinDark;
        ctx.lineWidth = Math.max(1, S * 0.012);
        ctx.beginPath();
        ctx.moveTo(hc.x - S * 0.025, hc.y + S * 0.06);
        ctx.lineTo(hc.x + S * 0.025, hc.y + S * 0.06);
        ctx.stroke();
      }
    } else if (look.hair) {
      // From behind: hair over nearly all of the head
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.arc(hc.x, hc.y, r * 1.06, Math.PI * 0.9, Math.PI * 2.1);
      ctx.quadraticCurveTo(hc.x + r, hc.y + r * 0.9, hc.x, hc.y + r * 0.95);
      ctx.quadraticCurveTo(hc.x - r, hc.y + r * 0.9, hc.x - r * 1.06, hc.y + r * 0.35);
      ctx.closePath();
      ctx.fill();
    }

    if (look.hat) {
      // A flat cap with a band (and a pom on top)
      const hx = view === "side" ? hc.x - S * 0.01 : hc.x;
      ctx.fillStyle = look.hat.color;
      ctx.beginPath();
      ctx.arc(hx, hc.y - r * 0.35, r * 1.05, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.hat.band;
      ctx.fillRect(hx - r * 1.12, hc.y - r * 0.42, r * 2.24, r * 0.32);
      if (view === "side") ctx.fillRect(hx + r * 0.6, hc.y - r * 0.32, r * 0.7, r * 0.14); // brim
      if (look.hat.pom) {
        ctx.fillStyle = look.hat.pom;
        ctx.beginPath();
        ctx.arc(hx + (view === "side" ? -r * 0.3 : 0), hc.y - r * 1.4, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Shoulder caps (pauldrons with plate)
  const shoulderCaps = (both: boolean) => {
    const cap = look.plate ? 0.065 : 0.05;
    if (both) dot(shF, cap, look.sleeve);
    dot(shN, cap, look.sleeve);
  };

  // ---- Draw, back to front for this view ----------------------------------------
  const nearReaching = !!rig.hand && rig.hand[0] > 0.12;
  const farReaching = !!rig.rear && rig.rear[0] > 0.05;
  if (view === "side") {
    if (!rig.rear) { drawArm(shF, far, false); fist(far.hand, false); }
    drawLeg(false);
    drawTorso();
    drawLeg(true);
    drawHead();
    shoulderCaps(false);
    if (rig.rear) { drawArm(shF, far, false); fist(far.hand, false); }
    shield();
    drawArm(shN, near, true);
    drawTool();
    fist(near.hand, true);
  } else if (view === "down") {
    drawLeg(false);
    drawLeg(true);
    if (!toolInFront) drawTool();
    drawTorso();
    shoulderCaps(true);
    drawArm(shF, far, false); fist(far.hand, false);
    shield();
    drawArm(shN, near, true);
    drawHead();
    if (toolInFront) drawTool();
    fist(near.hand, true);
  } else {
    if (!toolInFront) drawTool();
    if (nearReaching) { drawArm(shN, near, true); fist(near.hand, true); }
    if (farReaching) { drawArm(shF, far, false); fist(far.hand, false); }
    drawLeg(false);
    drawLeg(true);
    drawTorso();
    shoulderCaps(true);
    if (!farReaching) { drawArm(shF, far, false); fist(far.hand, false); }
    shield();
    if (!nearReaching) { drawArm(shN, near, true); fist(near.hand, true); }
    drawHead();
    if (toolInFront) drawTool();
  }
  ctx.restore();

  // Report screen-space points (un-mirrored) for trails, lines and effects
  const flip = (p: { x: number; y: number }) => ({ x: view === "side" && facing < 0 ? 2 * cx - p.x : p.x, y: p.y });
  let tip: { x: number; y: number } | null = null;
  if (tool) {
    const r = (GEAR[tool.shape].grip - 1) * (tool.len * S / 24) * proj.k;
    tip = flip({ x: handScreen.x + Math.sin(proj.ang) * r, y: handScreen.y - Math.cos(proj.ang) * r });
  }
  const mirrorAng = (a: number) => (view === "side" && facing < 0 ? -a : a);
  return {
    hand: flip(handScreen),
    rear: flip(P(far.hand)),
    tip,
    toolAng: mirrorAng(proj.ang),
    screenAng: (a: number) => mirrorAng(project(a, 1).ang),
    front: flip(P(v(0.3, 0.5))),
  };
}
