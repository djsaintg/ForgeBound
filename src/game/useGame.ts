import { useCallback, useMemo, useRef, useState } from "react";
import { VERSION } from "../version";
import type {
  Action,
  ChatKind,
  GameState,
  InvSlot,
  ItemId,
  RecipeId,
  ResKey,
  SkillId,
  StationId,
} from "./types";
import {
  ITEMS,
  MARO_LINES,
  OBJ_TO_RES,
  OBJ_TO_STATION,
  RECIPE_BY_ID,
  RESOURCES,
  SELL_RATIO,
  TOOL_SPEED,
} from "./data";
import { COW_SPAWNS, CHICKEN_SPAWNS, GOBLIN_SPAWNS, MAP_H, MAP_W, SPAWN, objAt, walkable } from "./map";
import { adjacentTo, findPath } from "./pathfinding";
import { MAX_XP, SKILLS, SKILL_BY_ID, fmt, levelForXp } from "./xp";
import { sfx } from "./audio";

export const SAVE_KEY = "forgebound-save-v1";
const STEP_MS = 168;
const SAVE_VERSION = 1;
let uid = 100;
const nextId = () => uid++;

function findObjChar(ch: string): { x: number; y: number } | null {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (objAt(x, y) === ch) return { x, y };
    }
  }
  return null;
}

const STATION_POS: Partial<Record<StationId, { x: number; y: number }>> = {};
for (const ch of ["F", "A", "*"]) {
  const p = findObjChar(ch);
  if (p) STATION_POS[OBJ_TO_STATION[ch] as StationId] = p;
}

function baseXp(): Record<SkillId, number> {
  const xp = {} as Record<SkillId, number>;
  for (const s of SKILLS) xp[s.id] = 0;
  xp.hitpoints = 1154; // starts at level 10, classic way
  return xp;
}

export function freshState(name: string): GameState {
  const inv: (InvSlot | null)[] = new Array(28).fill(null);
  inv[0] = { item: "bronze_axe", n: 1 };
  inv[1] = { item: "bronze_pick", n: 1 };
  inv[2] = { item: "bronze_sword", n: 1 }; // Combat starter sword!

  return {
    version: SAVE_VERSION,
    name: name.trim().slice(0, 14) || "Adventurer",
    coins: 25,
    hp: 20,
    maxHp: 20,
    xp: baseXp(),
    inv,
    bank: {},
    equipped: { axe: "bronze_axe", pick: "bronze_pick", weapon: "bronze_sword" },
    x: SPAWN.x,
    y: SPAWN.y,
    path: [],
    action: null,
    pendingStation: null,
    stationUI: null,
    depleted: {},
    chat: [],
    xpEvents: [],
    floats: [],
    levelUps: [],
    bankOpen: false,
    shopOpen: false,
    settingsOpen: false,
    cows: COW_SPAWNS.map((c, idx) => ({ id: idx + 1, x: c.x, y: c.y, dx: c.x, dy: c.y, hp: 8, maxHp: 8, respawn: 0, nextMove: 0, moo: 0 })),
    chickens: CHICKEN_SPAWNS.map((c, idx) => ({ id: idx + 20, x: c.x, y: c.y, dx: c.x, dy: c.y, hp: 3, maxHp: 3, respawn: 0, nextMove: 0, cluck: 0, nextEgg: 15000 + idx * 4000 })),
    goblins: GOBLIN_SPAWNS.map((g, idx) => {
      const brigand = idx >= 5; // the two deep-gully Bramble Brigands
      return { id: idx + 50, x: g.x, y: g.y, dx: g.x, dy: g.y, hp: brigand ? 22 : 12, maxHp: brigand ? 22 : 12, respawn: 0, nextMove: 0, grunt: 0 };
    }),
    groundItems: [
      // Starter wild farm egg sitting in the coop straw
      { id: nextId(), item: "egg", n: 1, x: 43, y: 27, t: performance.now() },
    ],
    counters: { gathered: 0, made: 0, kills: 0 },
    zoom: 2.2,
    graphicsMode: "64bit",
  };
}

