export type SkillId =
  | "attack" | "hitpoints" | "mining" | "strength" | "agility" | "smithing" | "defence"
  | "herblore" | "fishing" | "ranged" | "crafting" | "cooking" | "prayer" | "woodcutting"
  | "magic" | "fletching" | "runecrafting" | "construction" | "dungeoneering" | "slayer"
  | "farming" | "thieving" | "firemaking";

/** Skills an XP bottle can hold; "combat" lets you choose Attack, Strength or both. */
export type BottleSkill = "combat" | "woodcutting" | "mining" | "smithing" | "fishing" | "cooking" | "prayer";
export type BottleSize = "small" | "medium" | "large";
export type BottleId = `${BottleSkill}_bottle_${BottleSize}`;

export type ItemId =
  | "coins" | "logs" | "oak_logs"
  | "copper_ore" | "tin_ore" | "iron_ore" | "coal" | "gold_ore"
  | "raw_shrimp" | "shrimp" | "raw_trout" | "trout"
  | "bronze_bar" | "iron_bar" | "steel_bar"
  | "bronze_dagger" | "iron_dagger" | "steel_dagger"
  | "bronze_axe" | "iron_axe" | "steel_axe" | "mithril_axe"
  | "bronze_pick" | "iron_pick" | "steel_pick" | "mithril_pick"
  | "fly_rod"
  // Combat & Livestock Drops
  | "bones" | "raw_beef" | "cooked_beef" | "raw_chicken" | "cooked_chicken"
  | "feathers" | "egg" | "fried_egg" | "bronze_sword" | "bronze_platebody"
  // Quest rewards
  | BottleId;

export type ToolSlot = "weapon" | "axe" | "pick" | "rod" | "armor";

export type ItemCat =
  | "currency" | "resource" | "ore" | "raw_fish" | "raw_food" | "food" | "bone"
  | "bar" | "weapon" | "armor" | "axe" | "pick" | "rod" | "bottle";

export interface ItemDef {
  id: ItemId;
  name: string;
  cat: ItemCat;
  stackable: boolean;
  price: number;
  heal?: number;
  tier?: number; // 1 bronze, 2 iron, 3 steel, 4 mithril
  /** Level needed to wield or wear it. */
  wield?: { skill: SkillId; level: number };
  /** XP bottles: which skill it pours into and how much. */
  bottle?: { skill: BottleSkill; size: BottleSize; xp: number };
}

export type ResKey =
  | "tree" | "oak" | "copper" | "tin" | "iron" | "coal" | "gold" | "shrimp" | "trout";

export interface ResourceDef {
  key: ResKey;
  name: string;
  skill: SkillId;
  item: ItemId;
  xp: number;
  level: number;
  tool?: "axe" | "pick" | "rod";
  cycle: number;
  respawn: number;
}

export type StationId = "furnace" | "anvil" | "fire";

export type RecipeId =
  | "smelt_bronze" | "smelt_iron" | "smelt_steel"
  | "smith_bronze_dagger" | "smith_iron_dagger" | "smith_steel_dagger"
  | "smith_bronze_sword" | "smith_bronze_platebody"
  | "cook_shrimp" | "cook_trout" | "cook_beef" | "cook_chicken" | "cook_egg";

export interface RecipeDef {
  id: RecipeId;
  name: string;
  station: StationId;
  skill: SkillId;
  level: number;
  xp: number;
  cycle: number;
  inputs: Partial<Record<ItemId, number>>;
  output: ItemId;
}

export type ChatKind = "sys" | "info" | "npc" | "err";

export interface ChatMsg {
  id: number;
  kind: ChatKind;
  text: string;
}

