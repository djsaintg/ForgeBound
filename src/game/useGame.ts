import { useCallback, useMemo, useRef, useState } from "react";
import { VERSION } from "../version";
import type {
  Action,
  BlessingId,
  DialogueOption,
  NpcId,
  QuestEvent,
  ChatKind,
  GameState,
  GroundItem,
  InvSlot,
  ItemId,
  MenuOption,
  RecipeId,
  ResKey,
  SkillId,
  StationId,
  ToolSlot,
} from "./types";
import {
  BLESSING_BY_ID,
  BURY_XP,
  FOES,
  GROUND_ITEM_MS,
  ITEM_EXAMINE,
  ITEMS,
  MARO_LINES,
  MENDING_MS,
  OBJ_TO_RES,
  OBJ_TO_STATION,
  RECIPE_BY_ID,
  RECIPES,
  RESOURCES,
  ROKA_LINES,
  SELL_RATIO,
  STATION_NAMES,
  SUPPLY_RUNS,
  SWING_SPEED,
  TOOL_SPEED,
} from "./data";
import { COW_SPAWNS, CHICKEN_SPAWNS, GOBLIN_SPAWNS, MAP_H, MAP_W, SPAWN, groundAt, objAt, walkable } from "./map";
import { adjacentTo, findPath } from "./pathfinding";
import { MAX_XP, SKILLS, SKILL_BY_ID, fmt, levelForXp } from "./xp";
import { sfx, type Ground } from "./audio";
import { emote, jobOf, strikesDone } from "./anim";
import { NPC_NAME, QUESTS, currentStepOf, eventMatches, questPointsOf, stepProgressOf, today, type QuestDef } from "./quests";

export const SAVE_KEY = "forgebound-save-v1";
const STEP_MS = 168;
/** How close (tiles) the hero must be to talk to an NPC. */
const TALK_RANGE = 2;
// v2 (0.4.3) adds quests and Supply Runs; v1 saves load with none started.
const SAVE_VERSION = 2;
let uid = 100;

/** Something clickable on a world tile: its actions (default first) and what using an item on it does. */
interface Thing {
  name: string;
  actions: MenuOption[];
  use: (slot: number) => void;
}
const nextId = () => uid++;

/** What the hero's footsteps sound like on a tile. */
function groundSound(x: number, y: number): Ground {
  const gch = groundAt(x, y);
  return gch === "#" ? "stone" : gch === "," ? "path" : gch === "b" ? "wood" : gch === "_" ? "sand" : "grass";
}

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
    combatXp: { attack: true, strength: true },
    selected: null,
    guide: null,
    pendingTake: null,
    prayer: 1,
    blessings: [],
    quests: {},
    supply: null,
    supplyDay: {},
    dialogue: null,
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
      combatXp: g.combatXp,
      prayer: g.prayer,
      quests: g.quests,
      supply: g.supply,
      supplyDay: g.supplyDay,
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
    if (p?.version !== 1 && p?.version !== SAVE_VERSION) return null;
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
    // Saved timestamps belong to the last session's clock, so loaded items get a fresh two minutes
    if (Array.isArray(p.groundItems)) g.groundItems = p.groundItems.map((gi: GroundItem) => ({ ...gi, t: performance.now() }));
    // Older saves have no choice stored; a broken one with both off trains both
    const cx = p.combatXp ?? {};
    g.combatXp = { attack: cx.attack !== false, strength: cx.strength !== false };
    if (!g.combatXp.attack && !g.combatXp.strength) g.combatXp = { attack: true, strength: true };
    // Saves from before Prayer points start full
    const maxPrayer = levelForXp(g.xp.prayer);
    g.prayer = typeof p.prayer === "number" ? Math.max(0, Math.min(maxPrayer, p.prayer)) : maxPrayer;
    if (p.quests && typeof p.quests === "object") g.quests = p.quests;
    if (SUPPLY_RUNS.some((r) => r.id === p.supply)) g.supply = p.supply;
    if (p.supplyDay && typeof p.supplyDay === "object") g.supplyDay = p.supplyDay;
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

/** The hero name locked into the current save, or null when there is none. */
export function savedName(): string | null {
  return loadGame()?.name ?? null;
}

