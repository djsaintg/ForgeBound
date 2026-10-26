export type SkillId =
  | "attack" | "hitpoints" | "mining" | "strength" | "agility" | "smithing" | "defence"
  | "herblore" | "fishing" | "ranged" | "crafting" | "cooking" | "prayer" | "woodcutting"
  | "magic" | "fletching" | "runecrafting" | "construction" | "dungeoneering" | "slayer"
  | "farming" | "thieving";

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
  | "feathers" | "egg" | "fried_egg" | "bronze_sword" | "bronze_platebody";

export type ToolSlot = "weapon" | "axe" | "pick" | "rod" | "armor";

export type ItemCat =
  | "currency" | "resource" | "ore" | "raw_fish" | "raw_food" | "food" | "bone"
  | "bar" | "weapon" | "armor" | "axe" | "pick" | "rod";

export interface ItemDef {
  id: ItemId;
  name: string;
  cat: ItemCat;
  stackable: boolean;
  price: number;
  heal?: number;
  tier?: number; // 1 bronze, 2 iron, 3 steel, 4 mithril
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
  pendingStation: { kind: "craft" | "bank" | "shop"; station?: StationId; x: number; y: number } | null;
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
}