export interface XpEvent {
  id: number;
  skill: SkillId;
  amount: number;
  t: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

export interface CowEnt {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hp: number;
  maxHp: number;
  respawn: number;
  nextMove: number;
  moo: number;
  hit?: number;
  diedAt?: number;
}

export interface ChickenEnt {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hp: number;
  maxHp: number;
  respawn: number;
  nextMove: number;
  cluck: number;
  nextEgg: number;
  hit?: number;
  diedAt?: number;
}

export interface GoblinEnt {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hp: number;
  maxHp: number;
  respawn: number;
  nextMove: number;
  grunt: number;
  hit?: number;
  diedAt?: number;
}

export interface GroundItem {
  id: number;
  item: ItemId;
  n: number;
  x: number;
  y: number;
  t: number;
}

export type Action =
  | { kind: "gather"; x: number; y: number; res: ResKey; progress: number; cycle: number }
  | { kind: "station"; x: number; y: number; recipe: RecipeId; progress: number; cycle: number }
  | { kind: "combat"; targetKind: "cow" | "chicken" | "goblin"; targetId: number; progress: number; cycle: number };

export interface InvSlot {
  item: ItemId;
  n: number;
}

export interface LevelUp {
  skill: SkillId;
  level: number;
}

export type GraphicsMode = "64bit" | "8bit";

export interface GameState {
  version: number;
  name: string;
  coins: number;
  hp: number;
  maxHp: number;
  xp: Record<SkillId, number>;
  inv: (InvSlot | null)[];
  bank: Partial<Record<ItemId, number>>;
  equipped: Partial<Record<ToolSlot, ItemId>>;
  x: number;
  y: number;
  path: { x: number; y: number }[];
  action: Action | null;
  pendingStation: { kind: "craft" | "bank" | "shop" | "talk" | "pray"; station?: StationId; x: number; y: number } | null;
  stationUI: { station: StationId; x: number; y: number } | null;
  depleted: Record<string, number>;
  chat: ChatMsg[];
  xpEvents: XpEvent[];
  floats: FloatText[];
  levelUps: LevelUp[];
  bankOpen: boolean;
  shopOpen: boolean;
  settingsOpen: boolean;
  cows: CowEnt[];
  chickens: ChickenEnt[];
  goblins: GoblinEnt[];
  groundItems: GroundItem[];
  counters: { gathered: number; made: number; kills: number };
  // Gamma v0.3.0 Enhancements
  zoom: number;
  graphicsMode: GraphicsMode;
  /** Which offensive skills melee hits train. At least one is always on;
   *  Defence is earned only from blows taken. */
  combatXp: { attack: boolean; strength: boolean };
  // Hands-On v0.4.1
  /** Backpack slot picked up with "Use", waiting for a target. */
  selected: number | null;
  /** Skill whose guide window is open. */
  guide: SkillId | null;
  /** Ground item (by id) the hero is walking over to take. */
  pendingTake: number | null;
  // Prayer v0.4.2
  /** Current prayer points; the maximum is the Prayer level. Fractional while draining. */
  prayer: number;
  /** Blessings switched on. */
  blessings: BlessingId[];
  // Quests v0.4.3
  /** Progress on every quest that has been started. */
  quests: Partial<Record<QuestId, QuestProgress>>;
  /** Roka's Supply Run request in hand, if any. */
  supply: SupplyId | null;
  /** The local date ("2026-10-26") each Supply Run was last handed in; each can be done once a day. */
  supplyDay: Partial<Record<SupplyId, string>>;
  /** The conversation on screen, if any. */
  dialogue: Dialogue | null;
}

export type QuestId =
  | "meat_for_the_table" | "north_pasture" | "grublin_gully"
  | "smiths_first_lesson" | "plate_and_hammer" | "an_iron_will"
  | "fishers_patience";

export type NpcId = "maro" | "roka";

/** Roka's four Supply Runs. */
export type SupplyId = "eggs" | "feathers" | "chicken" | "logs";

export interface QuestProgress {
  /** Index of the current step; equal to the step count once the quest is done. */
  step: number;
  /** For "do" steps: how many times it's been done since the step began. */
  count: number;
  done: boolean;
}

/** Something the hero does that a quest step can be counting. */
export type QuestEvent =
  | { kind: "make"; item: ItemId }      // smelted, smithed or cooked
  | { kind: "gather"; item: ItemId }    // chopped, mined or caught
  | { kind: "kill"; foe: "cow" | "chicken" | "goblin" | "brigand" }
  | { kind: "bury" }
  | { kind: "eat"; item: ItemId };

export interface DialogueOption {
  label: string;
  run: () => void;
}

/** A conversation: the NPC's lines one page at a time, then the hero's replies. */
export interface Dialogue {
  id: number;
  npc: NpcId;
  x: number;
  y: number;
  pages: string[];
  page: number;
  options: DialogueOption[];
}

export type BlessingId = "stoneskin" | "ox_might" | "mending" | "clear_eye";

export interface BlessingDef {
  id: BlessingId;
  name: string;
  icon: string;
  level: number;
  /** What it does, in a few words. */
  effect: string;
  /** Milliseconds per prayer point drained while it's on. */
  drainMs: number;
}

/** One line of a right-click menu. The first entry is what left-click does. */
export interface MenuOption {
  /** The verb, e.g. "Chop down". */
  label: string;
  /** What it acts on, shown highlighted after the verb. */
  target?: string;
  run: () => void;
}
