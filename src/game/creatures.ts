import type { Dir } from "./figure";

// Livestock with jointed legs, drawn from the side, front or back. Side views
// face right and mirror for left. All sizes are tile fractions around the
// tile centre (cx, cy).

export interface CreatureRig {
  dir: Dir;
  walk: number | null; // gait phase (radians) while walking
  time: number;
  seed: number;        // per-animal offset so the herd doesn't move in lockstep
  attack: number;      // 0..1, 1 = the blow lands (head-butt / peck)
}

type Pt = [number, number];

/** 0..1 while an idle animal has its head down (grazing / pecking). */
function headDown(rig: CreatureRig, every: number, lasts: number) {
  if (rig.walk !== null) return 0;
  const t = (rig.time + rig.seed * 1733) % every;
  return t < lasts ? Math.sin((t / lasts) * Math.PI) : 0;
}

function withFacing(ctx: CanvasRenderingContext2D, cx: number, dir: Dir, draw: () => void) {
  ctx.save();
  if (dir === "left") {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------- Cow ----
const COW = { hide: "#ecefef", shade: "#c9ced0", far: "#b5babc", spot: "#1e2124", muzzle: "#f2a0b8", hoof: "#2a2420", horn: "#e0c284" };

export function drawCow(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, rig: CreatureRig) {
  const P = (x: number, y: number): Pt => [cx + x * s, cy + y * s];
  const walking = rig.walk !== null;
  const ph = rig.walk ?? 0;
  const graze = headDown(rig, 9000, 3200);
  const swish = Math.sin(rig.time / 380 + rig.seed) * 0.05;
  const bob = walking ? Math.abs(Math.sin(ph)) * 0.012 : 0;

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.36, s * (rig.dir === "left" || rig.dir === "right" ? 0.36 : 0.26), s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  const stroke = (pts: Pt[], color: string, w: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  };
  const blob = (x: number, y: number, rx: number, ry: number, color: string, rot = 0) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx + x * s, cy + y * s, rx * s, ry * s, rot, 0, Math.PI * 2);
    ctx.fill();
  };
  const spots = (x0: number, y0: number, rx: number, ry: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx + x0 * s, cy + y0 * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 3; i++) {
      const a = (rig.seed * 2.3 + i * 2.1) % (Math.PI * 2);
      blob(x0 + Math.cos(a) * rx * 0.55, y0 + Math.sin(a) * ry * 0.5, rx * 0.32, ry * 0.42, COW.spot, a);
    }
    ctx.restore();
  };

  if (rig.dir === "left" || rig.dir === "right") {
    withFacing(ctx, cx, rig.dir, () => {
      // Legs: diagonal pairs move together; the lower leg folds back as it lifts
      const leg = (hipX: number, phase: number, color: string, hind: boolean) => {
        const up = walking ? Math.sin(phase) * 0.35 : 0;
        const bend = walking ? Math.max(0, Math.cos(phase)) * 0.7 : 0;
        const upper = up + (hind ? 0.12 : 0), lower = up - bend - (hind ? 0.12 : 0);
        const hip: Pt = P(hipX, 0.06 + bob);
        const knee: Pt = [hip[0] + Math.sin(upper) * 0.13 * s, hip[1] + Math.cos(upper) * 0.13 * s];
        const foot: Pt = [knee[0] + Math.sin(lower) * 0.13 * s, knee[1] + Math.cos(lower) * 0.13 * s];
        stroke([hip, knee, foot], color, 0.07);
        ctx.fillStyle = COW.hoof;
        ctx.fillRect(foot[0] - s * 0.035, foot[1] - s * 0.01, s * 0.07, s * 0.04);
      };
      leg(0.17, ph + Math.PI, COW.far, false);
      leg(-0.22, ph, COW.far, true);

      // Tail
      const t0 = P(-0.31, -0.07 + bob);
      const t1 = P(-0.36 + swish, 0.15 + bob);
      ctx.strokeStyle = COW.shade;
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(t0[0], t0[1]);
      ctx.quadraticCurveTo(cx - s * 0.38, cy + s * 0.0, t1[0], t1[1]);
      ctx.stroke();
      blob(-0.36 + swish, 0.17 + bob, 0.025, 0.04, COW.spot);

      // Barrel body with spots, belly shade and udder
      blob(-0.02, -0.02 + bob, 0.3, 0.17, COW.hide);
      blob(-0.02, 0.07 + bob, 0.26, 0.07, COW.shade);
      spots(-0.02, -0.02 + bob, 0.3, 0.17);
      blob(-0.1, 0.14 + bob, 0.06, 0.035, COW.muzzle);

      leg(0.19, ph, COW.hide, false);
      leg(-0.2, ph + Math.PI, COW.hide, true);

      // Neck and head: bobs with the walk, drops to graze, lunges to butt
      const hx = 0.36 + rig.attack * 0.08 + graze * 0.03;
      const hy = -0.08 + (walking ? Math.sin(ph * 2) * 0.012 : 0) + graze * 0.24 + rig.attack * 0.06 + bob;
      stroke([P(0.18, -0.04 + bob), P(hx - 0.05, hy)], COW.hide, 0.13);
      const tilt = 0.35 + graze * 0.6 + rig.attack * 0.3;
      blob(hx, hy, 0.1, 0.08, COW.hide, tilt);
      blob(hx - 0.07, hy - 0.05, 0.045, 0.025, COW.shade, -0.4);           // ear
      stroke([P(hx - 0.03, hy - 0.07), P(hx - 0.01, hy - 0.13)], COW.horn, 0.025); // horn
      blob(hx + 0.07, hy + 0.045, 0.055, 0.045, COW.muzzle, tilt);
      blob(hx + 0.1, hy + 0.05, 0.01, 0.01, "#7a3a4a");                   // nostril
      blob(hx + 0.005, hy - 0.02, 0.014, 0.014, COW.spot);                  // eye
    });
    return;
  }

  // Front / back: four stepping legs, near pair longer and in front
  const lift = (phase: number) => (walking ? Math.max(0, Math.cos(phase)) * 0.05 : 0);
  const legV = (x: number, top: number, len: number, phase: number, color: string) => {
    const foot = top + len - lift(phase);
    stroke([P(x, top + bob), P(x, foot)], color, 0.07);
    ctx.fillStyle = COW.hoof;
    ctx.fillRect(cx + (x - 0.035) * s, cy + (foot - 0.01) * s, s * 0.07, s * 0.04);
  };
  if (rig.dir === "down") {
    legV(-0.1, 0.06, 0.22, ph, COW.far);
    legV(0.1, 0.06, 0.22, ph + Math.PI, COW.far);
    blob(0, -0.02 + bob, 0.24, 0.19, COW.hide);
    spots(0, -0.02 + bob, 0.24, 0.19);
    legV(-0.15, 0.1, 0.24, ph + Math.PI, COW.hide);
    legV(0.15, 0.1, 0.24, ph, COW.hide);
    // Face-on head in front of the body
    const hy = 0.0 + graze * 0.12 + rig.attack * 0.06 + bob + (walking ? Math.sin(ph * 2) * 0.01 : 0);
    stroke([P(-0.13, hy - 0.08), P(-0.2, hy - 0.16)], COW.horn, 0.025);
    stroke([P(0.13, hy - 0.08), P(0.2, hy - 0.16)], COW.horn, 0.025);
    blob(-0.15, hy - 0.04, 0.06, 0.03, COW.shade, 0.3);
    blob(0.15, hy - 0.04, 0.06, 0.03, COW.shade, -0.3);
    blob(0, hy, 0.12, 0.14, COW.hide);
    blob(0.04, hy - 0.06, 0.05, 0.05, COW.spot);
    blob(0, hy + 0.08, 0.085, 0.06, COW.muzzle);
    blob(-0.03, hy + 0.09, 0.012, 0.012, "#7a3a4a");
    blob(0.03, hy + 0.09, 0.012, 0.012, "#7a3a4a");
    blob(-0.055, hy - 0.02, 0.016, 0.016, COW.spot);
    blob(0.055, hy - 0.02, 0.016, 0.016, COW.spot);
  } else {
    legV(-0.1, 0.06, 0.22, ph, COW.far);
    legV(0.1, 0.06, 0.22, ph + Math.PI, COW.far);
    // Ears and horns peeking over the back
    const hy = -0.17 + graze * 0.08 + bob;
    stroke([P(-0.08, hy), P(-0.13, hy - 0.07)], COW.horn, 0.025);
    stroke([P(0.08, hy), P(0.13, hy - 0.07)], COW.horn, 0.025);
    blob(-0.12, hy + 0.02, 0.05, 0.025, COW.shade, 0.3);
    blob(0.12, hy + 0.02, 0.05, 0.025, COW.shade, -0.3);
    blob(0, hy + 0.02, 0.09, 0.06, COW.hide);
    blob(0, -0.02 + bob, 0.24, 0.19, COW.hide);
    spots(0, -0.02 + bob, 0.24, 0.19);
    blob(0, 0.15 + bob, 0.06, 0.035, COW.muzzle);
    legV(-0.15, 0.1, 0.24, ph + Math.PI, COW.hide);
    legV(0.15, 0.1, 0.24, ph, COW.hide);
    // Tail down the middle
    ctx.strokeStyle = COW.shade;
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * (-0.1 + bob));
    ctx.quadraticCurveTo(cx + swish * s, cy + s * (0.05 + bob), cx + swish * 2 * s, cy + s * (0.2 + bob));
    ctx.stroke();
    blob(swish * 2, 0.22 + bob, 0.025, 0.04, COW.spot);
  }
}

