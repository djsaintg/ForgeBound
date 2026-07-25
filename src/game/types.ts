export type SkillId =
  | "attack" | "hitpoints" | "mining" | "strength" | "agility" | "smithing"
  | "defence" | "herblore" | "fishing" | "ranged" | "crafting" | "cooking"
  | "prayer" | "woodcutting" | "magic" | "fletching" | "runecrafting"
  | "construction" | "dungeoneering" | "slayer" | "farming" | "thieving";

export type ItemId =
  | "coins" | "logs" | "oak_logs"
  | "copper_ore" | "tin_ore" | "iron_ore" | "coal" | "gold_ore"
  | "raw_shrimp" | "shrimp" | "raw_trout" | "trout"
  | "bronze_bar" | "iron_bar" | "steel_bar"
  | "bronze_dagger" | "iron_dagger" | "steel_dagger"
  | "bronze_axe" | "iron_axe" | "steel_axe" | "mithril_axe"
  | "bronze_pick" | "iron_pick" | "steel_pick" | "mithril_pick"
  | "fly_rod" | "bones" | "big_bones"
  | "raw_beef" | "steak" | "raw_chicken" | "cooked_chicken"
  | "feather" | "egg" | "fried_egg";

export type ToolSlot = "weapon" | "axe" | "pick" | "rod";

export type ItemCat =
  | "currency" | "resource" | "ore" | "raw_fish" | "raw_meat" | "food" | "bar"
  | "weapon" | "axe" | "pick" | "rod" | "bones";

export interface ItemDef {
  id: ItemId;
  name: string;
  cat: ItemCat;
  stackable: boolean;
  price: number; // shop buy price; sell = 55%
  heal?: number;
  tier?: number; // tool tier: 1 bronze, 2 iron, 3 steel, 4 mithril
  prayXp?: number; // XP granted when buried (bones)
}

export type ResKey =
  | "tree" | "oak" | "copper" | "tin" | "iron" | "coal" | "gold"
  | "shrimp" | "trout";

export interface ResourceDef {
  key: ResKey;
  name: string;
  skill: SkillId;
  item: ItemId;
  xp: number;
  level: number;
  tool?: "axe" | "pick" | "rod";
  bait?: ItemId; // consumed per catch (a feathered fly)
  cycle: number; // ms per attempt at tier 1 / bare hands
  respawn: number; // ms
}

export type StationId = "furnace" | "anvil" | "fire";

export type RecipeId =
  | "smelt_bronze" | "smelt_iron" | "smelt_steel"
  | "smith_bronze_dagger" | "smith_iron_dagger" | "smith_steel_dagger"
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
export interface ChatMsg { id: number; kind: ChatKind; text: string; }

export type EnemyTypeId = "goblin" | "brigand" | "cow" | "chicken";
export interface EnemyEnt {
  type: EnemyTypeId;
  hp: number;
  x: number; y: number;   // live position (tiles, float)
  hx: number; hy: number; // home tile
  dx: number; dy: number; // wander target
  nextMove: number;
  nextAttack: number;
  deathAt: number; // 0 while alive
  flash: number;   // last hit timestamp (white flash)
  nextLay: number; // chickens: next egg timestamp
}
export interface Splat { x: number; y: number; n: number; kind: "deal" | "take"; t: number; }

export interface XpEvent { id: number; skill: SkillId; amount: number; t: number; }
export interface FloatText { x: number; y: number; text: string; color: string; t: number; }
export interface GroundEgg { x: number; y: number; t: number; }

export interface DepletedRecord { t: number; kind?: "tree" | "oak"; }

export type Action =
  | { kind: "gather"; x: number; y: number; res: ResKey; progress: number; cycle: number }
  | { kind: "station"; x: number; y: number; recipe: RecipeId; progress: number; cycle: number }
  | { kind: "combat"; enemy: number; x: number; y: number; progress: number; cycle: number };

export interface InvSlot { item: ItemId; n: number; }

export interface LevelUp { skill: SkillId; level: number; }

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
  pendingStation: { kind: "craft" | "bank" | "shop" | "egg"; station?: StationId; x: number; y: number } | null;
  stationUI: { station: StationId; x: number; y: number } | null;
  depleted: Record<string, DepletedRecord>;
  chat: ChatMsg[];
  xpEvents: XpEvent[];
  floats: FloatText[];
  levelUps: LevelUp[];
  bankOpen: boolean;
  shopOpen: boolean;
  enemies: EnemyEnt[];
  splats: Splat[];
  eggs: GroundEgg[];
  counters: { gathered: number; made: number; kills: number };
}
