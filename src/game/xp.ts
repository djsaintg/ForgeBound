import type { SkillId } from "./types";

/**
 * The classic XP curve: XP to reach level L is
 * sum over n=1..L-1 of floor((n + 300 * 2^(n/7)) / 4)
 * Level 2 = 83 XP, level 99 = 13,034,431 XP.
 */
const XP_TABLE: number[] = [0]; // index = level - 1
{
  let acc = 0;
  for (let n = 1; n <= 98; n++) {
    acc += Math.floor((n + 300 * Math.pow(2, n / 7)) / 4);
    XP_TABLE.push(acc);
  }
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level >= 99) return XP_TABLE[98];
  return XP_TABLE[level - 1];
}

export function levelForXp(xp: number): number {
  for (let l = 98; l >= 1; l--) {
    if (xp >= XP_TABLE[l]) return l + 1;
  }
  return 1;
}

export function progressIntoLevel(xp: number): { pct: number; cur: number; next: number } {
  const lvl = levelForXp(xp);
  if (lvl >= 99) return { pct: 1, cur: xp, next: xp };
  const base = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return { pct: Math.min(1, (xp - base) / (next - base)), cur: xp - base, next: next - base };
}

export const MAX_XP = XP_TABLE[98];

export interface SkillMeta {
  id: SkillId;
  name: string;
  icon: string;
  color: string;
  impl: boolean;
}

/** Classic skill list order, with the five live skills flagged. */
export const SKILLS: SkillMeta[] = [
  { id: "attack", name: "Attack", icon: "⚔", color: "#a83232", impl: true },
  { id: "hitpoints", name: "Constitution", icon: "♥", color: "#c24848", impl: true },
  { id: "mining", name: "Mining", icon: "⛏", color: "#8a8f98", impl: true },
  { id: "strength", name: "Strength", icon: "👊", color: "#4f8f3a", impl: true },
  { id: "agility", name: "Agility", icon: "➤", color: "#3a5f8f", impl: false },
  { id: "smithing", name: "Smithing", icon: "🔨", color: "#c98a3a", impl: true },
  { id: "defence", name: "Defence", icon: "🛡", color: "#7a8fc2", impl: true },
  { id: "herblore", name: "Herblore", icon: "🌿", color: "#3a8f5f", impl: false },
  { id: "fishing", name: "Fishing", icon: "🐟", color: "#4a9db8", impl: true },
  { id: "ranged", name: "Ranged", icon: "🏹", color: "#5f8f3a", impl: false },
  { id: "crafting", name: "Crafting", icon: "✂", color: "#b89a4a", impl: false },
  { id: "cooking", name: "Cooking", icon: "🍳", color: "#c2703a", impl: true },
  { id: "prayer", name: "Prayer", icon: "✦", color: "#d8d2c0", impl: true },
  { id: "woodcutting", name: "Woodcutting", icon: "🪓", color: "#6e8f3a", impl: true },
  { id: "magic", name: "Magic", icon: "◆", color: "#5a5fc2", impl: false },
  { id: "fletching", name: "Fletching", icon: "🪶", color: "#7a6a4a", impl: false },
  { id: "runecrafting", name: "Runecrafting", icon: "◈", color: "#b8b05a", impl: false },
  { id: "construction", name: "Construction", icon: "🏠", color: "#a86432", impl: false },
  { id: "dungeoneering", name: "Dungeoneering", icon: "◎", color: "#9a5ab8", impl: false },
  { id: "slayer", name: "Slayer", icon: "💀", color: "#6a6a72", impl: false },
  { id: "farming", name: "Farming", icon: "🌾", color: "#5aa832", impl: false },
  { id: "thieving", name: "Thieving", icon: "🗝", color: "#7a4a8f", impl: false },
];

export const SKILL_BY_ID: Record<string, SkillMeta> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
);

export function totalLevel(xp: Record<SkillId, number>): number {
  return SKILLS.reduce((sum, s) => sum + levelForXp(xp[s.id] ?? 0), 0);
}

export function fmt(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}
