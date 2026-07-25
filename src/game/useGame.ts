import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Action, ChatKind, GameState, InvSlot, ItemId, RecipeId, ResKey, SkillId, StationId, ToolSlot,
} from "./types";
import {
  ENEMY_TYPES, ITEMS, MARO_LINES, OBJ_TO_RES, OBJ_TO_STATION, RECIPE_BY_ID,
  RESOURCES, SELL_RATIO, TOOL_SPEED, type EnemyDef,
} from "./data";
import { ENEMY_SPAWNS, MAP_H, MAP_W, SPAWN, objAt, walkable } from "./map";
import { adjacentTo, findPath } from "./pathfinding";
import { MAX_XP, SKILLS, SKILL_BY_ID, fmt, levelForXp } from "./xp";
import { sfx } from "./audio";

export const SAVE_KEY = "forgebound-save-v1";
const STEP_MS = 168;
const SAVE_VERSION = 1;

let uid = 1;
const nextId = () => uid++;

function findObjChar(ch: string): { x: number; y: number } | null {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (objAt(x, y) === ch) return { x, y };
    }
  }
  return null;
}
const BANK_POS = findObjChar("B") ?? { x: 27, y: 14 };
const SHOP_POS = findObjChar("M") ?? { x: 25, y: 18 };
const STATION_POS: Record<string, { x: number; y: number }> = {};
for (const ch of ["F", "A", "*"]) {
  const p = findObjChar(ch);
  if (p) STATION_POS[OBJ_TO_STATION[ch] as StationId] = p;
}

function baseXp(): Record<SkillId, number> {
  const xp = {} as Record<SkillId, number>;
  for (const s of SKILLS) xp[s.id] = 0;
  xp.hitpoints = 1154; // starts at level 10, the classic way
  return xp;
}

