// Skill guides, built from the game's own data tables so new trees, rocks,
// recipes and gear show up in them without touching this file.
import type { ItemCat, ItemId, SkillId } from "./types";
import { BURY_XP, FOES, ITEMS, RECIPES, RESOURCES, STATION_NAMES, SWING_SPEED, TOOL_SPEED } from "./data";

export interface GuideRow {
  label: string;
  /** Level needed; rows without one are always open. */
  level?: number;
  item?: ItemId;
  detail: string;
}

export interface GuideSection {
  title: string;
  rows: GuideRow[];
}

const speedUp = (mul: number) => `×${(1 / mul).toFixed(2).replace(/\.?0+$/, "")} speed`;

const byLevel = (a: GuideRow, b: GuideRow) => (a.level ?? 0) - (b.level ?? 0);

/** Every item of a category, lowest tier first. */
const itemsOf = (cat: ItemCat) =>
  (Object.values(ITEMS)).filter((d) => d.cat === cat).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));

const STATION_TITLE = { furnace: "At the furnace", anvil: "At the anvil", fire: "Over the campfire" } as const;

export function skillGuide(skill: SkillId): { sections: GuideSection[]; notes: string[] } {
  const sections: GuideSection[] = [];
  const notes: string[] = [];

  // Gathering: what you can chop, mine or catch
  const res = Object.values(RESOURCES).filter((r) => r.skill === skill);
  if (res.length) {
    sections.push({
      title: "Resources",
      rows: res
        .map((r) => ({
          label: r.name,
          level: r.level,
          item: r.item,
          detail: `${ITEMS[r.item].name} · +${r.xp} xp${r.key === "trout" ? " · uses a feather" : ""}`,
        }))
        .sort(byLevel),
    });
  }

  // Tools that speed the gathering up
  const tools = [...new Set(res.map((r) => r.tool).filter((t): t is "axe" | "pick" | "rod" => !!t))];
  const toolRows: GuideRow[] = tools.flatMap((cat) =>
    itemsOf(cat).map((d) => ({
      label: d.name,
      level: d.wield?.level ?? 1,
      item: d.id,
      detail: cat === "rod" ? "needed for trout" : speedUp(TOOL_SPEED[d.tier ?? 1] ?? 1),
    }))
  );
  if (toolRows.length) sections.push({ title: "Tools", rows: toolRows });

  // Production: recipes, grouped by where they're made
  const recipes = RECIPES.filter((r) => r.skill === skill);
  for (const station of [...new Set(recipes.map((r) => r.station))]) {
    sections.push({
      title: STATION_TITLE[station] ?? STATION_NAMES[station],
      rows: recipes
        .filter((r) => r.station === station)
        .map((r) => {
          const inputs = Object.entries(r.inputs).map(([id, n]) => `${n}× ${ITEMS[id as ItemId].name.toLowerCase()}`).join(" + ");
          const heal = ITEMS[r.output].heal;
          return {
            label: ITEMS[r.output].name,
            level: r.level,
            item: r.output,
            detail: `${inputs} · +${r.xp} xp${heal ? ` · heals ${heal}` : ""}`,
          };
        })
        .sort(byLevel),
    });
  }

  const foes: GuideSection = {
    title: "Foes",
    rows: Object.values(FOES).map((f) => ({ label: f.name, detail: `level ${f.level} · ${f.hp} HP` })),
  };

  switch (skill) {
    case "attack":
      sections.push({
        title: "Weapons",
        rows: itemsOf("weapon").map((d) => ({ label: d.name, level: d.wield?.level ?? 1, item: d.id, detail: speedUp(SWING_SPEED[d.tier ?? 1] ?? 1) + " swing" })),
      }, foes);
      notes.push("Higher Attack lands hits more often. Choose what melee trains in the Gear tab.");
      break;
    case "strength":
      sections.push(foes);
      notes.push("Higher Strength and better weapons raise your maximum hit.");
      break;
    case "defence":
      sections.push({
        title: "Armour",
        rows: itemsOf("armor").map((d) => ({ label: d.name, level: d.wield?.level ?? 1, item: d.id, detail: "sometimes turns a blow aside" })),
      });
      notes.push("Defence is earned from the blows you take in a fight.");
      break;
    case "hitpoints":
      sections.push({
        title: "Food",
        rows: itemsOf("food")
          .sort((a, b) => (a.heal ?? 0) - (b.heal ?? 0))
          .map((d) => ({ label: d.name, item: d.id, detail: `heals ${d.heal} HP` })),
      });
      notes.push("Every hit you land trains Hitpoints. Eat food from your backpack to heal.");
      break;
    case "prayer":
      sections.push({
        title: "Offerings",
        rows: [{ label: "Bury bones", level: 1, item: "bones", detail: `+${BURY_XP} xp each` }],
      });
      notes.push("Bones drop from every foe. Blessings and altars are being forged.");
      break;
  }

  return { sections, notes };
}