// ------------------------------------------------------------ Chicken ----
const HEN = { body: "#fbf6ea", shade: "#e6dcc6", wing: "#ece2cc", comb: "#e23b3b", beak: "#f59e0b", leg: "#f59e0b", eye: "#1e1a16" };

export function drawChicken(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, rig: CreatureRig) {
  const walking = rig.walk !== null;
  const ph = rig.walk ?? 0;
  const peck = Math.max(headDown(rig, 3800, 700), rig.attack);
  const flap = rig.attack > 0.2 ? Math.sin(rig.time / 45) * 0.5 : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * 0.015 : 0;
  const blob = (x: number, y: number, rx: number, ry: number, color: string, rot = 0) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx + x * s, cy + y * s, rx * s, ry * s, rot, 0, Math.PI * 2);
    ctx.fill();
  };
  const poly = (pts: Pt[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)));
    ctx.closePath();
    ctx.fill();
  };
  const legLine = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.strokeStyle = HEN.leg;
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.beginPath();
    ctx.moveTo(cx + x0 * s, cy + y0 * s);
    ctx.lineTo(cx + x1 * s, cy + y1 * s);
    ctx.stroke();
  };
  const comb = (x: number, y: number) => {
    blob(x - 0.025, y, 0.022, 0.022, HEN.comb);
    blob(x, y - 0.012, 0.024, 0.024, HEN.comb);
    blob(x + 0.025, y, 0.02, 0.02, HEN.comb);
  };

  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.25, s * 0.16, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  if (rig.dir === "left" || rig.dir === "right") {
    withFacing(ctx, cx, rig.dir, () => {
      // Legs: thin shins stepping, toes spread forward
      const leg = (off: number, phase: number) => {
        const a = walking ? Math.sin(phase) * 0.55 : 0.05;
        const hx = off, hy = 0.12 + bob;
        const fx = hx + Math.sin(a) * 0.13, fy = hy + Math.cos(a) * 0.13 - (walking ? Math.max(0, Math.cos(phase)) * 0.03 : 0);
        legLine(hx, hy, fx, fy);
        legLine(fx, fy, fx + 0.05, fy);
        legLine(fx, fy, fx - 0.03, fy);
      };
      leg(-0.03, ph + Math.PI);
      // Tail feathers, body, wing
      poly([[-0.13, 0.0 + bob], [-0.25, -0.15 + bob], [-0.2, -0.02 + bob], [-0.1, 0.06 + bob]], HEN.shade);
      blob(-0.02, 0.03 + bob, 0.17, 0.13, HEN.body);
      blob(-0.02, 0.09 + bob, 0.13, 0.05, HEN.shade);
      ctx.save();
      ctx.translate(cx - s * 0.06, cy + s * (0.0 + bob));
      ctx.rotate(-flap);
      ctx.fillStyle = HEN.wing;
      ctx.beginPath();
      ctx.ellipse(s * 0.03, s * 0.04, s * 0.1, s * 0.06, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      leg(0.03, ph);
      // Neck and head: bob forward with each step, dip to peck
      const hx = 0.12 + (walking ? Math.sin(ph * 2) * 0.03 : 0) + peck * 0.08;
      const hy = -0.1 + peck * 0.2 + bob;
      ctx.strokeStyle = HEN.body;
      ctx.lineWidth = s * 0.09;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.06, cy + s * (-0.0 + bob));
      ctx.lineTo(cx + hx * s, cy + hy * s);
      ctx.stroke();
      blob(hx, hy, 0.075, 0.07, HEN.body);
      comb(hx - 0.01, hy - 0.07);
      poly([[hx + 0.06, hy - 0.015], [hx + 0.13, hy + 0.01], [hx + 0.06, hy + 0.03]], HEN.beak);
      blob(hx + 0.055, hy + 0.06, 0.018, 0.028, HEN.comb);
      blob(hx + 0.02, hy - 0.015, 0.013, 0.013, HEN.eye);
    });
    return;
  }

  const stepLift = (phase: number) => (walking ? Math.max(0, Math.cos(phase)) * 0.03 : 0);
  const legsV = () => {
    for (const [x, p] of [[-0.05, ph], [0.05, ph + Math.PI]] as const) {
      const fy = 0.25 - stepLift(p);
      legLine(x, 0.12 + bob, x, fy);
      legLine(x, fy, x - 0.025, fy + 0.015);
      legLine(x, fy, x + 0.025, fy + 0.015);
    }
  };
  if (rig.dir === "down") {
    legsV();
    blob(-0.13, 0.04 + bob, 0.05, 0.08, HEN.wing, 0.3 - flap);
    blob(0.13, 0.04 + bob, 0.05, 0.08, HEN.wing, -0.3 + flap);
    blob(0, 0.04 + bob, 0.14, 0.13, HEN.body);
    const hy = -0.1 + peck * 0.14 + bob;
    blob(0, hy, 0.075, 0.07, HEN.body);
    comb(0, hy - 0.075);
    blob(-0.03, hy - 0.01, 0.012, 0.012, HEN.eye);
    blob(0.03, hy - 0.01, 0.012, 0.012, HEN.eye);
    poly([[-0.025, hy + 0.015], [0.025, hy + 0.015], [0, hy + 0.06]], HEN.beak);
    blob(0, hy + 0.075, 0.018, 0.022, HEN.comb);
  } else {
    const hy = -0.1 + peck * 0.1 + bob;
    blob(0, hy, 0.07, 0.065, HEN.body);
    comb(0, hy - 0.07);
    legsV();
    blob(-0.13, 0.04 + bob, 0.05, 0.08, HEN.wing, 0.3 - flap);
    blob(0.13, 0.04 + bob, 0.05, 0.08, HEN.wing, -0.3 + flap);
    blob(0, 0.04 + bob, 0.14, 0.13, HEN.body);
    poly([[-0.09, 0.02 + bob], [0, -0.16 + bob], [0.09, 0.02 + bob]], HEN.shade);
  }
}