export function saveGame(g: GameState): boolean {
  try {
    const payload = {
      version: SAVE_VERSION,
      name: g.name,
      coins: g.coins,
      hp: g.hp,
      xp: g.xp,
      inv: g.inv,
      bank: g.bank,
      equipped: g.equipped,
      x: g.x,
      y: g.y,
      counters: g.counters,
      zoom: g.zoom,
      graphicsMode: g.graphicsMode,
      groundItems: g.groundItems,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.version !== SAVE_VERSION) return null;
    const g = freshState(p.name ?? "Adventurer");
    g.coins = Number(p.coins) || 0;
    g.hp = Number(p.hp) || 20;
    g.xp = { ...baseXp(), ...(p.xp ?? {}) };
    if (Array.isArray(p.inv)) {
      for (let i = 0; i < 28; i++) g.inv[i] = p.inv[i] ?? null;
    }
    g.bank = p.bank ?? {};
    g.equipped = p.equipped ?? {};
    g.x = Number(p.x) ?? SPAWN.x;
    g.y = Number(p.y) ?? SPAWN.y;
    // Migrate pre-expansion saves (core coords) into the padded map space
    if (g.x < 8) { g.x += 8; g.y += 8; }
    g.counters = p.counters ?? { gathered: 0, made: 0, kills: 0 };
    if (typeof p.zoom === "number") g.zoom = p.zoom;
    if (p.graphicsMode) g.graphicsMode = p.graphicsMode;
    if (Array.isArray(p.groundItems)) g.groundItems = p.groundItems;
    return g;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** True when a restorable save already lives in this browser. */
export function hasSave(): boolean {
  return !!loadGame();
}

export function useGame() {
  const gref = useRef<GameState | null>(null);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const moveAcc = useRef(0);
  const cowSeed = useRef(Math.random() * 1000);

  const g = (): GameState => {
    if (!gref.current) throw new Error("game not initialised");
    return gref.current;
  };

  const chat = useCallback((kind: ChatKind, text: string) => {
    const gg = g();
    gg.chat.push({ id: nextId(), kind, text });
    if (gg.chat.length > 90) gg.chat.splice(0, gg.chat.length - 90);
  }, []);

  const addFloat = (text: string, color: string, dx = 0, dy = 0) => {
    const gg = g();
    gg.floats.push({
      x: gg.x + dx + (Math.random() * 0.4 - 0.2),
      y: gg.y + dy - 0.4,
      text,
      color,
      t: performance.now(),
    });
  };

  const gainXp = (skill: SkillId, amount: number) => {
    const gg = g();
    const before = levelForXp(gg.xp[skill]);
    gg.xp[skill] = Math.min(MAX_XP, (gg.xp[skill] || 0) + amount);
    const after = levelForXp(gg.xp[skill]);
    gg.xpEvents.push({ id: nextId(), skill, amount, t: performance.now() });
    if (gg.xpEvents.length > 24) gg.xpEvents.splice(0, gg.xpEvents.length - 24);
    addFloat(`+${fmt(amount)} xp`, "rgb(255,215,80)", Math.random() - 0.5);
    if (after > before) {
      gg.levelUps.push({ skill, level: after });
      chat("sys", `Huzzah! ${gg.name} reached level ${after} ${SKILL_BY_ID[skill]?.name || skill}!`);
      sfx.levelUp();
    }
  };

  const freeSlots = (gg: GameState) => gg.inv.filter((s) => s === null).length;

  const addItem = (id: ItemId, n = 1): number => {
    const gg = g();
    const def = ITEMS[id] || { stackable: false };
    let left = n;
    if (def.stackable || id === "coins" || id === "feathers") {
      if (id === "coins") {
        gg.coins += n;
        return n;
      }
      const slot = gg.inv.find((s) => s?.item === id);
      if (slot) {
        slot.n += left;
        return n;
      }
    }
    for (let i = 0; i < gg.inv.length && left > 0; i++) {
      if (gg.inv[i] === null) {
        gg.inv[i] = { item: id, n: 1 };
        left--;
      }
    }
    return n - left;
  };

  const countItem = (id: ItemId): number =>
    g().inv.reduce((sum, s) => (s && s.item === id ? sum + s.n : sum), 0);

  const removeItems = (inputs: Partial<Record<ItemId, number>>): boolean => {
    const gg = g();
    for (const [id, n] of Object.entries(inputs)) {
      if (countItem(id as ItemId) < (n ?? 0)) return false;
    }
    for (const [id, n] of Object.entries(inputs)) {
      let left = n ?? 0;
      for (let i = gg.inv.length - 1; i >= 0 && left > 0; i--) {
        const s = gg.inv[i];
        if (!s || s.item !== id) continue;
        const take = Math.min(s.n, left);
        s.n -= take;
        left -= take;
        if (s.n <= 0) gg.inv[i] = null;
      }
    }
    return true;
  };

  const toolTier = (cat: "axe" | "pick" | "rod" | "weapon" | "armor"): number => {
    const eq = g().equipped[cat];
    return eq && ITEMS[eq]?.tier ? ITEMS[eq].tier! : 0;
  };

  /** Melee swing-speed multiplier by weapon tier — bare hands are slowest. */
  const swingMul = (tier: number): number => [1.5, 1, 0.9, 0.8, 0.7][tier] ?? 1;

  const ensureTool = (tool?: "axe" | "pick" | "rod"): boolean => {
    if (!tool) return true;
    const gg = g();
    if (gg.equipped[tool]) return true;
    const idx = gg.inv.findIndex((s) => s && ITEMS[s.item]?.cat === tool);
    if (idx === -1) {
      const names: Record<string, string> = { axe: "an axe", pick: "a pickaxe", rod: "a fly fishing rod" };
      chat("err", `Requires ${names[tool]} — Roka the trader sells them in Vale Square.`);
      sfx.error();
      return false;
    }
    const item = gg.inv[idx]!;
    gg.inv[idx] = null;
    gg.equipped[tool] = item.item;
    chat("info", `You wield the ${ITEMS[item.item].name.toLowerCase()}.`);
    return true;
  };

  const cancelAction = () => {
    const gg = g();
    gg.action = null;
    gg.pendingStation = null;
  };

  const handleWorldClick = (x: number, y: number): "handled" | "walk" => {
    const gg = g();
    gg.bankOpen = false;
    gg.shopOpen = false;
    gg.stationUI = null;
    cancelAction();

    // 1. Check if user clicked on a Ground Loot Item (Egg, Bones, Sword, Feathers, Gold!)
    const gItemIdx = (gg.groundItems || []).findIndex(
      (gi) => Math.round(gi.x) === x && Math.round(gi.y) === y
    );
    if (gItemIdx !== -1) {
      const gItem = gg.groundItems[gItemIdx];
      if (!adjacentTo(gg.x, gg.y, x, y)) {
        const p = findPath(gg.x, gg.y, x, y);
        if (p) {
          gg.path = p;
          chat("info", `Walking over to pick up ${ITEMS[gItem.item]?.name || gItem.item}...`);
        }
      } else {
        // Pick it up immediately!
        if (gItem.item !== "coins" && freeSlots(gg) < 1 && !ITEMS[gItem.item]?.stackable) {
          chat("err", "Your backpack is full, cannot pick up loot!");
          sfx.error();
          return "handled";
        }
        const added = addItem(gItem.item, gItem.n);
        if (added > 0) {
          gg.groundItems.splice(gItemIdx, 1);
          sfx.coin();
          const itemName = ITEMS[gItem.item]?.name.toLowerCase() || gItem.item;
          chat("info", `${gg.name} picked up ${gItem.n > 1 ? gItem.n + "× " : ""}${itemName} from the ground.`);
        }
      }
      return "handled";
    }

    // 2. Cows Check & Combat Initiation
    for (const c of gg.cows) {
      if (Math.round(c.x) === x && Math.round(c.y) === y) {
        if (c.hp <= 0) {
          chat("info", "The defeated cow is waiting for respawn...");
          return "handled";
        }
        c.moo = performance.now() + 1000;
        sfx.moo();
        const p = findPath(gg.x, gg.y, x, y);
        if (p) gg.path = p;
        gg.action = { kind: "combat", targetKind: "cow", targetId: c.id, progress: 0, cycle: Math.round(1800 * swingMul(toolTier("weapon"))) };
        chat("info", `${gg.name} raises their weapon and attacks the pasture cow! Moo!`);
        return "handled";
      }
    }

    // 3. Chickens Check & Combat Initiation (S.E. Coop)
    if (gg.chickens) {
      for (const ch of gg.chickens) {
        if (Math.round(ch.x) === x && Math.round(ch.y) === y) {
          if (ch.hp <= 0) {
            chat("info", "The coop hen is regenerating...");
            return "handled";
          }
          ch.cluck = performance.now() + 1000;
          sfx.click();
          const p = findPath(gg.x, gg.y, x, y);
          if (p) gg.path = p;
          gg.action = { kind: "combat", targetKind: "chicken", targetId: ch.id, progress: 0, cycle: Math.round(1600 * swingMul(toolTier("weapon"))) };
          chat("info", `${gg.name} attacks the coop hen! "Cluck cluck!" 🐔`);
          return "handled";
        }
      }
    }

    // 4. Goblins Check & Combat Initiation (N.E. Village)
    if (gg.goblins) {
      for (const gb of gg.goblins) {
        if (Math.round(gb.x) === x && Math.round(gb.y) === y) {
          if (gb.hp <= 0) {
            chat("info", "The fallen goblin warrior is regenerating at camp...");
            return "handled";
          }
          gb.grunt = performance.now() + 1200;
          sfx.swing();
          const p = findPath(gg.x, gg.y, x, y);
          if (p) gg.path = p;
          gg.action = { kind: "combat", targetKind: "goblin", targetId: gb.id, progress: 0, cycle: Math.round(2000 * swingMul(toolTier("weapon"))) };
          const taunts = [
            `Goblin Warrior grunts fiercely! "Human dare challenge N.E. clan?!"`,
            `Goblin Warrior raises spiked club! "You pay shiny gold for trespassing!"`,
          ];
          chat("npc", taunts[Math.floor(Math.random() * taunts.length)]);
          chat("info", `${gg.name} charges into combat against the Goblin Warrior!`);
          return "handled";
        }
      }
    }

    const ch = objAt(x, y);
    if (ch === "H") {
      chat("info", "A rustic hide goblin tent adorned with boar tusks and tribal pennants.");
      sfx.click();
      return "handled";
    }
    if (ch === "V") {
      chat("info", "A tribal bone banner displaying the crest of the North-East Goblin Clan.");
      sfx.click();
      return "handled";
    }
    if (ch === "c" || ch === "h") {
      chat("info", ch === "c" ? "A wooden chicken hen house full of roosting feathers and straw." : "A golden hay bale stacked in the farm coop.");
      sfx.click();
      return "handled";
    }

    if (ch === "M" || ch === "P") {
      const go = () => {
        gg.path = findPath(gg.x, gg.y, x, y) ?? [];
        gg.pendingStation = { kind: ch === "M" ? "shop" : "shop", x, y };
      };
      if (ch === "P") {
        const idx = Math.floor(cowSeed.current++) % MARO_LINES.length;
        chat("npc", `Old Maro: ${MARO_LINES[idx]}`);
        sfx.click();
        return "handled";
      }
      if (adjacentTo(gg.x, gg.y, x, y)) {
        gg.shopOpen = true;
        sfx.click();
      } else go();
      return "handled";
    }

    if (ch === "B") {
      if (adjacentTo(gg.x, gg.y, x, y)) {
        gg.bankOpen = true;
        sfx.click();
      } else {
        gg.path = findPath(gg.x, gg.y, x, y) ?? [];
        gg.pendingStation = { kind: "bank", x, y };
      }
      return "handled";
    }

    const station = OBJ_TO_STATION[ch];
    if (station && station !== "bank") {
      if (adjacentTo(gg.x, gg.y, x, y)) {
        gg.stationUI = { station: station as StationId, x, y };
        sfx.click();
      } else {
        gg.path = findPath(gg.x, gg.y, x, y) ?? [];
        gg.pendingStation = { kind: "craft", station: station as StationId, x, y };
      }
      return "handled";
    }

    const res = OBJ_TO_RES[ch];
    if (res) {
      startGather(x, y, res);
      return "handled";
    }
    return "walk";
  };

  const startGather = (x: number, y: number, res: ResKey) => {
    const gg = g();
    const def = RESOURCES[res];
    if (levelForXp(gg.xp[def.skill]) < def.level) {
      chat("err", `Requires level ${def.level} ${SKILL_BY_ID[def.skill].name}.`);
      sfx.error();
      return;
    }
    // Trout flies are feathered: each catch consumes one feather
    if (res === "trout" && countItem("feathers") < 1) {
      chat("err", "Your fly is bare — every trout cast consumes a feather. The coop hens shed them.");
      sfx.error();
      return;
    }
    if (!ensureTool(def.tool)) return;
    if (freeSlots(gg) < 1) {
      chat("err", "Your pack is completely full!");
      sfx.error();
      return;
    }
    const path = findPath(gg.x, gg.y, x, y);
    if (!path) {
      chat("err", "You can't reach that spot.");
      sfx.error();
      return;
    }
    gg.path = path;
    const tt = def.tool ? toolTier(def.tool) : 0;
    const mult = TOOL_SPEED[tt] ?? 1;
    const cycle = Math.round(def.cycle * mult);
    gg.action = { kind: "gather", x, y, res, progress: 0, cycle };
    if (!path.length) {
      chat("info", `${gg.name} ${verb(res)}`);
    }
  };

  const verb = (res: ResKey) => {
    const v: Partial<Record<ResKey, string>> = {
      tree: "swings an axe at the woodland tree…",
      oak: "swings an axe at the ancient oak…",
      copper: "strikes a pick against the copper veins…",
      tin: "strikes a pick against the tin cluster…",
      iron: "swings heavily at the deep iron ore…",
      coal: "excavates the dark coal seam…",
      gold: "breaks into the glittering gold vein…",
      shrimp: "wades out with open palms after agile shrimp…",
      trout: "whips a shining fly line into the trout current…",
    };
    return v[res] ?? "gets to work…";
  };

  const completeGather = (a: Extract<Action, { kind: "gather" }>, now: number) => {
    const gg = g();
    const def = RESOURCES[a.res];
    const key = `${a.x},${a.y}`;
    const until = gg.depleted[key];
    if (until && now < until) {
      gg.action = null;
      chat("err", "The resource is exhausted. Waiting for respawn...");
      return;
    }
    if (freeSlots(gg) < 1) {
      chat("err", "Your inventory is full.");
      gg.action = null;
      return;
    }
    // Feathered fly is spent on a successful trout catch
    if (a.res === "trout") {
      if (countItem("feathers") < 1) {
        chat("err", "Out of feathers — the fly snapped bare mid-cast.");
        gg.action = null;
        return;
      }
      removeItems({ feathers: 1 });
    }
    const added = addItem(def.item, 1);
    if (added <= 0) {
      gg.action = null;
      return;
    }
    gainXp(def.skill, def.xp);
    gg.counters.gathered++;
    if (def.respawn > 0) gg.depleted[key] = now + def.respawn;
    if (def.skill === "fishing") sfx.splash(); else sfx.gather();
    const got: Record<string, string> = {
      logs: "chopped fragrant logs",
      oak_logs: "harvested sturdy oak logs",
      copper_ore: "extracted rich copper ore",
      tin_ore: "extracted sparkling tin ore",
      iron_ore: "mined heavy iron ore",
      coal: "mined pure lumps of coal",
      gold_ore: "mined pure gleaming gold ore",
      raw_shrimp: "scooped up fresh live shrimp",
      raw_trout: "hooked a fine river trout",
    };
    chat("info", `${gg.name} ${got[def.item] ?? "picked up " + ITEMS[def.item].name.toLowerCase()} · +${def.xp} XP`);
    // A felled tree or emptied rock ends the action now, rather than swinging
    // a whole extra cycle at nothing; fishing spots never deplete and repeat.
    if (def.respawn > 0) gg.action = null;
    else a.progress = 0;
  };

  const startRecipe = (id: RecipeId) => {
    const gg = g();
    const r = RECIPE_BY_ID[id];
    if (!gg.stationUI) return;
    if (levelForXp(gg.xp[r.skill]) < r.level) {
      chat("err", `Requires level ${r.level} ${SKILL_BY_ID[r.skill].name}.`);
      sfx.error();
      return;
    }
    for (const [reqId, reqN] of Object.entries(r.inputs)) {
      if (countItem(reqId as ItemId) < (reqN ?? 0)) {
        chat("err", `Requires ${reqN}× ${ITEMS[reqId as ItemId]?.name ?? reqId}.`);
        sfx.error();
        return;
      }
    }
    gg.action = {
      kind: "station",
      x: gg.stationUI.x,
      y: gg.stationUI.y,
      recipe: id,
      progress: 0,
      cycle: r.cycle,
    };
    sfx.click();
    bump();
  };

  const completeStation = (a: Extract<Action, { kind: "station" }>) => {
    const gg = g();
    const r = RECIPE_BY_ID[a.recipe];
    if (!removeItems(r.inputs)) {
      chat("err", "Out of materials.");
      gg.action = null;
      return;
    }
    if (freeSlots(gg) < 1 && !ITEMS[r.output]?.stackable) {
      chat("err", "No space left in inventory!");
      gg.action = null;
      return;
    }
    addItem(r.output, 1);
    gainXp(r.skill, r.xp);
    gg.counters.made++;
    sfx.smith();
    chat("info", `${gg.name} crafted ${ITEMS[r.output]?.name.toLowerCase() || r.output} · +${r.xp} XP`);
    a.progress = 0;
  };

  // --- RS3 Combat Round Processing ---
  const completeCombatRound = (a: Extract<Action, { kind: "combat" }>, now: number) => {
    const gg = g();
    let target: any = null;
    let name = "";
    if (a.targetKind === "cow") {
      target = gg.cows.find((c) => c.id === a.targetId);
      name = "Pasture Cow";
    } else if (a.targetKind === "chicken") {
      target = (gg.chickens || []).find((c) => c.id === a.targetId);
      name = "Coop Hen";
    } else if (a.targetKind === "goblin") {
      target = (gg.goblins || []).find((gb) => gb.id === a.targetId);
      name = "Goblin Warrior";
    }

    if (!target || target.hp <= 0) {
      gg.action = null;
      return;
    }

    // Check if hero is still adjacent
    if (!adjacentTo(gg.x, gg.y, target.x, target.y)) {
      const p = findPath(gg.x, gg.y, target.x, target.y);
      if (p && p.length > 0) {
        gg.path = p;
        return; // move first before hitting
      }
    }

    // 1. Hero Attacks Monster with Accuracy & Strength factor
    const strLvl = levelForXp(gg.xp.strength || 0);
    const attLvl = levelForXp(gg.xp.attack || 0);
    const wpnTier = toolTier("weapon");
    const accuracyRoll = Math.random() + attLvl * 0.02;
    const maxHit = Math.max(2, Math.floor(1 + strLvl / 3 + wpnTier * 1.5));
    const hitDmg = accuracyRoll > 0.15 ? Math.floor(Math.random() * maxHit) + 1 : 0;

    target.hp = Math.max(0, target.hp - hitDmg);
    if (hitDmg > 0) {
      target.hit = now; // drives the white hit-flash in the renderer
      sfx.hit();
      addFloat(`-${hitDmg}`, "rgb(255,80,80)", target.x - gg.x, target.y - gg.y);
      // Grant Combat XP
      gainXp("attack", hitDmg * 4 + 8);
      gainXp("strength", hitDmg * 4 + 8);
      gainXp("hitpoints", Math.round(hitDmg * 2.5 + 4));
      chat("info", `You strike the ${name} for ${hitDmg} damage! (${target.hp}/${target.maxHp} HP remaining)`);
    } else {
      sfx.miss();
      addFloat("Miss", "rgb(165,165,165)", target.x - gg.x, target.y - gg.y);
      chat("info", `Your swing misses the ${name}.`);
    }

    // 2. Check if Monster is Defeated!
    if (target.hp <= 0) {
      target.respawn = now + (a.targetKind === "goblin" ? 18000 : 12000);
      target.diedAt = now; // drives the death-fade in the renderer
      gg.counters.kills = (gg.counters.kills || 0) + 1;
      sfx.kill();

      // Table-driven drop, reported as one combined line.
      if (!gg.groundItems) gg.groundItems = [];
      const gx = Math.round(target.x);
      const gy = Math.round(target.y);
      const parts: string[] = [];

      gg.groundItems.push({ id: nextId(), item: "bones", n: 1, x: gx, y: gy, t: now });
      parts.push("bones");

      if (a.targetKind === "cow") {
        gg.groundItems.push({ id: nextId(), item: "raw_beef", n: 1, x: gx, y: gy, t: now });
        parts.push("raw beef");
      } else if (a.targetKind === "chicken") {
        const feathers = 1 + Math.floor(Math.random() * 2);
        gg.groundItems.push({ id: nextId(), item: "raw_chicken", n: 1, x: gx, y: gy, t: now });
        gg.groundItems.push({ id: nextId(), item: "feathers", n: feathers, x: gx, y: gy, t: now });
        parts.push("raw chicken", `${feathers} feather${feathers > 1 ? "s" : ""}`);
      } else if (a.targetKind === "goblin") {
        const coins = Math.floor(Math.random() * 3) + 1;
        gg.groundItems.push({ id: nextId(), item: "coins", n: coins, x: gx, y: gy, t: now });
        parts.push(`${coins} coin${coins > 1 ? "s" : ""}`);
        const roll = Math.random();
        if (roll < 0.2) {
          gg.groundItems.push({ id: nextId(), item: "bronze_sword", n: 1, x: gx, y: gy, t: now });
          parts.push("a bronze sword!");
        } else if (roll < 0.38) {
          gg.groundItems.push({ id: nextId(), item: "bronze_platebody", n: 1, x: gx, y: gy, t: now });
          parts.push("a bronze platebody!");
        }
      }

      chat("sys", `⚔️ You defeated the ${name} — it drops ${parts.join(", ")}.`);
      gg.action = null;
      return;
    }

    // 3. Surviving Monster Counter-Attacks Hero!
    let enemyMax = 0;
    if (a.targetKind === "cow") enemyMax = 1;
    else if (a.targetKind === "goblin") enemyMax = 3;

    if (enemyMax > 0) {
      const armorBonus = toolTier("armor") * 1;
      let enemyDmg = Math.max(0, Math.floor(Math.random() * (enemyMax + 1)) - (armorBonus > 0 && Math.random() < 0.5 ? 1 : 0));
      if (enemyDmg > 0) {
        gg.hp = Math.max(0, gg.hp - enemyDmg);
        sfx.hurt();
        addFloat(`-${enemyDmg}`, "rgb(80,120,255)", 0, 0); // blue "taken" hitsplat
        gainXp("defence", enemyDmg * 4 + 4);
        chat("err", `The ${name} hits you for ${enemyDmg} damage! (${gg.hp}/${gg.maxHp} HP)`);
        
        if (gg.hp === 0) {
          sfx.death();
          chat("err", "☠️ You were knocked out in combat! Resurrecting at Vale Square...");
          gg.hp = gg.maxHp;
          gg.x = SPAWN.x;
          gg.y = SPAWN.y;
          gg.action = null;
          gg.path = [];
        }
      } else {
        sfx.miss();
        addFloat("Miss", "rgb(165,165,165)", 0, 0);
        chat("info", `The ${name}'s attack misses your defense!`);
      }
    }

    a.progress = 0;
  };

  const clickGround = (x: number, y: number) => {
    const gg = g();
    cancelAction();
    gg.bankOpen = false;
    gg.shopOpen = false;
    gg.stationUI = null;
    const path = findPath(gg.x, gg.y, x, y);
    if (path) {
      gg.path = path;
      sfx.step();
    }
  };

  const update = (dt: number, now: number) => {
    const gg = g();
    if (!gg.groundItems) gg.groundItems = [];
    // Laid eggs spoil after two minutes on the ground
    gg.groundItems = gg.groundItems.filter((gi) => gi.item !== "egg" || now - gi.t < 120000);

    // movement
    if (gg.path.length) {
      moveAcc.current += dt;
      while (moveAcc.current >= STEP_MS && gg.path.length) {
        moveAcc.current -= STEP_MS;
        const t = gg.path.shift()!;
        gg.x = t.x;
        gg.y = t.y;
        sfx.step();
      }
    } else {
      moveAcc.current = 0;
      if (gg.pendingStation && adjacentTo(gg.x, gg.y, gg.pendingStation.x, gg.pendingStation.y)) {
        const p = gg.pendingStation;
        if (p.kind === "bank") gg.bankOpen = true;
        else if (p.kind === "shop") gg.shopOpen = true;
        else if (p.kind === "craft" && p.station) gg.stationUI = { station: p.station, x: p.x, y: p.y };
        sfx.click();
        gg.pendingStation = null;
      }
    }

    // action progression
    if (gg.action) {
      if (gg.action.kind === "combat") {
        gg.action.progress += dt;
        if (gg.action.progress >= gg.action.cycle) {
          completeCombatRound(gg.action, now);
        }
      } else if (gg.path.length) {
        // Still walking over — judge adjacency only once the hero arrives,
        // or every click from more than a tile away is cancelled en route.
      } else if (!adjacentTo(gg.x, gg.y, gg.action.x, gg.action.y)) {
        gg.action = null;
      } else {
        gg.action.progress += dt;
        if (gg.action.progress >= gg.action.cycle) {
          if (gg.action.kind === "gather") completeGather(gg.action, now);
          else completeStation(gg.action);
        }
      }
    }

    // Cows wander & respawn
    for (const c of gg.cows) {
      if (c.hp <= 0) {
        if (now > c.respawn) { c.hp = c.maxHp; c.diedAt = 0; } // respawn!
        continue;
      }
      // Heal slowly once disengaged
      if (c.hp < c.maxHp && !(gg.action?.kind === "combat" && gg.action.targetKind === "cow" && gg.action.targetId === c.id)) {
        c.hp = Math.min(c.maxHp, c.hp + dt / 1500);
      }
      if (c.x === c.dx && c.y === c.dy && now > c.nextMove) {
        if (Math.random() < 0.05) {
          const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
          const d = dirs[Math.floor(Math.random() * dirs.length)];
          const nx = c.x + d.x, ny = c.y + d.y;
          if (nx >= 26 && nx <= 36 && ny >= 12 && ny <= 17 && walkable(nx, ny)) {
            c.dx = nx; c.dy = ny; c.nextMove = now + 4000 + Math.random() * 6000;
          }
        }
      } else if (c.x !== c.dx || c.y !== c.dy) {
        const speed = 0.04;
        if (c.x < c.dx) c.x = Math.min(c.dx, c.x + speed);
        else if (c.x > c.dx) c.x = Math.max(c.dx, c.x - speed);
        if (c.y < c.dy) c.y = Math.min(c.dy, c.y + speed);
        else if (c.y > c.dy) c.y = Math.max(c.dy, c.y - speed);
      }
    }

    // Chickens wander, lay eggs, and respawn (S.E. Coop)
    if (gg.chickens) {
      for (const ch of gg.chickens) {
        if (ch.hp <= 0) {
          if (now > ch.respawn) { ch.hp = ch.maxHp; ch.diedAt = 0; }
          continue;
        }
        if (ch.hp < ch.maxHp && !(gg.action?.kind === "combat" && gg.action.targetKind === "chicken" && gg.action.targetId === ch.id)) {
          ch.hp = Math.min(ch.maxHp, ch.hp + dt / 1200);
        }
        // Egg laying routine! (up to six on the ground at once)
        if (now > (ch.nextEgg || 20000)) {
          if (gg.groundItems.filter((gi) => gi.item === "egg").length < 6) {
            gg.groundItems.push({ id: nextId(), item: "egg", n: 1, x: Math.round(ch.x), y: Math.round(ch.y), t: now });
          }
          ch.nextEgg = now + 22000 + Math.random() * 18000;
        }

        if (ch.x === ch.dx && ch.y === ch.dy && now > ch.nextMove) {
          if (Math.random() < 0.08) {
            const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = ch.x + d.x, ny = ch.y + d.y;
            if (nx >= 41 && nx <= 45 && ny >= 26 && ny <= 29 && walkable(nx, ny)) {
              ch.dx = nx; ch.dy = ny; ch.nextMove = now + 2500 + Math.random() * 4000;
            }
          }
        } else if (ch.x !== ch.dx || ch.y !== ch.dy) {
          const speed = 0.06;
          if (ch.x < ch.dx) ch.x = Math.min(ch.dx, ch.x + speed);
          else if (ch.x > ch.dx) ch.x = Math.max(ch.dx, ch.x - speed);
          if (ch.y < ch.dy) ch.y = Math.min(ch.dy, ch.y + speed);
          else if (ch.y > ch.dy) ch.y = Math.max(ch.dy, ch.y - speed);
        }
      }
    }

    // Goblins patrol & respawn (N.E. Village)
    if (gg.goblins) {
      for (const gb of gg.goblins) {
        if (gb.hp <= 0) {
          if (now > gb.respawn) { gb.hp = gb.maxHp; gb.diedAt = 0; }
          continue;
        }
        if (gb.hp < gb.maxHp && !(gg.action?.kind === "combat" && gg.action.targetKind === "goblin" && gg.action.targetId === gb.id)) {
          gb.hp = Math.min(gb.maxHp, gb.hp + dt / 1800);
        }
        if (gb.x === gb.dx && gb.y === gb.dy && now > gb.nextMove) {
          if (Math.random() < 0.06) {
            const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = gb.x + d.x, ny = gb.y + d.y;
            if (nx >= 44 && nx <= 59 && ny >= 11 && ny <= 17 && walkable(nx, ny)) {
              gb.dx = nx; gb.dy = ny; gb.nextMove = now + 3500 + Math.random() * 5000;
            }
          }
        } else if (gb.x !== gb.dx || gb.y !== gb.dy) {
          const speed = 0.045;
          if (gb.x < gb.dx) gb.x = Math.min(gb.dx, gb.x + speed);
          else if (gb.x > gb.dx) gb.x = Math.max(gb.dx, gb.x - speed);
          if (gb.y < gb.dy) gb.y = Math.min(gb.dy, gb.y + speed);
          else if (gb.y > gb.dy) gb.y = Math.max(gb.dy, gb.y - speed);
        }
      }
    }

    // cleanup expired text / events
    gg.floats = gg.floats.filter((f) => now - f.t < 1400);
    gg.xpEvents = gg.xpEvents.filter((e) => now - e.t < 2000);
  };

  const clickInventorySlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s) return;
    const def = ITEMS[s.item];
    
    // 1. Bury Bones for Prayer XP!
    if (def.cat === "bone" || s.item === "bones") {
      gg.inv[idx] = s.n > 1 ? { item: s.item, n: s.n - 1 } : null;
      gainXp("prayer", 25);
      sfx.bury();
      chat("sys", `${gg.name} buried the bones in reverent prayer · +25 Prayer XP`);
      bump();
      return;
    }

    // 2. Equip Weapon, Armor, Axe, Pick, or Rod!
    if (def.cat === "axe" || def.cat === "pick" || def.cat === "rod" || def.cat === "weapon" || def.cat === "armor") {
      const slot: "weapon" | "axe" | "pick" | "rod" | "armor" = def.cat === "weapon" ? "weapon" : (def.cat === "armor" ? "armor" : def.cat);
      const prev = gg.equipped[slot];
      gg.inv[idx] = null;
      if (prev) {
        const free = gg.inv.findIndex((q) => q === null);
        if (free !== -1) gg.inv[free] = { item: prev, n: 1 };
      }
      gg.equipped[slot] = s.item;
      chat("info", `${gg.name} donned the ${def.name.toLowerCase()}.`);
      sfx.click();
    } else if (def.cat === "food") {
      gg.inv[idx] = s.n > 1 ? { item: s.item, n: s.n - 1 } : null;
      const healAmount = def.heal ?? 3;
      gg.hp = Math.min(gg.maxHp, gg.hp + healAmount);
      chat("info", `${gg.name} heartily ate ${art(def.name)} ${def.name.toLowerCase()} · +${healAmount} HP`);
      sfx.gather();
    } else {
      chat("info", `${def.name} — sells to Roka for ${Math.max(1, Math.floor(def.price * SELL_RATIO))} coins. Left-click campfire to cook raw meats/eggs.`);
    }
    bump();
  };

  const dropSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    gg.inv[idx] = null;
    if (!gg.groundItems) gg.groundItems = [];
    gg.groundItems.push({ id: nextId(), item: s.item, n: s.n, x: Math.round(gg.x), y: Math.round(gg.y), t: performance.now() });
    chat("info", `${gg.name} dropped ${s.n > 1 ? s.n + "× " : ""}${ITEMS[s.item].name.toLowerCase()} onto the ground.`);
    bump();
  };

  const depositSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    gg.bank[s.item] = (gg.bank[s.item] ?? 0) + s.n;
    gg.inv[idx] = null;
    for (const slot of ["weapon", "axe", "pick", "rod", "armor"] as const) {
      if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
    }
    chat("info", `${gg.name} deposited ${s.n > 1 ? s.n + "× " : "the "}${ITEMS[s.item].name.toLowerCase()} into the bank.`);
    sfx.coin();
    bump();
  };

  const depositAll = () => {
    const gg = g();
    let moved = 0;
    for (let i = 0; i < gg.inv.length; i++) {
      const s = gg.inv[i];
      if (!s || s.item === "coins") continue;
      gg.bank[s.item] = (gg.bank[s.item] ?? 0) + s.n;
      gg.inv[i] = null;
      for (const slot of ["weapon", "axe", "pick", "rod", "armor"] as const) {
        if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
      }
      moved += s.n;
    }
    if (moved > 0) {
      chat("info", `${gg.name} safely deposited ${moved} item${moved > 1 ? "s" : ""} to the Bank of ForgeBound.`);
      sfx.coin();
      bump();
    }
  };

  const withdraw = (item: ItemId) => {
    const gg = g();
    const have = gg.bank[item] ?? 0;
    if (have < 1) return;
    if (freeSlots(gg) < 1 && !ITEMS[item]?.stackable) {
      chat("err", "Your inventory has no free space.");
      sfx.error();
      return;
    }
    const added = addItem(item, 1);
    if (added > 0) {
      gg.bank[item] = have - added;
      if (gg.bank[item] <= 0) delete gg.bank[item];
      sfx.click();
      bump();
    }
  };

  /** Right-click vault: withdraw an entire stack at once. */
  const withdrawStack = (item: ItemId) => {
    const gg = g();
    const have = gg.bank[item] ?? 0;
    if (have < 1) return;
    const def = ITEMS[item];
    let take = have;
    if (!def?.stackable) take = Math.min(have, freeSlots(gg));
    if (take < 1) {
      chat("err", "Your inventory has no free space.");
      sfx.error();
      return;
    }
    const added = addItem(item, take);
    if (added > 0) {
      gg.bank[item] = have - added;
      if (gg.bank[item] <= 0) delete gg.bank[item];
      chat("info", `${gg.name} withdrew ${added > 1 ? added + "× " : ""}${def?.name.toLowerCase() ?? item} from the vault.`);
      sfx.coin();
      bump();
    }
  };

  const buy = (item: ItemId) => {
    const gg = g();
    const def = ITEMS[item];
    if (gg.coins < def.price) {
      chat("err", `You need ${def.price} coins for that (${gg.coins} available).`);
      sfx.error();
      return;
    }
    if (freeSlots(gg) < 1 && !def.stackable) {
      chat("err", "No space in inventory.");
      sfx.error();
      return;
    }
    const added = addItem(item, 1);
    if (added > 0) {
      gg.coins -= def.price;
      chat("info", `Bought ${def.name.toLowerCase()} for ${def.price} coins.`);
      sfx.coin();
      bump();
    }
  };

  const sellSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    const def = ITEMS[s.item];
    const gain = Math.max(1, Math.floor(def.price * SELL_RATIO)) * s.n;
    gg.inv[idx] = null;
    for (const slot of ["weapon", "axe", "pick", "rod", "armor"] as const) {
      if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
    }
    gg.coins += gain;
    chat("info", `Sold ${s.n > 1 ? s.n + "× " : ""}${def.name.toLowerCase()} to Roka · +${gain} coins`);
    sfx.coin();
    bump();
  };

  const unequip = (slot: "weapon" | "axe" | "pick" | "rod" | "armor") => {
    const gg = g();
    const id = gg.equipped[slot];
    if (!id) return;
    if (freeSlots(gg) < 1) {
      chat("err", "Your pack is full, cannot unequip tool!");
      sfx.error();
      return;
    }
    delete gg.equipped[slot];
    addItem(id, 1);
    chat("info", `${gg.name} unequipped the ${ITEMS[id].name.toLowerCase()}.`);
    sfx.click();
    bump();
  };

  const dismissLevelUp = () => {
    const gg = g();
    gg.levelUps.shift();
    bump();
  };

  const closeOverlays = () => {
    const gg = g();
    gg.bankOpen = false;
    gg.shopOpen = false;
    gg.stationUI = null;
    gg.settingsOpen = false;
    bump();
  };

  const openSettings = () => {
    const gg = g();
    gg.bankOpen = false;
    gg.shopOpen = false;
    gg.stationUI = null;
    gg.settingsOpen = true;
    sfx.click();
    bump();
  };

  const saveNow = (): boolean => {
    const gg = gref.current;
    if (!gg) return false;
    // Silent: autosave runs constantly and must not spam the Adventurer's Log.
    return saveGame(gg);
  };

  const art = (name: string) => (/^aeiou/i.test(name) ? "an" : "a");

  // --- Gamma v0.3.0 Visual Controls ---
  const setZoom = (zoom: number) => {
    const gg = g();
    // Same 1.0–3.2 range as the Settings slider; round away float drift from wheel steps.
    gg.zoom = Math.round(Math.max(1.0, Math.min(3.2, zoom)) * 10) / 10;
    bump();
  };

  const toggleGraphicsMode = () => {
    const gg = g();
    gg.graphicsMode = gg.graphicsMode === "64bit" ? "8bit" : "64bit";
    chat("sys", `Visual Engine switched to: ${gg.graphicsMode === "64bit" ? "64-Bit HD Remastered" : "8-Bit Legacy Mode"}.`);
    sfx.click();
    bump();
  };

  const resetGame = (name: string) => {
    clearSave();
    gref.current = freshState(name);
    moveAcc.current = 0;
    const gg = gref.current;
    gg.chat = [];
    chat("sys", `Welcome to ForgeBound — Gamma (v${VERSION}) Update!`);
    chat("sys", "New: Combat System Active! Fight Goblins, Cows, and Chickens, pick up loot, and cook meat/eggs!");
    chat("info", "Tip: Left-click monsters to attack. Left-click floor loot to pick up! Click bones in pack for Prayer XP.");
    bump();
  };

  const start = (name: string, continueSave: boolean) => {
    const loaded = continueSave ? loadGame() : null;
    gref.current = loaded ?? freshState(name);
    moveAcc.current = 0;
    const gg = gref.current;
    if (!gg.zoom) gg.zoom = 2.2;
    if (!gg.graphicsMode) gg.graphicsMode = "64bit";
    if (!gg.chickens) gg.chickens = CHICKEN_SPAWNS.map((c, idx) => ({ id: idx + 20, x: c.x, y: c.y, dx: c.x, dy: c.y, hp: 3, maxHp: 3, respawn: 0, nextMove: 0, cluck: 0, nextEgg: performance.now() + 15000 }));
    if (!gg.goblins) gg.goblins = GOBLIN_SPAWNS.map((gb, idx) => {
      const brigand = idx >= 5;
      return { id: idx + 50, x: gb.x, y: gb.y, dx: gb.x, dy: gb.y, hp: brigand ? 22 : 12, maxHp: brigand ? 22 : 12, respawn: 0, nextMove: 0, grunt: 0 };
    });
    if (!gg.groundItems) gg.groundItems = [{ id: nextId(), item: "egg", n: 1, x: 43, y: 27, t: performance.now() }];
    if (!gg.equipped.weapon) gg.equipped.weapon = "bronze_sword";

    if (loaded) {
      chat("sys", `Welcome back to ForgeBound, ${gg.name}! Combat engine restored in Gamma v${VERSION}.`);
      chat("sys", "Monsters now fight back, lay eggs, and drop loot onto the valley terrain!");
    } else {
      chat("sys", `Welcome to ForgeBound — Gamma (v${VERSION}) with the immersive layout & combat.`);
      chat("info", "Starter kit: bronze sword, axe & pick in pack. Engage in combat with goblins, cows & chickens!");
    }
    bump();
  };

  const api = useMemo(
    () => ({
      gref,
      g,
      bump,
      update,
      chat,
      gainXp,
      handleWorldClick,
      clickGround,
      startRecipe,
      clickInventorySlot,
      dropSlot,
      depositSlot,
      depositAll,
      withdraw,
      withdrawStack,
      buy,
      sellSlot,
      unequip,
      dismissLevelUp,
      closeOverlays,
      openSettings,
      saveNow,
      setZoom,
      toggleGraphicsMode,
      start,
      resetGame,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return api;
}

export type GameApi = ReturnType<typeof useGame>;
