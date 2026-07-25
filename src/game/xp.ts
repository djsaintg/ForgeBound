import type { SkillId } from "./types";

/**
 * The classic XP curve: XP to reach level L is
 * sum over n=1..L-1 of floor((n + 300 * 2^(n/7)) / 4)
 * Level 2 = 83 XP, level 99 = 13,034,431 XP.
 */
const XP_TABLE: number[] = [0]; // index = level - 1
{
  let acc = 0;
  for (let n = 1; n <= 99; n++) {
    acc += Math.floor(n + 300 * Math.pow(2, n / 7));
    XP_TABLE.push(Math.floor(acc / 4));
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
  return {
    pct: Math.min(1, Math.max(0, (xp - base) / (next - base))),
    cur: xp - base,
    next: next - base,
  };
}

export const MAX_XP = XP_TABLE[98];

export interface SkillMeta {
  id: SkillId;
  name: string;
  icon: string;
  color: string;
  impl: boolean;
}

/** Classic skill list order, with active skilling & combat flags. */
export const SKILLS: SkillMeta[] = [
  { id: "attack", name: "Attack", icon: "⚔️", color: "#e05252", impl: true },
  { id: "hitpoints", name: "Constitution", icon: "❤️", color: "#e84a4a", impl: true },
  { id: "mining", name: "Mining", icon: "⛏️", color: "#8a9ba8", impl: true },
  { id: "strength", name: "Strength", icon: "👊", color: "#5ea84a", impl: true },
  { id: "agility", name: "Agility", icon: "🏃", color: "#457bd6", impl: false },
  { id: "smithing", name: "Smithing", icon: "🔨", color: "#d19747", impl: true },
  { id: "defence", name: "Defence", icon: "🛡️", color: "#8b9fd4", impl: true },
  { id: "herblore", name: "Herblore", icon: "🌿", color: "#48a870", impl: false },
  { id: "fishing", name: "Fishing", icon: "🐟", color: "#4db8cf", impl: true },
  { id: "ranged", name: "Ranged", icon: "🏹", color: "#74a848", impl: false },
  { id: "crafting", name: "Crafting", icon: "✂️", color: "#cca954", impl: false },
  { id: "cooking", name: "Cooking", icon: "🍳", color: "#cf7a42", impl: true },
  { id: "prayer", name: "Prayer", icon: "✨", color: "#e2dcc8", impl: true },
  { id: "woodcutting", name: "Woodcutting", icon: "🪓", color: "#7ea643", impl: true },
  { id: "magic", name: "Magic", icon: "🔮", color: "#6a70d6", impl: false },
  { id: "fletching", name: "Fletching", icon: "🪶", color: "#8c7b57", impl: false },
  { id: "runecrafting", name: "Runecrafting", icon: "◈", color: "#c9c263", impl: false },
  { id: "construction", name: "Construction", icon: "🏠", color: "#ba733a", impl: false },
  { id: "dungeoneering", name: "Dungeoneering", icon: "◎", color: "#aa63cc", impl: false },
  { id: "slayer", name: "Slayer", icon: "💀", color: "#757580", impl: false },
  { id: "farming", name: "Farming", icon: "🌾", color: "#6cc23e", impl: false },
  { id: "thieving", name: "Thieving", icon: "🗝️", color: "#8a57a1", impl: false },
];

export const SKILL_BY_ID: Record<SkillId, SkillMeta> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
) as Record<SkillId, SkillMeta>;

export function totalLevel(xp: Record<SkillId, number>): number {
  return SKILLS.reduce((sum, s) => sum + levelForXp(xp[s.id] ?? 0), 0);
}

export function fmt(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}
