import type { GameState } from "./types";
import { RECIPE_BY_ID, RESOURCES } from "./data";
import { gearFor, type GearShape, type Metal } from "./gear";

// Which animation the hero plays for the current action, and the strike
// schedule it follows. Shared by the renderer (poses, impact particles) and
// the game loop (impact sounds) so both land on the same frame.

export type Job = "chop" | "mine" | "fish_rod" | "fish_net" | "smelt" | "smith" | "cook" | "stab" | "slash" | "punch";

export function jobOf(g: GameState): Job | null {
  const a = g.action;
  if (!a) return null;
  if (a.kind === "combat") {
    const w = g.equipped?.weapon ?? "";
    return w.endsWith("_dagger") ? "stab" : w.endsWith("_sword") ? "slash" : "punch";
  }
  if (a.kind === "gather") {
    const skill = RESOURCES[a.res].skill;
    if (skill === "woodcutting") return "chop";
    if (skill === "mining") return "mine";
    return RESOURCES[a.res].tool === "rod" ? "fish_rod" : "fish_net";
  }
  const station = RECIPE_BY_ID[a.recipe]?.station;
  return station === "anvil" ? "smith" : station === "furnace" ? "smelt" : "cook";
}

/** Strikes per action cycle; the last one lands exactly as the cycle completes. */
export const STRIKES: Record<Job, number> = {
  chop: 2, mine: 2, smith: 4, stab: 1, slash: 1, punch: 1,
  fish_rod: 0, fish_net: 0, smelt: 0, cook: 0,
};

/** How many strikes have landed so far this cycle. */
export const strikesDone = (progress: number, cycle: number, job: Job) =>
  Math.floor((Math.min(progress, cycle) / cycle) * STRIKES[job]);

/** The tool drawn in hand for a job, tinted by the equipped tier. */
export function toolFor(g: GameState, job: Job | null): { shape: GearShape; metal: Metal } | null {
  const eq = (slot: "axe" | "pick" | "weapon") => {
    const id = g.equipped?.[slot];
    return id ? gearFor(id) : null;
  };
  switch (job) {
    case "chop": return eq("axe") ?? { shape: "axe", metal: "bronze" };
    case "mine": return eq("pick") ?? { shape: "pick", metal: "bronze" };
    case "fish_rod": return { shape: "rod", metal: "iron" };
    case "fish_net": return { shape: "net", metal: "iron" };
    case "smith": return { shape: "hammer", metal: "iron" };
    case "cook": return { shape: "pan", metal: "iron" };
    case "stab":
    case "slash": return eq("weapon");
    case "smelt":
    case "punch": return null;
    default: return eq("weapon"); // idle / walking: carry the weapon
  }
}

/** Set when bones are buried; the hero kneels for a moment. */
export const emote = { buryAt: -1e9 };
export const BURY_MS = 700;