export function freshState(name: string): GameState {
  const inv: (InvSlot | null)[] = new Array(28).fill(null);
  inv[0] = { item: "bronze_axe", n: 1 };
  inv[1] = { item: "bronze_pick", n: 1 };
  return {
    version: SAVE_VERSION,
    name: name.trim().slice(0, 14) || "Adventurer",
    coins: 25,
    hp: 20,
    maxHp: 20,
    xp: baseXp(),
    inv,
    bank: {},
    equipped: { axe: "bronze_axe", pick: "bronze_pick" },
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
    enemies: ENEMY_SPAWNS.map((s) => ({
      type: s.type, hp: ENEMY_TYPES[s.type].hp,
      x: s.x, y: s.y, hx: s.x, hy: s.y, dx: s.x, dy: s.y,
      nextMove: 0, nextAttack: 0, deathAt: 0, flash: 0, nextLay: 0,
    })),
    splats: [],
    eggs: [],
    counters: { gathered: 0, made: 0, kills: 0 },
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
      for (let i = 0; i < 28; i++) {
        const s = p.inv[i];
        g.inv[i] = s && ITEMS[s.item as ItemId] ? { item: s.item, n: Math.max(1, s.n) } : null;
      }
    }
    g.bank = p.bank ?? {};
    g.equipped = p.equipped ?? {};
    if (typeof p.x === "number" && walkable(p.x, p.y)) { g.x = p.x; g.y = p.y; }
    g.counters = { gathered: 0, made: 0, kills: 0, ...(p.counters ?? {}) };
    g.chat = [];
    return g;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function hasSave(): boolean {
  try { return localStorage.getItem(SAVE_KEY) !== null; } catch { return false; }
}

// ---------------------------------------------------------------------------

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

  const addFloat = (text: string, color: string, dx = 0) => {
    const gg = g();
    gg.floats.push({
      x: gg.x + dx + (Math.random() * 0.6 - 0.3),
      y: gg.y - 0.4,
      text, color, t: performance.now(),
    });
  };

  /** quiet = true for combat hits, where three skills level at once and we don't want float spam */
  const addXp = (skill: SkillId, amount: number, quiet = false) => {
    const gg = g();
    const before = levelForXp(gg.xp[skill]);
    gg.xp[skill] = Math.min(MAX_XP, gg.xp[skill] + amount);
    const after = levelForXp(gg.xp[skill]);
    if (!quiet) {
      gg.xpEvents.push({ id: nextId(), skill, amount, t: performance.now() });
      if (gg.xpEvents.length > 24) gg.xpEvents.splice(0, gg.xpEvents.length - 24);
      addFloat(`+${fmt(amount)} xp`, "rgb(216,178,92)", Math.random() - 0.5);
    }
    if (after > before) {
      gg.levelUps.push({ skill, level: after });
      chat("sys", `Huzzah! ${gg.name} reached level ${after} ${SKILL_BY_ID[skill].name}!`);
      sfx.levelUp();
    }
  };

  const gainXp = (skill: SkillId, amount: number) => addXp(skill, amount, false);

  const freeSlots = (gg: GameState) => gg.inv.filter((s) => s === null).length;

  const addItem = (id: ItemId, n = 1): number => {
    const gg = g();
    const def = ITEMS[id];
    let left = n;
    if (def.stackable) {
      const slot = gg.inv.find((s) => s?.item === id);
      if (slot) { slot.n += left; return n; }
    }
    for (let i = 0; i < 28 && left > 0; i++) {
      if (gg.inv[i] === null) { gg.inv[i] = { item: id, n: 1 }; left--; }
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
    for (const [id, need] of Object.entries(inputs)) {
      let left = need ?? 0;
      for (let i = 27; i >= 0 && left > 0; i--) {
        const s = gg.inv[i];
        if (!s || s.item !== id) continue;
        const take = Math.min(s.n, left);
        s.n -= take; left -= take;
        if (s.n <= 0) gg.inv[i] = null;
      }
    }
    return true;
  };

  const toolTier = (cat: ToolSlot): number => {
    const eq = g().equipped[cat];
    return eq && ITEMS[eq]?.tier ? ITEMS[eq].tier! : 0;
  };

  const ensureTool = (tool?: "axe" | "pick" | "rod"): boolean => {
    if (!tool) return true;
    const gg = g();
    if (gg.equipped[tool]) return true;
    const idx = gg.inv.findIndex((s) => s && ITEMS[s.item].cat === tool);
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

  // ----- world interaction -------------------------------------------------

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

    // enemies take click priority
    for (let i = 0; i < gg.enemies.length; i++) {
      const e = gg.enemies[i];
      if (e.deathAt) continue;
      if (Math.round(e.x) === x && Math.round(e.y) === y) {
        startCombat(i);
        return "handled";
      }
    }

    // eggs waiting on the ground
    if (gg.eggs.some((eg) => eg.x === x && eg.y === y)) {
      if (adjacentTo(gg.x, gg.y, x, y)) {
        pickupEgg(x, y);
      } else {
        gg.path = findPath(gg.x, gg.y, x, y) ?? [];
        gg.pendingStation = { kind: "egg", x, y };
      }
      return "handled";
    }

    const ch = objAt(x, y);
    if (ch === "M" || ch === "P") {
      const go = () => {
        gg.path = findPath(gg.x, gg.y, x, y) ?? [];
        gg.pendingStation = { kind: ch === "M" ? "shop" : "maro" as "shop", x, y };
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
      if (adjacentTo(gg.x, gg.y, x, y)) { gg.bankOpen = true; sfx.click(); }
      else { gg.path = findPath(gg.x, gg.y, x, y) ?? []; gg.pendingStation = { kind: "bank", x, y }; }
      return "handled";
    }

    const station = OBJ_TO_STATION[ch];
    if (station && station !== "bank") {
      if (adjacentTo(gg.x, gg.y, x, y)) {
        gg.stationUI = { station, x, y };
        sfx.click();
      } else {
        gg.path = findPath(gg.x, gg.y, x, y) ?? [];
        gg.pendingStation = { kind: "craft", station, x, y };
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
      chat("err", `Requires level ${def.level} ${SKILL_BY_ID[def.skill].name} to work this.`);
      sfx.error();
      return;
    }
    if (!ensureTool(def.tool)) return;
    if (def.bait && countItem(def.bait) <= 0) {
      chat("err", "Trout won't rise without a feather lure — the hens in the coop can help.");
      sfx.error();
      return;
    }
    if (freeSlots(gg) <= 0 && countItem(def.item) === 0) {
      chat("err", "Inventory full — bank some goods or sell them to Roka.");
      sfx.error();
      return;
    }
    const path = findPath(gg.x, gg.y, x, y);
    if (!path) {
      chat("err", "No path leads there.");
      return;
    }
    const tier = def.tool ? toolTier(def.tool) : 1;
    const cycle = def.cycle * (def.tool ? TOOL_SPEED[tier] ?? 1 : 1);
    gg.path = path;
    if (res === "tree" || res === "oak") gg.depleted[`${x},${y}`] = { t: 0, kind: res };
    gg.action = { kind: "gather", x, y, res, progress: 0, cycle } satisfies Action;
    chat("info", `${gg.name} ${gatherVerb(res)}`);
  };

  // ----- combat ------------------------------------------------------------

  const addSplat = (x: number, y: number, n: number, kind: "deal" | "take") => {
    g().splats.push({
      x: x + (Math.random() * 0.4 - 0.2),
      y: y - 0.3,
      n, kind, t: performance.now(),
    });
  };

  const pickupEgg = (x: number, y: number) => {
    const gg = g();
    const i = gg.eggs.findIndex((eg) => eg.x === x && eg.y === y);
    if (i === -1) return;
    if (freeSlots(gg) <= 0) {
      chat("err", "Inventory full.");
      sfx.error();
      return;
    }
    gg.eggs.splice(i, 1);
    addItem("egg", 1);
    chat("info", `${gg.name} picked up a fresh egg.`);
    sfx.gather();
  };

  const startCombat = (idx: number) => {
    const gg = g();
    const e = gg.enemies[idx];
    if (!e || e.deathAt || gg.hp <= 0) return;
    const def = ENEMY_TYPES[e.type];
    const path = findPath(gg.x, gg.y, Math.round(e.x), Math.round(e.y));
    if (!path) {
      chat("err", "No path leads there.");
      return;
    }
    const tier = toolTier("weapon");
    const cycle = tier > 0 ? 2200 - tier * 150 : 2400;
    gg.path = path;
    gg.action = {
      kind: "combat", enemy: idx,
      x: Math.round(e.x), y: Math.round(e.y),
      progress: 0, cycle,
    };
    e.nextAttack = 0;
    chat("info", `${gg.name} attacks the ${def.name.toLowerCase()}.`);
    if (e.type === "cow") sfx.moo(); else sfx.click();
  };

  const playerAttack = (a: Extract<Action, { kind: "combat" }>, now: number) => {
    const gg = g();
    a.progress = 0;
    const e = gg.enemies[a.enemy];
    if (!e || e.deathAt) { gg.action = null; return; }
    const def = ENEMY_TYPES[e.type];
    if (Math.hypot(e.x - gg.x, e.y - gg.y) > 1.8) {
      gg.action = null;
      return;
    }
    sfx.swing();
    const atkLvl = levelForXp(gg.xp.attack);
    const strLvl = levelForXp(gg.xp.strength);
    const tier = toolTier("weapon");
    const weaponAtk = tier * 2 + 1;
    const weaponStr = tier + 1;
    const toHit = Math.min(0.95, Math.max(0.2, 0.58 + atkLvl * 0.006 + weaponAtk * 0.02 - def.def * 0.012));
    if (Math.random() > toHit) {
      addSplat(e.x, e.y, 0, "deal");
      return;
    }
    const maxHit = 1 + Math.floor(strLvl / 7) + weaponStr;
    const dmg = 1 + Math.floor(Math.random() * maxHit);
    e.hp -= dmg;
    e.flash = now;
    addSplat(e.x, e.y, dmg, "deal");
    sfx.hit();
    addXp("attack", dmg * 2, true);
    addXp("strength", dmg * 2, true);
    addXp("hitpoints", Math.ceil(dmg * 1.33), true);
    gg.xpEvents.push({ id: nextId(), skill: "attack", amount: Math.round(dmg * 5.33), t: now });
    if (gg.xpEvents.length > 24) gg.xpEvents.splice(0, gg.xpEvents.length - 24);
    if (e.hp <= 0) killEnemy(a.enemy, now);
  };

  const killEnemy = (idx: number, now: number) => {
    const gg = g();
    const e = gg.enemies[idx];
    const def = ENEMY_TYPES[e.type];
    e.deathAt = now;
    e.hp = 0;
    e.nextLay = 0;
    if (gg.action?.kind === "combat" && gg.action.enemy === idx) gg.action = null;
    const parts: string[] = [];
    let spilled = false;
    const stash = (id: ItemId, n: number) => {
      if (freeSlots(gg) <= 0) { spilled = true; return; }
      addItem(id, n);
      parts.push(`${n > 1 ? n + "× " : ""}${ITEMS[id].name.toLowerCase()}`);
    };
    if (def.coins) {
      const c = def.coins[0] + Math.floor(Math.random() * (def.coins[1] - def.coins[0] + 1));
      if (c > 0) {
        gg.coins += c;
        parts.push(`${c} coins`);
      }
    }
    stash(def.bones, 1);
    for (const ex of def.extra ?? []) {
      stash(ex.item, ex.min + Math.floor(Math.random() * (ex.max - ex.min + 1)));
    }
    gg.counters.kills++;
    chat("info", `${gg.name} defeated the ${def.name.toLowerCase()} · picked up ${parts.join(", ") || "nothing"}.`);
    if (spilled) chat("err", "Inventory full — some spoils are left behind.");
    sfx.kill();
  };

  const enemyAttack = (def: EnemyDef, now: number) => {
    const gg = g();
    const defLvl = levelForXp(gg.xp.defence);
    const toHit = Math.min(0.85, Math.max(0.15, def.toHit - defLvl * 0.004));
    if (Math.random() > toHit) {
      addSplat(gg.x, gg.y, 0, "take");
      return;
    }
    const dmg = 1 + Math.floor(Math.random() * def.maxHit);
    gg.hp = Math.max(0, gg.hp - dmg);
    addSplat(gg.x, gg.y, dmg, "take");
    sfx.hurt();
    addXp("defence", Math.ceil(dmg * 2.5), true);
    addXp("hitpoints", Math.ceil(dmg * 1.33), true);
    gg.xpEvents.push({ id: nextId(), skill: "defence", amount: Math.round(dmg * 3.83), t: now });
    if (gg.xpEvents.length > 24) gg.xpEvents.splice(0, gg.xpEvents.length - 24);
    if (gg.hp <= 0) playerDeath();
  };

  const playerDeath = () => {
    const gg = g();
    chat("sys", `${gg.name} has fallen! Returning to Vale Square to recover.`);
    sfx.die();
    gg.hp = gg.maxHp;
    gg.path = [];
    gg.action = null;
    gg.pendingStation = null;
    gg.x = SPAWN.x;
    gg.y = SPAWN.y;
    for (const e of gg.enemies) {
      if (!e.deathAt) {
        e.hp = ENEMY_TYPES[e.type].hp;
        e.nextAttack = 0;
      }
    }
    bump();
  };

  const gatherVerb = (res: ResKey): string => {
    const v: Partial<Record<ResKey, string>> = {
      tree: "swings an axe at the tree…",
      oak: "swings an axe at the mighty oak…",
      copper: "swings a pick at the copper rocks…",
      tin: "swings a pick at the tin rocks…",
      iron: "swings a pick at the iron rocks…",
      coal: "swings a pick at the coal rocks…",
      gold: "swings a pick at the glittering gold…",
      shrimp: "wades in after the shrimp…",
      trout: "casts a feathered fly into the current…",
    };
    return v[res] ?? "gets to work…";
  };

  const completeGather = (a: Extract<Action, { kind: "gather" }>, now: number) => {
    const gg = g();
    const def = RESOURCES[a.res];
    const key = `${a.x},${a.y}`;
    const until = gg.depleted[key];
    if (until && now < until.t) return; // waiting on respawn
    if (def.bait) {
      if (countItem(def.bait) <= 0) {
        chat("err", "Out of feathers — the trout stop rising.");
        gg.action = null;
        sfx.error();
        return;
      }
      removeItems({ [def.bait]: 1 } as Partial<Record<ItemId, number>>);
    }
    if (freeSlots(gg) <= 0) {
      chat("err", "Inventory full — nothing more fits.");
      gg.action = null;
      sfx.error();
      return;
    }
    addItem(def.item, 1);
    gainXp(def.skill, def.xp);
    gg.counters.gathered++;
    if (def.respawn > 0) {
      gg.depleted[key] = {
        t: now + def.respawn,
        kind: a.res === "tree" || a.res === "oak" ? a.res : undefined,
      };
    }
    if (def.skill === "fishing") sfx.splash(); else sfx.gather();
    const got: Record<string, string> = {
      logs: "chopped some logs", oak_logs: "chopped some oak logs",
      copper_ore: "mined some copper ore", tin_ore: "mined some tin ore",
      iron_ore: "mined some iron ore", coal: "mined some coal", gold_ore: "mined some gold ore",
      raw_shrimp: "caught a shrimp", raw_trout: "caught a trout",
    };
    chat("info", `${gg.name} ${got[def.item] ?? "picked up " + ITEMS[def.item].name.toLowerCase()} · +${def.xp} XP ${SKILL_BY_ID[def.skill].name}`);
    a.progress = 0;
  };

  const startRecipe = (id: RecipeId) => {
    const gg = g();
    const r = RECIPE_BY_ID[id];
    if (!gg.stationUI) return;
    if (levelForXp(gg.xp[r.skill]) < r.level) {
      chat("err", `Requires level ${r.level} ${SKILL_BY_ID[r.skill].name} for that.`);
      sfx.error();
      return;
    }
    let ok = true;
    for (const [item, n] of Object.entries(r.inputs)) {
      if (countItem(item as ItemId) < (n ?? 0)) ok = false;
    }
    if (!ok) {
      chat("err", "Missing materials for that recipe.");
      sfx.error();
      return;
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
  };

  const completeStation = (a: Extract<Action, { kind: "station" }>) => {
    const gg = g();
    const r = RECIPE_BY_ID[a.recipe];
    if (!removeItems(r.inputs)) {
      chat("err", "Out of materials.");
      gg.action = null;
      return;
    }
    if (freeSlots(gg) <= 0) {
      chat("err", "Inventory full — materials returned.");
      for (const [item, n] of Object.entries(r.inputs)) addItem(item as ItemId, n ?? 0);
      gg.action = null;
      sfx.error();
      return;
    }
    addItem(r.output, 1);
    gainXp(r.skill, r.xp);
    gg.counters.made++;
    sfx.smith();
    const verb = r.id.startsWith("smelt") ? "smelted" : r.id.startsWith("smith") ? "forged" : "cooked";
    chat("info", `${gg.name} ${verb} ${art(ITEMS[r.output].name)} ${ITEMS[r.output].name.toLowerCase()} · +${r.xp} XP ${SKILL_BY_ID[r.skill].name}`);
    a.progress = 0;
  };

  const clickGround = (x: number, y: number) => {
    const gg = g();
    cancelAction();
    gg.bankOpen = false;
    gg.shopOpen = false;
    gg.stationUI = null;
    const path = findPath(gg.x, gg.y, x, y);
    if (path) gg.path = path;
  };

  // ----- tick ----------------------------------------------------------------

  const update = (dt: number, now: number) => {
    const gg = g();
    // movement
    if (gg.path.length) {
      moveAcc.current += dt;
      while (moveAcc.current >= STEP_MS && gg.path.length) {
        moveAcc.current -= STEP_MS;
        const t = gg.path.shift()!;
        gg.x = t.x; gg.y = t.y;
      }
    } else {
      moveAcc.current = 0;
      // arrive at queued destination
      if (gg.pendingStation && adjacentTo(gg.x, gg.y, gg.pendingStation.x, gg.pendingStation.y)) {
        const p = gg.pendingStation;
        if (p.kind === "bank") { gg.bankOpen = true; sfx.click(); }
        else if (p.kind === "shop") { gg.shopOpen = true; sfx.click(); }
        else if (p.kind === "craft" && p.station) { gg.stationUI = { station: p.station, x: p.x, y: p.y }; sfx.click(); }
        else if (p.kind === "egg") pickupEgg(p.x, p.y);
      }
      gg.pendingStation = null;
    }

    // keep a combat action glued to a wandering foe
    if (gg.action?.kind === "combat") {
      const ce = gg.enemies[gg.action.enemy];
      if (!ce || ce.deathAt) {
        gg.action = null;
      } else {
        gg.action.x = Math.round(ce.x);
        gg.action.y = Math.round(ce.y);
      }
    }

    // action progression
    if (gg.action) {
      if (!adjacentTo(gg.x, gg.y, gg.action.x, gg.action.y)) {
        gg.action = null;
      } else if (!gg.path.length) {
        gg.action.progress += dt;
        if (gg.action.progress >= gg.action.cycle) {
          if (gg.action.kind === "gather") completeGather(gg.action, now);
          else if (gg.action.kind === "station") completeStation(gg.action);
          else playerAttack(gg.action, now);
        }
      }
    }

    // enemies: fight back, wander, die and respawn
    for (let i = 0; i < gg.enemies.length; i++) {
      const e = gg.enemies[i];
      const def = ENEMY_TYPES[e.type];
      if (e.deathAt) {
        if (now - e.deathAt > def.respawn) {
          e.deathAt = 0;
          e.hp = def.hp;
          e.x = e.hx; e.y = e.hy;
          e.dx = e.hx; e.dy = e.hy;
          e.nextAttack = 0;
          e.flash = 0;
        }
        continue;
      }
      // hens lay eggs now and then
      if (e.type === "chicken") {
        if (e.nextLay === 0) {
          e.nextLay = now + 25000 + Math.random() * 35000;
        } else if (now >= e.nextLay) {
          e.nextLay = now + 25000 + Math.random() * 35000;
          if (gg.eggs.length < 6) {
            const ex0 = Math.round(e.x), ey0 = Math.round(e.y);
            const spots = [
              { x: ex0, y: ey0 }, { x: ex0 + 1, y: ey0 },
              { x: ex0 - 1, y: ey0 }, { x: ex0, y: ey0 + 1 },
            ].filter((p) => walkable(p.x, p.y) && !gg.eggs.some((eg) => eg.x === p.x && eg.y === p.y));
            if (spots.length) {
              const s = spots[Math.floor(Math.random() * spots.length)];
              gg.eggs.push({ x: s.x, y: s.y, t: now });
              chat("info", "A hen clucks proudly — a fresh egg waits in the coop.");
            }
          }
        }
      }
      const dist = Math.hypot(e.x - gg.x, e.y - gg.y);
      const engaged =
        gg.hp > 0 && dist <= 1.8 &&
        gg.action?.kind === "combat" && gg.action.enemy === i;
      if (engaged) {
        if (e.nextAttack === 0) e.nextAttack = now + def.atkSpeed;
        if (now >= e.nextAttack) {
          e.nextAttack = now + def.atkSpeed;
          enemyAttack(def, now);
        }
      } else {
        e.nextAttack = 0;
        if (e.hp < def.hp && dist > 3) e.hp = def.hp; // heal once disengaged
        if (e.x === e.dx && e.y === e.dy && now > e.nextMove) {
          if (Math.random() < 0.6) {
            const nx = Math.round(e.hx + (Math.random() * 2 - 1) * def.wander);
            const ny = Math.round(e.hy + (Math.random() * 2 - 1) * def.wander);
            if (walkable(nx, ny)) { e.dx = nx; e.dy = ny; }
          }
          e.nextMove = now + 2200 + Math.random() * 3200;
        }
        const esp = (dt / 1000) * 1.2;
        if (e.x !== e.dx) e.x += Math.sign(e.dx - e.x) * Math.min(esp, Math.abs(e.dx - e.x));
        if (e.y !== e.dy) e.y += Math.sign(e.dy - e.y) * Math.min(esp, Math.abs(e.dy - e.y));
      }
    }

    // housekeeping
    if (gg.floats.length) gg.floats = gg.floats.filter((f) => now - f.t < 1400);
    if (gg.splats.length) gg.splats = gg.splats.filter((s) => now - s.t < 950);
    if (gg.eggs.length) gg.eggs = gg.eggs.filter((eg) => now - eg.t < 120000);
    if (gg.xpEvents.length) gg.xpEvents = gg.xpEvents.filter((e) => now - e.t < 5200);
    if (gg.bankOpen && !adjacentTo(gg.x, gg.y, BANK_POS.x, BANK_POS.y)) gg.bankOpen = false;
    if (gg.shopOpen && !adjacentTo(gg.x, gg.y, SHOP_POS.x, SHOP_POS.y)) gg.shopOpen = false;
    if (gg.stationUI && !adjacentTo(gg.x, gg.y, gg.stationUI.x, gg.stationUI.y)) gg.stationUI = null;
    for (const key of Object.keys(gg.depleted)) {
      if (gg.depleted[key].t < now) delete gg.depleted[key];
    }
  };

  // ----- inventory / economy -------------------------------------------------

  const clickInventorySlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s) return;
    const def = ITEMS[s.item];
    if (def.cat === "axe" || def.cat === "pick" || def.cat === "rod" || def.cat === "weapon") {
      const slot = def.cat === "weapon" ? "weapon" : def.cat;
      const prev = gg.equipped[slot];
      gg.inv[idx] = null;
      if (prev) {
        const free = gg.inv.findIndex((q) => q === null);
        if (free !== -1) gg.inv[free] = { item: prev, n: 1 };
      }
      gg.equipped[slot] = s.item;
      chat("info", `${gg.name} equipped the ${def.name.toLowerCase()}.`);
      sfx.click();
    } else if (def.cat === "bones") {
      gg.inv[idx] = s.n > 1 ? { item: s.item, n: s.n - 1 } : null;
      addXp("prayer", def.prayXp ?? 4.5);
      chat("info", `${gg.name} buries the ${def.name.toLowerCase()}.`);
      sfx.bury();
    } else if (def.cat === "food") {
      gg.inv[idx] = s.n > 1 ? { item: s.item, n: s.n - 1 } : null;
      gg.hp = Math.min(gg.maxHp, gg.hp + (def.heal ?? 3));
      chat("info", `${gg.name} ate ${art(def.name)} ${def.name.toLowerCase()} · +${def.heal ?? 3} HP`);
      sfx.gather();
    } else {
      chat("info", `Nothing interesting happens. (${def.name.toLowerCase()} sells to Roka for ${Math.max(1, Math.floor(def.price * SELL_RATIO))} coins.)`);
    }
    bump();
  };

  const dropSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    gg.inv[idx] = null;
    chat("info", `${gg.name} dropped ${s.n > 1 ? s.n + "× " : ""}${ITEMS[s.item].name.toLowerCase()}.`);
    bump();
  };

  const depositSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    gg.bank[s.item] = (gg.bank[s.item] ?? 0) + s.n;
    gg.inv[idx] = null;
    for (const slot of ["weapon", "axe", "pick", "rod"] as const) {
      if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
    }
    chat("info", `${gg.name} banked ${s.n > 1 ? s.n + "× " : "the "}${ITEMS[s.item].name.toLowerCase()}.`);
    sfx.coin();
    bump();
  };

  const depositAll = () => {
    const gg = g();
    let moved = 0;
    for (let i = 0; i < 28; i++) {
      const s = gg.inv[i];
      if (!s || s.item === "coins") continue;
      gg.bank[s.item] = (gg.bank[s.item] ?? 0) + s.n;
      gg.inv[i] = null;
      moved += s.n;
      for (const slot of ["weapon", "axe", "pick", "rod"] as const) {
        if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
      }
    }
    chat(moved ? "info" : "err", moved ? `${gg.name} banked ${moved} item${moved === 1 ? "" : "s"}.` : "Nothing to bank.");
    if (moved) sfx.coin();
    bump();
  };

  const withdraw = (item: ItemId, n: number) => {
    const gg = g();
    const have = gg.bank[item] ?? 0;
    if (have <= 0) return;
    const def = ITEMS[item];
    const amount = def.stackable ? Math.min(have, n) : Math.min(have, n, freeSlots(gg));
    if (amount <= 0) { chat("err", "Inventory full."); sfx.error(); bump(); return; }
    gg.bank[item] = have - amount;
    if (gg.bank[item] === 0) delete gg.bank[item];
    addItem(item, amount);
    chat("info", `${gg.name} withdrew ${amount}× ${ITEMS[item].name.toLowerCase()}.`);
    sfx.click();
    bump();
  };

  const buy = (item: ItemId) => {
    const gg = g();
    const def = ITEMS[item];
    if (gg.coins < def.price) { chat("err", "Not enough coins for that."); sfx.error(); bump(); return; }
    if (freeSlots(gg) <= 0) { chat("err", "Inventory full."); sfx.error(); bump(); return; }
    gg.coins -= def.price;
    addItem(item, 1);
    chat("info", `${gg.name} bought ${art(def.name)} ${def.name.toLowerCase()} · −${def.price} coins`);
    chat("npc", `Roka: Fine choice. ${def.price} coins — pleasure doing business.`);
    sfx.coin();
    bump();
  };

  const sellSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    const def = ITEMS[s.item];
    const gain = Math.max(1, Math.floor(def.price * SELL_RATIO)) * s.n;
    gg.inv[idx] = null;
    for (const slot of ["weapon", "axe", "pick", "rod"] as const) {
      if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
    }
    gg.coins += gain;
    chat("info", `${gg.name} sold ${s.n > 1 ? s.n + "× " : ""}${def.name.toLowerCase()} · +${gain} coins`);
    chat("npc", `Roka: ${gain} coins for ${s.n > 1 ? "those" : "that"} ${def.name.toLowerCase()}. Fair's fair.`);
    sfx.coin();
    bump();
  };

  const unequip = (slot: "weapon" | "axe" | "pick" | "rod") => {
    const gg = g();
    const id = gg.equipped[slot];
    if (!id) return;
    if (freeSlots(gg) <= 0) { chat("err", "Inventory full."); sfx.error(); bump(); return; }
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
    bump();
  };

  const saveNow = (): boolean => {
    const gg = gref.current;
    if (!gg) return false;
    return saveGame(gg);
  };

  const art = (name: string) => (/^aeiou/i.test(name) ? "an" : "a");

  const resetGame = (name: string) => {
    clearSave();
    gref.current = freshState(name);
    moveAcc.current = 0;
    const gg = gref.current;
    gg.chat = [];
    chat("sys", "Welcome to ForgeBound.");
    chat("sys", "Every deed is chronicled below, and progress saves to this device — no connection required.");
    chat("info", "Tip: talk to Old Maro in Vale Square — he knows this realm well.");
    bump();
  };

  const start = (name: string, continueSave: boolean) => {
    const loaded = continueSave ? loadGame() : null;
    gref.current = loaded ?? freshState(name);
    moveAcc.current = 0;
    const gg = gref.current;
    if (loaded) {
      chat("sys", `Welcome back to ForgeBound, ${gg.name}.`);
      chat("sys", "Your last save was restored from this device.");
    } else {
      chat("sys", "Welcome to ForgeBound.");
      chat("info", "Starter kit: a bronze axe and pickaxe await in the inventory. The Westwood's trees make fine kindling.");
    }
    chat("sys", "Every deed is chronicled in the log below — progress autosaves to this device.");
    bump();
  };

  // Stable identity: every function closes over refs only, so the whole API
  // object can be memoised once. Consumers rely on this for their rAF loops.
  const api = useMemo(
    () => ({
      gref, g, bump, update,
      chat, gainXp,
      handleWorldClick, clickGround, startRecipe,
      clickInventorySlot, dropSlot, depositSlot, depositAll, withdraw, buy, sellSlot, unequip,
      dismissLevelUp, closeOverlays, saveNow, start, resetGame,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  return api;
}

export type GameApi = ReturnType<typeof useGame>;