export function useGame() {
  const gref = useRef<GameState | null>(null);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const moveAcc = useRef(0);
  const mendAcc = useRef(0);
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
  const swingMul = (tier: number): number => SWING_SPEED[tier] ?? 1;

  /** Whether the hero's level is high enough to wield or wear an item. */
  const canWield = (id: ItemId): boolean => {
    const w = ITEMS[id].wield;
    return !w || levelForXp(g().xp[w.skill]) >= w.level;
  };
  const wieldError = (id: ItemId) => {
    const w = ITEMS[id].wield!;
    chat("err", `You need level ${w.level} ${SKILL_BY_ID[w.skill].name} to wield the ${ITEMS[id].name.toLowerCase()}.`);
    sfx.error();
  };

  const ensureTool = (tool?: "axe" | "pick" | "rod"): boolean => {
    if (!tool) return true;
    const gg = g();
    if (gg.equipped[tool]) return true;
    // Take the best one from the pack that the hero can actually wield
    let idx = -1;
    gg.inv.forEach((s, i) => {
      if (!s || ITEMS[s.item]?.cat !== tool || !canWield(s.item)) return;
      if (idx === -1 || (ITEMS[s.item].tier ?? 0) > (ITEMS[gg.inv[idx]!.item].tier ?? 0)) idx = i;
    });
    if (idx === -1) {
      const tooHigh = gg.inv.find((s) => s && ITEMS[s.item]?.cat === tool);
      if (tooHigh) {
        wieldError(tooHigh.item);
        return false;
      }
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
    gg.pendingTake = null;
  };

  const closeWindows = () => {
    const gg = g();
    gg.bankOpen = false;
    gg.shopOpen = false;
    gg.stationUI = null;
    gg.guide = null;
    gg.dialogue = null;
  };

  /** Walk over and open the bank, shop or a station's recipe list. */
  const openAt = (kind: "bank" | "shop" | "craft", x: number, y: number, station?: StationId) => {
    const gg = g();
    if (adjacentTo(gg.x, gg.y, x, y)) {
      if (kind === "bank") gg.bankOpen = true;
      else if (kind === "shop") gg.shopOpen = true;
      else if (station) gg.stationUI = { station, x, y };
      sfx.open(kind === "craft" ? "station" : kind);
    } else {
      gg.path = findPath(gg.x, gg.y, x, y) ?? [];
      gg.pendingStation = { kind, station, x, y };
    }
  };

  /** What to do once the hero reaches the NPC or altar they set off for. */
  const pendingDo = useRef<(() => void) | null>(null);

  /**
   * Do something at x,y that needs the hero close by: within `range` tiles
   * it happens at once, further away the hero walks over first.
   */
  const approach = (kind: "talk" | "pray", x: number, y: number, range: number, act: () => void) => {
    const gg = g();
    if (Math.max(Math.abs(gg.x - x), Math.abs(gg.y - y)) <= range) {
      act();
      return;
    }
    const p = findPath(gg.x, gg.y, x, y);
    if (!p) {
      chat("err", "You can't reach that from here.");
      sfx.error();
      return;
    }
    closeWindows();
    cancelAction();
    gg.path = p;
    gg.pendingStation = { kind, x, y };
    pendingDo.current = act;
  };

  /** Speak with (or hand something to) the NPC at x,y. */
  const speakTo = (x: number, y: number, say: () => void) => approach("talk", x, y, TALK_RANGE, say);

  // ------------------------------------------------------------- quests --

  const questPoints = () => questPointsOf(g());
  const currentStep = (q: QuestDef) => currentStepOf(g(), q);
  const stepProgress = (q: QuestDef) => stepProgressOf(g(), q);

  /** Count a hero action toward any quest step waiting for it (only from the moment that step began). */
  const questEvent = (e: QuestEvent) => {
    const gg = g();
    for (const q of QUESTS) {
      const st = currentStep(q);
      if (!st || st.kind !== "do" || !eventMatches(st.event, e)) continue;
      const p = gg.quests[q.id]!;
      if (p.count >= st.n) continue;
      p.count++;
      if (p.count >= st.n) chat("sys", `📜 ${q.name}: ${st.goal}, done! Report back to ${NPC_NAME[q.giver]}.`);
    }
  };

  const fill = (line: string, vals: Record<string, string | number>) =>
    line.replace(/\{(\w+)\}/g, (m, k) => (k in vals ? String(vals[k]) : m));

  /** Put a conversation on screen: the NPC's lines one page at a time, then the replies. */
  const say = (npc: NpcId, x: number, y: number, pages: string[], options: DialogueOption[] = [], vals: Record<string, string | number> = {}) => {
    const gg = g();
    const all = { name: gg.name, qp: questPoints(), ...vals };
    gg.dialogue = { id: nextId(), npc, x, y, pages: pages.map((l) => fill(l, all)), page: 0, options };
    sfx.voice(npc, syllablesFor(gg.dialogue.pages[0]));
    bump();
  };
  /** Longer lines get a little more babble, within reason. */
  const syllablesFor = (line: string) => Math.max(3, Math.min(7, Math.round(line.split(" ").length / 4)));
  const endTalk = () => { g().dialogue = null; bump(); };
  const bye: DialogueOption = { label: "Goodbye.", run: endTalk };

  const talkMaro = (x: number, y: number, pages?: string[]) => {
    const gg = g();
    const mine = QUESTS.filter((q) => q.giver === "maro");
    const active = mine.filter((q) => currentStep(q));
    const done = mine.filter((q) => gg.quests[q.id]?.done);
    const greeting = pages
      ?? (!Object.keys(gg.quests).length
        ? ["Ah, a new face! I'm Maro. Old Maro, they call me, though I can't think why. What can I do for you?"]
        : done.length && Math.random() < 0.4
        ? [done[Math.floor(Math.random() * done.length)].afterword + " What can I do for you, {name}?"]
        : ["Ah, {name}! Good to see you. What can I do for you?"]);
    say("maro", x, y, greeting, [
      ...active.map((q) => ({ label: `About "${q.name}"…`, run: () => aboutQuest(q, x, y) })),
      { label: "Do you have any work for me?", run: () => maroWork(x, y) },
      {
        label: "Tell me about the valley.",
        run: () => {
          const idx = Math.floor(cowSeed.current++) % MARO_LINES.length;
          say("maro", x, y, [MARO_LINES[idx]], [
            { label: "Tell me more.", run: () => talkMaro(x, y, ["What else would you like to know?"]) },
            bye,
          ]);
        },
      },
      bye,
    ]);
  };

  /** "Something else": back to the giver's main menu. */
  const back = (q: QuestDef | NpcId, x: number, y: number): DialogueOption => {
    const npc = typeof q === "string" ? q : q.giver;
    return { label: "Something else.", run: () => (npc === "maro" ? talkMaro(x, y, ["Anything else?"]) : talkRoka(x, y, ["Anything else?"])) };
  };

  const maroWork = (x: number, y: number) => {
    const gg = g();
    // Offered: open ones, plus any held back only by quest points (so Maro can say why)
    const open = QUESTS.filter((q) => q.giver === "maro" && !gg.quests[q.id] && (q.after ?? []).every((a) => gg.quests[a]?.done));
    if (!open.length) {
      const allDone = QUESTS.filter((q) => q.giver === "maro").every((q) => gg.quests[q.id]?.done);
      return say("maro", x, y, [allDone
        ? "Not just now, young one. You've done everything I've asked, and more besides."
        : "Nothing new just now. See to what you've already promised me first."], [back("maro", x, y), bye]);
    }
    if (open.length === 1) return offerQuest(open[0], x, y);
    say("maro", x, y, ["Let me think… there's always something needs doing."], [
      ...open.map((q) => ({ label: q.name, run: () => offerQuest(q, x, y) })),
      back("maro", x, y),
    ]);
  };

  const offerQuest = (q: QuestDef, x: number, y: number) => {
    if (q.minQp && questPoints() < q.minQp) return say(q.giver, x, y, q.locked ?? [], [back(q, x, y), bye]);
    say(q.giver, x, y, q.offer, [
      { label: "I'll do it.", run: () => acceptQuest(q, x, y) },
      { label: "Not right now.", run: () => say(q.giver, x, y, q.decline, [back(q, x, y), bye]) },
    ]);
  };

  const acceptQuest = (q: QuestDef, x: number, y: number) => {
    g().quests[q.id] = { step: 0, count: 0, done: false };
    chat("sys", `📜 Quest started: ${q.name}. ${q.steps[0].goal}.`);
    sfx.bless();
    say(q.giver, x, y, q.accept, [back(q, x, y), bye]);
  };

  /** Talking about a quest in progress: report the step if it's met, otherwise a reminder. */
  const aboutQuest = (q: QuestDef, x: number, y: number) => {
    const st = currentStep(q);
    if (!st) return talkMaro(x, y);
    const prog = stepProgress(q);
    if (!prog.met) return say(q.giver, x, y, st.checkIn, [back(q, x, y), bye], { n: prog.n, need: prog.need });

    const gg = g();
    const p = gg.quests[q.id]!;
    const last = p.step === q.steps.length - 1;
    if (last) {
      // Make sure the rewards fit before taking anything
      const slots = (q.reward.items?.length ?? 0) + (q.reward.choice ? 1 : 0) - (st.kind === "bring" ? st.n : 0);
      if (slots > freeSlots(gg)) {
        return say(q.giver, x, y, [`Your pack's full to bursting. Make room for ${slots - freeSlots(gg)} more and come back.`], [bye]);
      }
    }
    if (st.kind === "bring") removeItems({ [st.item]: st.n });
    if (!last) {
      p.step++;
      p.count = 0;
      chat("sys", `📜 ${q.name}: ${q.steps[p.step].goal}.`);
      sfx.coin();
      return say(q.giver, x, y, st.done, [back(q, x, y), bye]);
    }
    const choice = q.reward.choice;
    if (choice) {
      return say(q.giver, x, y, [...st.done, choice.prompt], choice.items.map((it) => ({
        label: `The ${ITEMS[it].name.toLowerCase()}.`,
        run: () => { finishQuest(q, it); say(q.giver, x, y, ["A good choice. Use it well, young one."], [bye]); },
      })));
    }
    finishQuest(q);
    say(q.giver, x, y, st.done, [back(q, x, y), bye]);
  };

  const finishQuest = (q: QuestDef, choice?: ItemId) => {
    const gg = g();
    const p = gg.quests[q.id]!;
    p.step = q.steps.length;
    p.done = true;
    const got: string[] = [];
    if (q.reward.coins) { gg.coins += q.reward.coins; got.push(`${q.reward.coins} coins`); }
    for (const it of [...(q.reward.items ?? []), ...(choice ? [choice] : [])]) {
      addItem(it, 1);
      got.push(ITEMS[it].name.toLowerCase());
    }
    chat("sys", `🏆 Quest complete: ${q.name}! You receive ${got.join(", ")} and ${q.reward.qp} quest point${q.reward.qp > 1 ? "s" : ""}.`);
    sfx.quest();
  };

  // Roka's Supply Runs: four requests, each once per (local) day
  const supplyPay = (item: ItemId, n: number) => 2 * Math.max(1, Math.floor(ITEMS[item].price * SELL_RATIO)) * n;

  const talkRoka = (x: number, y: number, pages?: string[]) =>
    say("roka", x, y, pages ?? ["Welcome to my stall! Buying, selling, or looking for work?"], [
      { label: "Let's trade.", run: () => { endTalk(); openAt("shop", x, y); } },
      { label: "Any work for me?", run: () => supplyTalk(x, y) },
      {
        label: "Any advice?",
        run: () => say("roka", x, y, [ROKA_LINES[Math.floor(Math.random() * ROKA_LINES.length)].replace(/^Roka: /, "")], [back("roka", x, y), bye]),
      },
      bye,
    ]);

  const supplyTalk = (x: number, y: number) => {
    const gg = g();
    const run = SUPPLY_RUNS.find((r) => r.id === gg.supply);
    if (run) {
      const have = countItem(run.item);
      const pay = supplyPay(run.item, run.n);
      if (have < run.n) {
        return say("roka", x, y, [`${run.n} ${run.label}, friend. You've got ${have} in your pack. ${pay} coins when you bring them!`], [back("roka", x, y), bye]);
      }
      return say("roka", x, y, [`Is that ${run.n} ${run.label} I see? Hand them over!`], [
        {
          label: "Here you go.",
          run: () => {
            removeItems({ [run.item]: run.n });
            gg.coins += pay;
            gg.supplyDay[run.id] = today();
            gg.supply = null;
            chat("sys", `📦 Supply Run done: ${run.n} ${run.label} for Roka · +${pay} coins.`);
            sfx.coin();
            const more = SUPPLY_RUNS.some((r) => gg.supplyDay[r.id] !== today());
            say("roka", x, y, [more
              ? "Pleasure doing business! Ask again whenever. I'm sure I've run out of something else already."
              : "Pleasure doing business! That's everything I need today. Come back tomorrow, I'm sure to be short of something."], [back("roka", x, y), bye]);
          },
        },
        { label: "Not yet.", run: () => say("roka", x, y, ["Suit yourself. I'll be here."], [back("roka", x, y), bye]) },
      ]);
    }
    const open = SUPPLY_RUNS.filter((r) => gg.supplyDay[r.id] !== today());
    if (!open.length) {
      return say("roka", x, y, ["That's everything I need today. Come back tomorrow, I'm sure to be short of something!"], [back("roka", x, y), bye]);
    }
    const pick = open[Math.floor(Math.random() * open.length)];
    const pay = supplyPay(pick.item, pick.n);
    say("roka", x, y, [
      `Business is booming and my shelves are bare! Bring me ${pick.n} ${pick.label} and I'll pay ${pay} coins.`,
      "That's double what I'd give you over the counter, so don't tell anyone.",
    ], [
      {
        label: "I'll do it.",
        run: () => {
          gg.supply = pick.id;
          chat("sys", `📦 Supply Run: bring Roka ${pick.n} ${pick.label} for ${pay} coins.`);
          say("roka", x, y, ["Wonderful! You know where to find me."], [back("roka", x, y), bye]);
        },
      },
      { label: "Not right now.", run: () => say("roka", x, y, ["No matter. Ask me again any time today."], [back("roka", x, y), bye]) },
    ]);
  };

  /** Dialogue box controls: next page, or pick a reply on the last one. */
  const dialogueNext = () => {
    const d = g().dialogue;
    if (!d) return;
    if (d.page < d.pages.length - 1) { d.page++; sfx.voice(d.npc, syllablesFor(d.pages[d.page])); }
    else if (!d.options.length) g().dialogue = null;
    bump();
  };
  const dialogueChoose = (i: number) => {
    const d = g().dialogue;
    if (!d || d.page < d.pages.length - 1) return;
    d.options[i]?.run();
    bump();
  };

  const maxPrayer = () => levelForXp(g().xp.prayer);

  /** Kneel at an altar and refill prayer points. */
  const prayAt = (x: number, y: number) =>
    approach("pray", x, y, 1, () => {
      const gg = g();
      const max = maxPrayer();
      if (gg.prayer >= max) {
        chat("info", "You kneel at the altar. Your prayer is already full.");
      } else {
        gg.prayer = max;
        emote.buryAt = performance.now();
        chat("sys", `${gg.name} kneels at the altar and is filled with light · prayer restored to ${max}.`);
      }
      sfx.pray();
    });

  /** Switch a blessing on or off from the Prayer tab. */
  const toggleBlessing = (id: BlessingId) => {
    const gg = g();
    const b = BLESSING_BY_ID[id];
    if (gg.blessings.includes(id)) {
      gg.blessings = gg.blessings.filter((q) => q !== id);
      sfx.unbless();
    } else if (levelForXp(gg.xp.prayer) < b.level) {
      chat("err", `${b.name} needs level ${b.level} Prayer.`);
      sfx.error();
    } else if (gg.prayer <= 0) {
      chat("err", "You have no prayer points left. Recharge them at the altar in Vale Square.");
      sfx.error();
    } else {
      gg.blessings = [...gg.blessings, id];
      sfx.bless();
    }
    bump();
  };

  const blessed = (id: BlessingId) => g().blessings.includes(id);

  const pickUp = (id: number) => {
    const gg = g();
    const idx = gg.groundItems.findIndex((gi) => gi.id === id);
    if (idx === -1) return;
    const gItem = gg.groundItems[idx];
    if (gItem.item !== "coins" && freeSlots(gg) < 1 && !ITEMS[gItem.item]?.stackable) {
      chat("err", "Your backpack is full, cannot pick up loot!");
      sfx.error();
      return;
    }
    const added = addItem(gItem.item, gItem.n);
    if (added > 0) {
      gg.groundItems.splice(idx, 1);
      if (gItem.item === "coins") sfx.coin(); else sfx.pickup();
      const itemName = ITEMS[gItem.item]?.name.toLowerCase() || gItem.item;
      chat("info", `${gg.name} picked up ${gItem.n > 1 ? gItem.n + "× " : ""}${itemName} from the ground.`);
    }
  };

  /** Pick up a ground item, walking over first if it's out of reach. */
  const take = (id: number) => {
    const gg = g();
    const gi = gg.groundItems.find((q) => q.id === id);
    if (!gi) return;
    if (adjacentTo(gg.x, gg.y, gi.x, gi.y)) {
      pickUp(id);
      return;
    }
    const p = findPath(gg.x, gg.y, gi.x, gi.y);
    if (!p) {
      chat("err", "You can't reach that spot.");
      sfx.error();
      return;
    }
    gg.path = p;
    gg.pendingTake = id;
  };

  type FoeKind = "cow" | "chicken" | "goblin";
  type Foe = { id: number; x: number; y: number; hp: number; maxHp: number; moo?: number; cluck?: number; grunt?: number };

  const foeInfo = (kind: FoeKind, f: Foe) =>
    FOES[kind === "goblin" && f.maxHp >= FOES.brigand.hp ? "brigand" : kind];

  const attack = (kind: FoeKind, f: Foe) => {
    const gg = g();
    if (f.hp <= 0) return;
    const p = findPath(gg.x, gg.y, Math.round(f.x), Math.round(f.y), true);
    if (p) gg.path = p;
    const base = kind === "cow" ? 1800 : kind === "chicken" ? 1600 : 2000;
    gg.action = { kind: "combat", targetKind: kind, targetId: f.id, progress: 0, cycle: Math.round(base * swingMul(toolTier("weapon"))) };
    if (kind === "cow") {
      f.moo = performance.now() + 1000;
      sfx.moo();
      chat("info", `${gg.name} raises their weapon and attacks the pasture cow! Moo!`);
    } else if (kind === "chicken") {
      f.cluck = performance.now() + 1000;
      sfx.cluck();
      chat("info", `${gg.name} attacks the coop hen! "Cluck cluck!" 🐔`);
    } else {
      f.grunt = performance.now() + 1200;
      sfx.grunt();
      const taunts = [
        `Goblin Warrior grunts fiercely! "Human dare challenge N.E. clan?!"`,
        `Goblin Warrior raises spiked club! "You pay shiny gold for trespassing!"`,
      ];
      chat("npc", taunts[Math.floor(Math.random() * taunts.length)]);
      chat("info", `${gg.name} charges into combat against the ${foeInfo(kind, f).name}!`);
    }
  };

  const nothing = () => chat("info", "Nothing interesting happens.");

  /** Start a recipe at a station tile, walking over first if needed. */
  const beginRecipe = (id: RecipeId, x: number, y: number): boolean => {
    const gg = g();
    const r = RECIPE_BY_ID[id];
    if (levelForXp(gg.xp[r.skill]) < r.level) {
      chat("err", `Requires level ${r.level} ${SKILL_BY_ID[r.skill].name}.`);
      sfx.error();
      return false;
    }
    for (const [reqId, reqN] of Object.entries(r.inputs)) {
      if (countItem(reqId as ItemId) < (reqN ?? 0)) {
        chat("err", `Requires ${reqN}× ${ITEMS[reqId as ItemId]?.name ?? reqId}.`);
        sfx.error();
        return false;
      }
    }
    if (!adjacentTo(gg.x, gg.y, x, y)) gg.path = findPath(gg.x, gg.y, x, y) ?? [];
    gg.action = { kind: "station", x, y, recipe: id, progress: 0, cycle: r.cycle };
    sfx.click();
    return true;
  };

  /** Ore on the furnace, a bar on the anvil, raw food on the fire. */
  const useOnStation = (slot: number, station: StationId, x: number, y: number) => {
    const gg = g();
    const s = gg.inv[slot];
    if (!s) return;
    const cands = RECIPES.filter((r) => r.station === station && r.inputs[s.item]);
    if (!cands.length) return nothing();
    const doable = cands.filter(
      (r) => levelForXp(gg.xp[r.skill]) >= r.level &&
        Object.entries(r.inputs).every(([id, n]) => countItem(id as ItemId) >= (n ?? 0))
    );
    // One clear choice starts straight away; several open the recipe list
    if (doable.length === 1) beginRecipe(doable[0].id, x, y);
    else if (doable.length > 1) openAt("craft", x, y, station);
    else beginRecipe(cands[0].id, x, y); // reports what's missing
  };

  const RES_VERB: Record<ResKey, string> = {
    tree: "Chop down", oak: "Chop down",
    copper: "Mine", tin: "Mine", iron: "Mine", coal: "Mine", gold: "Mine",
    shrimp: "Net", trout: "Lure",
  };
  const RES_ABOUT: Record<ResKey, string> = {
    tree: "A common valley tree.",
    oak: "A broad old oak. Its logs are heavy and slow to cut.",
    copper: "Rocks veined with reddish copper.",
    tin: "Rocks flecked with grey tin.",
    iron: "Dark rocks heavy with iron.",
    coal: "A seam of black coal.",
    gold: "Rocks glinting with gold.",
    shrimp: "Shrimp dart about in the shallows.",
    trout: "Trout rise in the fast water. They'll take a feathered fly.",
  };
  const STATION_VERB: Record<StationId, string> = { furnace: "Smelt", anvil: "Smith", fire: "Cook" };
  const STATION_ABOUT: Record<StationId, string> = {
    furnace: "A roaring furnace. Smelt ore into bars here.",
    anvil: "A heavy anvil. Hammer bars into weapons and armour.",
    fire: "A crackling campfire. Cook raw food over it.",
  };
  const SCENERY: Record<string, [string, string]> = {
    H: ["Goblin tent", "A rustic hide goblin tent adorned with boar tusks and tribal pennants."],
    V: ["Goblin banner", "A tribal bone banner displaying the crest of the North-East Goblin Clan."],
    c: ["Hen house", "A wooden chicken hen house full of roosting feathers and straw."],
    h: ["Hay bale", "A golden hay bale stacked in the farm coop."],
  };

  /** Everything clickable on a tile, topmost first, each with its actions (default first). */
  const thingsAt = (x: number, y: number): Thing[] => {
    const gg = g();
    const out: Thing[] = [];
    const inspect = (text: string): MenuOption => ({ label: "Inspect", run: () => chat("info", text) });

    // Foes come first, so left-click fights rather than grabbing loot underfoot
    const foes: [FoeKind, Foe[]][] = [["cow", gg.cows], ["chicken", gg.chickens ?? []], ["goblin", gg.goblins ?? []]];
    for (const [kind, list] of foes) {
      for (const f of list) {
        if (f.hp <= 0 || Math.round(f.x) !== x || Math.round(f.y) !== y) continue;
        const info = foeInfo(kind, f);
        const name = `${info.name} (level ${info.level})`;
        out.push({
          name,
          actions: [
            { label: "Attack", target: name, run: () => attack(kind, f) },
            { ...inspect(`${info.name} · level ${info.level} · HP ${Math.ceil(f.hp)}/${f.maxHp}. ${info.about}`), target: name },
          ],
          use: nothing,
        });
      }
    }

    for (const gi of gg.groundItems ?? []) {
      if (Math.round(gi.x) !== x || Math.round(gi.y) !== y) continue;
      const name = `${ITEMS[gi.item]?.name ?? gi.item}${gi.n > 1 ? ` (${gi.n})` : ""}`;
      out.push({
        name,
        actions: [
          { label: "Take", target: name, run: () => take(gi.id) },
          { label: "Inspect", target: name, run: () => chat("info", `${name}: ${ITEM_EXAMINE[gi.item]}`) },
        ],
        use: nothing,
      });
    }

    const ch = objAt(x, y);
    const res = OBJ_TO_RES[ch];
    const station = OBJ_TO_STATION[ch];
    if (ch === "M") {
      out.push({
        name: "Roka",
        actions: [
          { label: "Trade", target: "Roka", run: () => openAt("shop", x, y) },
          {
            label: "Talk to", target: "Roka",
            run: () => speakTo(x, y, () => talkRoka(x, y)),
          },
          { ...inspect("Roka, the valley trader. Buys and sells tools, gear and goods."), target: "Roka" },
        ],
        use: (slot) => {
          const s = gg.inv[slot];
          if (!s) return;
          // Handing over a Supply Run's goods goes straight to the hand-in
          const run = SUPPLY_RUNS.find((r) => r.id === gg.supply);
          if (run && run.item === s.item) return speakTo(x, y, () => supplyTalk(x, y));
          const each = Math.max(1, Math.floor(ITEMS[s.item].price * SELL_RATIO));
          speakTo(x, y, () => chat("npc", `Roka: I'd give you ${each} coin${each > 1 ? "s" : ""} for ${s.n > 1 ? "each of those" : "that"}. Trade with me if you want to sell.`));
        },
      });
    } else if (ch === "P") {
      out.push({
        name: "Old Maro",
        actions: [
          {
            label: "Talk to", target: "Old Maro",
            run: () => speakTo(x, y, () => talkMaro(x, y)),
          },
          { ...inspect("Old Maro, the valley's guide, full of good advice."), target: "Old Maro" },
        ],
        use: (slot) => {
          const s = gg.inv[slot];
          if (!s) return;
          // Handing over what a quest asked for goes straight to that quest
          const q = QUESTS.find((d) => {
            const st = currentStep(d);
            return d.giver === "maro" && st && st.kind !== "do" && st.item === s.item;
          });
          if (q) return speakTo(x, y, () => aboutQuest(q, x, y));
          speakTo(x, y, () => chat("npc", `Old Maro: ${ITEMS[s.item].name}? Hold on to it, young one. You'll find a use for it.`));
        },
      });
    } else if (ch === "B") {
      out.push({
        name: "Bank booth",
        actions: [
          { label: "Bank", target: "Bank booth", run: () => openAt("bank", x, y) },
          { ...inspect("The Bank of ForgeBound. Your belongings are safe here."), target: "Bank booth" },
        ],
        use: (slot) => (adjacentTo(gg.x, gg.y, x, y) ? depositSlot(slot) : openAt("bank", x, y)),
      });
    } else if (station && station !== "bank") {
      const name = STATION_NAMES[station];
      out.push({
        name,
        actions: [
          { label: STATION_VERB[station], target: name, run: () => openAt("craft", x, y, station) },
          { ...inspect(`${name}: ${STATION_ABOUT[station]}`), target: name },
        ],
        use: (slot) => useOnStation(slot, station, x, y),
      });
    } else if (res) {
      const def = RESOURCES[res];
      const lvl = levelForXp(gg.xp[def.skill]);
      const need = `Needs level ${def.level} ${SKILL_BY_ID[def.skill].name}${lvl < def.level ? ` (you have ${lvl})` : ""}.`;
      const spent = (gg.depleted[`${x},${y}`] ?? 0) > performance.now() ? " It's spent for now." : "";
      out.push({
        name: def.name,
        actions: [
          { label: RES_VERB[res], target: def.name, run: () => startGather(x, y, res) },
          { ...inspect(`${def.name}: ${RES_ABOUT[res]}${spent} ${need}`), target: def.name },
        ],
        use: nothing,
      });
    } else if (ch === "L") {
      const max = maxPrayer();
      out.push({
        name: "Altar",
        actions: [
          { label: "Pray at", target: "Altar", run: () => prayAt(x, y) },
          { ...inspect(`Altar: A quiet stone altar. Pray here to restore your prayer points (${Math.floor(gg.prayer)}/${max}).`), target: "Altar" },
        ],
        use: nothing,
      });
    } else if (SCENERY[ch]) {
      const [name, text] = SCENERY[ch];
      out.push({
        name,
        actions: [{ label: "Inspect", target: name, run: () => { chat("info", text); sfx.click(); } }],
        use: nothing,
      });
    }
    return out;
  };

  /**
   * The right-click menu for a world tile. Its first entry is what left-click
   * does, so the two can never disagree. With an item selected, the menu
   * offers to use it on each thing there instead.
   */
  const worldActions = (x: number, y: number): MenuOption[] => {
    const gg = g();
    const things = thingsAt(x, y);
    // Talk and Inspect leave the current job running; everything else replaces it
    const keep = (o: MenuOption) => o.label === "Inspect" || o.label === "Talk to";
    const wrap = (o: MenuOption): MenuOption => ({
      ...o,
      run: () => {
        if (!keep(o)) {
          closeWindows();
          cancelAction();
        }
        o.run();
      },
    });
    const walk: MenuOption = { label: "Walk here", run: () => clickGround(x, y) };
    const sel = gg.selected !== null ? gg.inv[gg.selected] : null;
    if (sel) {
      const slot = gg.selected!;
      const item = ITEMS[sel.item].name;
      return [
        ...things.map((t) => wrap({
          label: "Use", target: `${item} → ${t.name}`,
          run: () => { gg.selected = null; t.use(slot); },
        })),
        { label: "Cancel", target: item, run: () => { gg.selected = null; } },
        walk,
      ];
    }
    return [...things.flatMap((t) => t.actions).map(wrap), walk];
  };

  const handleWorldClick = (x: number, y: number) => {
    const gg = g();
    // An item in hand: use it on whatever is here, or put it away on empty ground
    if (gg.selected !== null && thingsAt(x, y).length === 0) {
      gg.selected = null;
      return;
    }
    worldActions(x, y)[0].run();
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
    questEvent({ kind: "gather", item: def.item });
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
    if (!gg.stationUI) return;
    beginRecipe(id, gg.stationUI.x, gg.stationUI.y);
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
    questEvent({ kind: "make", item: r.output });
    sfx.smith();
    chat("info", `${gg.name} crafted ${ITEMS[r.output]?.name.toLowerCase() || r.output} · +${r.xp} XP`);
    // Stop as soon as the last set of materials is used, rather than swinging
    // one more empty cycle at the furnace or anvil before noticing.
    const more = Object.entries(r.inputs).every(([id, n]) => countItem(id as ItemId) >= (n ?? 0));
    if (!more) {
      chat("info", `${gg.name} has run out of materials for that.`);
      gg.action = null;
    } else {
      a.progress = 0;
    }
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
    const tx = Math.round(target.x), ty = Math.round(target.y);
    if (!adjacentTo(gg.x, gg.y, tx, ty) || (gg.x === tx && gg.y === ty)) {
      const p = findPath(gg.x, gg.y, tx, ty, true);
      if (p && p.length > 0) {
        gg.path = p;
        return; // move first before hitting
      }
    }

    // 1. Hero Attacks Monster with Accuracy & Strength factor
    const strLvl = levelForXp(gg.xp.strength || 0);
    const attLvl = levelForXp(gg.xp.attack || 0);
    const wpnTier = toolTier("weapon");
    const accuracyRoll = Math.random() + attLvl * 0.02 + (blessed("clear_eye") ? 0.1 : 0);
    const maxHit = Math.max(2, Math.floor(1 + strLvl / 3 + wpnTier * 1.5)) + (blessed("ox_might") ? 1 : 0);
    const hitDmg = accuracyRoll > 0.15 ? Math.floor(Math.random() * maxHit) + 1 : 0;

    target.hp = Math.max(0, target.hp - hitDmg);
    if (hitDmg > 0) {
      target.hit = now; // drives the white hit-flash in the renderer
      sfx.hit();
      addFloat(`-${hitDmg}`, "rgb(255,80,80)", target.x - gg.x, target.y - gg.y);
      // Grant Combat XP: the same total per hit, shared between the chosen
      // skills, so training one alone is never slower than training both
      const share = hitDmg * 4 + 8;
      const { attack, strength } = gg.combatXp;
      if (attack) gainXp("attack", strength ? share : share * 2);
      if (strength) gainXp("strength", attack ? share : share * 2);
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
      questEvent({ kind: "kill", foe: a.targetKind === "goblin" && target.maxHp >= FOES.brigand.hp ? "brigand" : a.targetKind });

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
      if (blessed("stoneskin") && Math.random() < 0.15) enemyDmg = 0;
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
    closeWindows();
    const path = findPath(gg.x, gg.y, x, y);
    if (path) gg.path = path;
  };

  const update = (dt: number, now: number) => {
    const gg = g();
    if (!gg.groundItems) gg.groundItems = [];
    // Whatever is left lying around (drops, loot, eggs) despawns after two minutes
    gg.groundItems = gg.groundItems.filter((gi) => now - gi.t < GROUND_ITEM_MS);

    // movement
    if (gg.path.length) {
      moveAcc.current += dt;
      while (moveAcc.current >= STEP_MS && gg.path.length) {
        moveAcc.current -= STEP_MS;
        const t = gg.path.shift()!;
        gg.x = t.x;
        gg.y = t.y;
        sfx.step(groundSound(gg.x, gg.y));
      }
    } else {
      moveAcc.current = 0;
      if (gg.pendingStation && adjacentTo(gg.x, gg.y, gg.pendingStation.x, gg.pendingStation.y)) {
        const p = gg.pendingStation;
        if (p.kind === "bank") gg.bankOpen = true;
        else if (p.kind === "shop") gg.shopOpen = true;
        else if (p.kind === "craft" && p.station) gg.stationUI = { station: p.station, x: p.x, y: p.y };
        if (p.kind === "talk" || p.kind === "pray") {
          pendingDo.current?.();
          pendingDo.current = null;
        } else sfx.open(p.kind === "craft" ? "station" : p.kind);
        gg.pendingStation = null;
      }
      if (gg.pendingTake !== null) {
        const id = gg.pendingTake;
        gg.pendingTake = null;
        const gi = gg.groundItems.find((q) => q.id === id);
        if (gi && adjacentTo(gg.x, gg.y, gi.x, gi.y)) pickUp(id);
      }
    }

    // action progression
    if (gg.action) {
      // Axe, pick and hammer blows sound as each one lands in the animation
      const job = gg.path.length ? null : jobOf(gg);
      if (job === "chop" || job === "mine" || job === "smith") {
        const a = gg.action;
        if (strikesDone(a.progress + dt, a.cycle, job) > strikesDone(a.progress, a.cycle, job)) {
          if (job === "chop") sfx.chop(); else if (job === "mine") sfx.clink(); else sfx.tap();
        }
      }
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

    const inFight = (kind: "cow" | "chicken" | "goblin", id: number) =>
      gg.action?.kind === "combat" && gg.action.targetKind === kind && gg.action.targetId === id;

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
      // A foe in a fight holds its ground, and nothing wanders onto the hero
      if (c.x === c.dx && c.y === c.dy && now > c.nextMove && !inFight("cow", c.id)) {
        if (Math.random() < 0.05) {
          const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
          const d = dirs[Math.floor(Math.random() * dirs.length)];
          const nx = c.x + d.x, ny = c.y + d.y;
          if (nx >= 26 && nx <= 36 && ny >= 12 && ny <= 17 && walkable(nx, ny) && !(nx === gg.x && ny === gg.y)) {
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

        if (ch.x === ch.dx && ch.y === ch.dy && now > ch.nextMove && !inFight("chicken", ch.id)) {
          if (Math.random() < 0.08) {
            const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = ch.x + d.x, ny = ch.y + d.y;
            if (nx >= 41 && nx <= 45 && ny >= 26 && ny <= 29 && walkable(nx, ny) && !(nx === gg.x && ny === gg.y)) {
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
        if (gb.x === gb.dx && gb.y === gb.dy && now > gb.nextMove && !inFight("goblin", gb.id)) {
          if (Math.random() < 0.06) {
            const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = gb.x + d.x, ny = gb.y + d.y;
            if (nx >= 44 && nx <= 59 && ny >= 11 && ny <= 17 && walkable(nx, ny) && !(nx === gg.x && ny === gg.y)) {
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

    // Blessings drain prayer points; when they run dry every blessing fades
    if (gg.blessings.length) {
      gg.prayer -= gg.blessings.reduce((sum, id) => sum + dt / BLESSING_BY_ID[id].drainMs, 0);
      if (gg.prayer <= 0) {
        gg.prayer = 0;
        gg.blessings = [];
        chat("err", "You have run out of prayer points. Your blessings fade. Recharge at the altar in Vale Square.");
        sfx.unbless();
      }
    }
    if (blessed("mending") && gg.hp < gg.maxHp) {
      mendAcc.current += dt;
      if (mendAcc.current >= MENDING_MS) {
        mendAcc.current -= MENDING_MS;
        gg.hp = Math.min(gg.maxHp, gg.hp + 1);
        addFloat("+1", "rgb(120,230,140)");
      }
    } else mendAcc.current = 0;

    // Walking away ends a conversation
    if (gg.dialogue && Math.max(Math.abs(gg.x - gg.dialogue.x), Math.abs(gg.y - gg.dialogue.y)) > TALK_RANGE + 1) gg.dialogue = null;

    // A held item that got used up or moved away is put down
    if (gg.selected !== null && !gg.inv[gg.selected]) gg.selected = null;

    // cleanup expired text / events
    gg.floats = gg.floats.filter((f) => now - f.t < 1400);
    gg.xpEvents = gg.xpEvents.filter((e) => now - e.t < 2000);
  };

  type Primary = "Eat" | "Bury" | "Wield" | "Wear" | "Pour";
  /** What left-click does to an item without a selection; null means select it. */
  const primaryOf = (item: ItemId): Primary | null => {
    const cat = ITEMS[item].cat;
    if (cat === "food") return "Eat";
    // A combat bottle has no default: its menu asks where the XP should go
    if (cat === "bottle") return ITEMS[item].bottle?.skill === "combat" ? null : "Pour";
    if (cat === "bone") return "Bury";
    if (cat === "armor") return "Wear";
    if (cat === "axe" || cat === "pick" || cat === "rod" || cat === "weapon") return "Wield";
    return null;
  };

  /** Eat, bury or equip the item in a slot. */
  const applySlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s) return;
    const def = ITEMS[s.item];
    gg.selected = null;

    if (def.cat === "bone") {
      gg.inv[idx] = s.n > 1 ? { item: s.item, n: s.n - 1 } : null;
      gainXp("prayer", BURY_XP);
      sfx.bury();
      emote.buryAt = performance.now();
      chat("sys", `${gg.name} buried the bones in reverent prayer · +${BURY_XP} Prayer XP`);
      questEvent({ kind: "bury" });
    } else if (def.cat === "axe" || def.cat === "pick" || def.cat === "rod" || def.cat === "weapon" || def.cat === "armor") {
      if (!canWield(s.item)) return wieldError(s.item);
      const slot: ToolSlot = def.cat;
      // The old piece takes the new one's place in the backpack
      const prev = gg.equipped[slot];
      gg.inv[idx] = prev ? { item: prev, n: 1 } : null;
      gg.equipped[slot] = s.item;
      chat("info", `${gg.name} donned the ${def.name.toLowerCase()}.`);
      sfx.click();
    } else if (def.cat === "bottle") {
      return pourBottle(idx);
    } else if (def.cat === "food") {
      gg.inv[idx] = s.n > 1 ? { item: s.item, n: s.n - 1 } : null;
      const healAmount = def.heal ?? 3;
      gg.hp = Math.min(gg.maxHp, gg.hp + healAmount);
      chat("info", `${gg.name} heartily ate ${art(def.name)} ${def.name.toLowerCase()} · +${healAmount} HP`);
      sfx.eat();
      questEvent({ kind: "eat", item: s.item });
    }
    bump();
  };

  /** Pour an XP bottle; a combat bottle goes into Attack, Strength or half into each. */
  const pourBottle = (idx: number, into?: "attack" | "strength" | "split") => {
    const gg = g();
    const s = gg.inv[idx];
    const b = s && ITEMS[s.item].bottle;
    if (!s || !b) return;
    if (b.skill === "combat" && !into) return;
    gg.inv[idx] = null;
    gg.selected = null;
    if (b.skill !== "combat") gainXp(b.skill, b.xp);
    else if (into === "split") { gainXp("attack", b.xp / 2); gainXp("strength", b.xp / 2); }
    else gainXp(into!, b.xp);
    const where = b.skill !== "combat" ? SKILL_BY_ID[b.skill].name
      : into === "split" ? "Attack and Strength" : SKILL_BY_ID[into!].name;
    chat("sys", `${gg.name} uncorks the bottle and the light pours into ${where} · +${b.xp} XP`);
    sfx.pour();
    bump();
  };

  /** Pick an item up to use on something; picking the same one again puts it back. */
  const selectSlot = (idx: number) => {
    const gg = g();
    if (!gg.inv[idx]) return;
    gg.selected = gg.selected === idx ? null : idx;
    sfx.click();
    bump();
  };

  const useOnSlot = (from: number, to: number) => {
    const gg = g();
    const a = gg.inv[from], b = gg.inv[to];
    gg.selected = null;
    if (a && b && from !== to) {
      const pair = new Set([a.item, b.item]);
      if (pair.has("feathers") && (pair.has("logs") || pair.has("oak_logs"))) {
        chat("info", "You turn the feathers over against the logs… Fletching is still being forged.");
      } else nothing();
    }
    bump();
  };

  const inspectSlot = (idx: number) => {
    const s = g().inv[idx];
    if (!s) return;
    const def = ITEMS[s.item];
    const value = Math.max(1, Math.floor(def.price * SELL_RATIO));
    const heal = def.heal ? ` Heals ${def.heal} HP.` : "";
    const need = def.wield ? ` Needs level ${def.wield.level} ${SKILL_BY_ID[def.wield.skill].name} to wield.` : "";
    chat("info", `${def.name}: ${ITEM_EXAMINE[s.item]}${heal}${need} Roka pays ${value} coin${value > 1 ? "s" : ""}${s.n > 1 ? " each" : ""}.`);
    bump();
  };

  /** Left-click on a backpack slot: shift drops, a held item is used on it, otherwise the default action. */
  const clickInventorySlot = (idx: number, shift = false) => {
    const gg = g();
    const s = gg.inv[idx];
    if (shift && s) return dropSlot(idx);
    if (gg.selected !== null) {
      if (gg.selected === idx || !s) selectSlot(gg.selected);
      else useOnSlot(gg.selected, idx);
      return;
    }
    if (!s) return;
    if (primaryOf(s.item)) applySlot(idx);
    else selectSlot(idx);
  };

  /** Drag-and-drop: move an item to another slot, swapping with what's there. */
  const moveSlot = (from: number, to: number) => {
    const gg = g();
    if (from === to || !gg.inv[from]) return;
    [gg.inv[from], gg.inv[to]] = [gg.inv[to], gg.inv[from]];
    if (gg.selected === from) gg.selected = to;
    else if (gg.selected === to) gg.selected = from;
    bump();
  };

  /** The right-click menu for a backpack slot; the first entry matches left-click. */
  const slotActions = (idx: number): MenuOption[] => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s) return [];
    const name = ITEMS[s.item].name;
    const sel = gg.selected !== null && gg.selected !== idx ? gg.inv[gg.selected] : null;
    if (sel) {
      const from = gg.selected!;
      return [
        { label: "Use", target: `${ITEMS[sel.item].name} → ${name}`, run: () => useOnSlot(from, idx) },
        { label: "Cancel", target: ITEMS[sel.item].name, run: () => { gg.selected = null; bump(); } },
      ];
    }
    const opts: MenuOption[] = [];
    // With the bank or shop open, the backpack deposits or sells first
    if (gg.bankOpen) opts.push({ label: "Deposit", target: name, run: () => depositSlot(idx) });
    if (gg.shopOpen) opts.push({ label: "Sell", target: name, run: () => sellSlot(idx) });
    if (ITEMS[s.item].bottle?.skill === "combat") {
      opts.push(
        { label: "Pour into Attack", target: name, run: () => pourBottle(idx, "attack") },
        { label: "Pour into Strength", target: name, run: () => pourBottle(idx, "strength") },
        { label: "Split between both", target: name, run: () => pourBottle(idx, "split") },
      );
    }
    const primary = primaryOf(s.item);
    const use: MenuOption = { label: "Use", target: name, run: () => selectSlot(idx) };
    if (primary) opts.push({ label: primary, target: name, run: () => applySlot(idx) }, use);
    else opts.push(use);
    opts.push(
      { label: "Drop", target: name, run: () => dropSlot(idx) },
      { label: "Inspect", target: name, run: () => inspectSlot(idx) },
    );
    return opts;
  };

  const dropSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    gg.selected = null;
    gg.inv[idx] = null;
    if (!gg.groundItems) gg.groundItems = [];
    gg.groundItems.push({ id: nextId(), item: s.item, n: s.n, x: Math.round(gg.x), y: Math.round(gg.y), t: performance.now() });
    chat("info", `${gg.name} dropped ${s.n > 1 ? s.n + "× " : ""}${ITEMS[s.item].name.toLowerCase()} onto the ground.`);
    sfx.drop();
    bump();
  };

  const depositSlot = (idx: number) => {
    const gg = g();
    const s = gg.inv[idx];
    if (!s || s.item === "coins") return;
    gg.bank[s.item] = (gg.bank[s.item] ?? 0) + s.n;
    gg.selected = null;
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
    gg.selected = null;
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
    gg.selected = null;
    gg.inv[idx] = null;
    for (const slot of ["weapon", "axe", "pick", "rod", "armor"] as const) {
      if (gg.equipped[slot] === s.item) delete gg.equipped[slot];
    }
    gg.coins += gain;
    chat("info", `Sold ${s.n > 1 ? s.n + "× " : ""}${def.name.toLowerCase()} to Roka · +${gain} coins`);
    sfx.coin();
    bump();
  };

  /** Toggle melee XP into Attack or Strength; the last one on can't be switched off. */
  const toggleCombatXp = (skill: "attack" | "strength") => {
    const gg = g();
    const next = { ...gg.combatXp, [skill]: !gg.combatXp[skill] };
    if (!next.attack && !next.strength) {
      chat("err", "At least one of Attack or Strength must stay on to earn combat XP.");
      sfx.error();
      return;
    }
    gg.combatXp = next;
    const on = [next.attack && "Attack", next.strength && "Strength"].filter(Boolean).join(" and ");
    chat("info", `Melee hits now train ${on}.`);
    sfx.click();
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

  /** Escape / ✕: close every window and put down a held item. */
  const closeOverlays = () => {
    const gg = g();
    if (gg.bankOpen || gg.shopOpen || gg.stationUI || gg.guide || gg.settingsOpen) sfx.close();
    closeWindows();
    gg.settingsOpen = false;
    gg.selected = null;
    bump();
  };

  const openSettings = () => {
    const gg = g();
    closeWindows();
    gg.settingsOpen = true;
    sfx.click();
    bump();
  };

  const openGuide = (skill: SkillId) => {
    const gg = g();
    closeWindows();
    gg.settingsOpen = false;
    gg.guide = skill;
    sfx.click();
    bump();
  };

  const saveNow = (): boolean => {
    const gg = gref.current;
    if (!gg) return false;
    // Silent: autosave runs constantly and must not spam the Adventurer's Log.
    return saveGame(gg);
  };

  const art = (name: string) => (/^[aeiou]/i.test(name) ? "an" : "a");

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
    chat("info", "Tip: Left-click does the obvious thing. Right-click anything (in the world or your backpack) to see every action.");
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
      worldActions,
      startRecipe,
      clickInventorySlot,
      slotActions,
      moveSlot,
      dropSlot,
      depositSlot,
      depositAll,
      withdraw,
      withdrawStack,
      buy,
      sellSlot,
      unequip,
      toggleCombatXp,
      dismissLevelUp,
      closeOverlays,
      openSettings,
      openGuide,
      toggleBlessing,
      dialogueNext,
      dialogueChoose,
      endTalk,
      questPoints,
      stepProgress,
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
