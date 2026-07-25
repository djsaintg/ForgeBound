import type {
  EnemyTypeId, ItemDef, ItemId, RecipeDef, RecipeId, ResKey, ResourceDef, StationId,
} from "./types";

export const ITEMS: Record<ItemId, ItemDef> = {
  coins:        { id: "coins", name: "Coins", cat: "currency", stackable: true, price: 1 },
  logs:         { id: "logs", name: "Logs", cat: "resource", stackable: false, price: 12 },
  oak_logs:     { id: "oak_logs", name: "Oak logs", cat: "resource", stackable: false, price: 30 },
  copper_ore:   { id: "copper_ore", name: "Copper ore", cat: "ore", stackable: false, price: 10 },
  tin_ore:      { id: "tin_ore", name: "Tin ore", cat: "ore", stackable: false, price: 10 },
  iron_ore:     { id: "iron_ore", name: "Iron ore", cat: "ore", stackable: false, price: 30 },
  coal:         { id: "coal", name: "Coal", cat: "ore", stackable: false, price: 60 },
  gold_ore:     { id: "gold_ore", name: "Gold ore", cat: "ore", stackable: false, price: 150 },
  raw_shrimp:   { id: "raw_shrimp", name: "Raw shrimp", cat: "raw_fish", stackable: false, price: 8 },
  shrimp:       { id: "shrimp", name: "Shrimp", cat: "food", stackable: false, price: 15, heal: 3 },
  raw_trout:    { id: "raw_trout", name: "Raw trout", cat: "raw_fish", stackable: false, price: 40 },
  trout:        { id: "trout", name: "Trout", cat: "food", stackable: false, price: 85, heal: 7 },
  bronze_bar:   { id: "bronze_bar", name: "Bronze bar", cat: "bar", stackable: false, price: 50 },
  iron_bar:     { id: "iron_bar", name: "Iron bar", cat: "bar", stackable: false, price: 110 },
  steel_bar:    { id: "steel_bar", name: "Steel bar", cat: "bar", stackable: false, price: 260 },
  bronze_dagger:{ id: "bronze_dagger", name: "Bronze dagger", cat: "weapon", stackable: false, price: 80, tier: 1 },
  iron_dagger:  { id: "iron_dagger", name: "Iron dagger", cat: "weapon", stackable: false, price: 190, tier: 2 },
  steel_dagger: { id: "steel_dagger", name: "Steel dagger", cat: "weapon", stackable: false, price: 480, tier: 3 },
  bronze_axe:   { id: "bronze_axe", name: "Bronze axe", cat: "axe", stackable: false, price: 150, tier: 1 },
  iron_axe:     { id: "iron_axe", name: "Iron axe", cat: "axe", stackable: false, price: 500, tier: 2 },
  steel_axe:    { id: "steel_axe", name: "Steel axe", cat: "axe", stackable: false, price: 1400, tier: 3 },
  mithril_axe:  { id: "mithril_axe", name: "Mithril axe", cat: "axe", stackable: false, price: 4000, tier: 4 },
  bronze_pick:  { id: "bronze_pick", name: "Bronze pickaxe", cat: "pick", stackable: false, price: 150, tier: 1 },
  iron_pick:    { id: "iron_pick", name: "Iron pickaxe", cat: "pick", stackable: false, price: 500, tier: 2 },
  steel_pick:   { id: "steel_pick", name: "Steel pickaxe", cat: "pick", stackable: false, price: 1400, tier: 3 },
  mithril_pick: { id: "mithril_pick", name: "Mithril pickaxe", cat: "pick", stackable: false, price: 4000, tier: 4 },
  fly_rod:      { id: "fly_rod", name: "Fly fishing rod", cat: "rod", stackable: false, price: 80, tier: 1 },
  bones:        { id: "bones", name: "Bones", cat: "bones", stackable: false, price: 2, prayXp: 4.5 },
  big_bones:    { id: "big_bones", name: "Big bones", cat: "bones", stackable: false, price: 8, prayXp: 15 },
  raw_beef:     { id: "raw_beef", name: "Raw beef", cat: "raw_meat", stackable: false, price: 12 },
  steak:        { id: "steak", name: "Steak", cat: "food", stackable: false, price: 30, heal: 9 },
  raw_chicken:  { id: "raw_chicken", name: "Raw chicken", cat: "raw_meat", stackable: false, price: 8 },
  cooked_chicken: { id: "cooked_chicken", name: "Cooked chicken", cat: "food", stackable: false, price: 18, heal: 3 },
  feather:      { id: "feather", name: "Feather", cat: "resource", stackable: true, price: 5 },
  egg:          { id: "egg", name: "Egg", cat: "resource", stackable: false, price: 6 },
  fried_egg:    { id: "fried_egg", name: "Fried egg", cat: "food", stackable: false, price: 14, heal: 4 },
};

export const RESOURCES: Record<ResKey, ResourceDef> = {
  tree:   { key: "tree", name: "Tree", skill: "woodcutting", item: "logs", xp: 25, level: 1, tool: "axe", cycle: 2400, respawn: 12000 },
  oak:    { key: "oak", name: "Oak tree", skill: "woodcutting", item: "oak_logs", xp: 40, level: 15, tool: "axe", cycle: 2800, respawn: 18000 },
  copper: { key: "copper", name: "Copper rocks", skill: "mining", item: "copper_ore", xp: 18, level: 1, tool: "pick", cycle: 2600, respawn: 8000 },
  tin:    { key: "tin", name: "Tin rocks", skill: "mining", item: "tin_ore", xp: 18, level: 1, tool: "pick", cycle: 2600, respawn: 8000 },
  iron:   { key: "iron", name: "Iron rocks", skill: "mining", item: "iron_ore", xp: 35, level: 10, tool: "pick", cycle: 3000, respawn: 12000 },
  coal:   { key: "coal", name: "Coal rocks", skill: "mining", item: "coal", xp: 50, level: 20, tool: "pick", cycle: 3200, respawn: 16000 },
  gold:   { key: "gold", name: "Gold rocks", skill: "mining", item: "gold_ore", xp: 65, level: 40, tool: "pick", cycle: 3600, respawn: 24000 },
  shrimp: { key: "shrimp", name: "Shrimp swarm", skill: "fishing", item: "raw_shrimp", xp: 10, level: 1, cycle: 2000, respawn: 0 },
  trout:  { key: "trout", name: "Trout current", skill: "fishing", item: "raw_trout", xp: 50, level: 20, tool: "rod", bait: "feather", cycle: 2400, respawn: 0 },
};

export const OBJ_TO_RES: Record<string, ResKey> = {
  T: "tree", O: "oak", R: "copper", S: "tin", I: "iron", C: "coal",
  G: "gold", f: "shrimp", t: "trout",
};
export const OBJ_TO_STATION: Record<string, StationId | "bank"> = {
  F: "furnace", A: "anvil", "*": "fire", B: "bank",
};

export const STATION_NAMES: Record<StationId, string> = {
  furnace: "Furnace", anvil: "Anvil", fire: "Campfire",
};

export const RECIPES: RecipeDef[] = [
  { id: "smelt_bronze", name: "Smelt bronze bar", station: "furnace", skill: "smithing", level: 1, xp: 6.2, cycle: 2200, inputs: { copper_ore: 1, tin_ore: 1 }, output: "bronze_bar" },
  { id: "smelt_iron", name: "Smelt iron bar", station: "furnace", skill: "smithing", level: 15, xp: 12.5, cycle: 2400, inputs: { iron_ore: 1 }, output: "iron_bar" },
  { id: "smelt_steel", name: "Smelt steel bar", station: "furnace", skill: "smithing", level: 30, xp: 17.5, cycle: 2600, inputs: { iron_ore: 1, coal: 2 }, output: "steel_bar" },
  { id: "smith_bronze_dagger", name: "Smith bronze dagger", station: "anvil", skill: "smithing", level: 1, xp: 12.5, cycle: 2400, inputs: { bronze_bar: 1 }, output: "bronze_dagger" },
  { id: "smith_iron_dagger", name: "Smith iron dagger", station: "anvil", skill: "smithing", level: 15, xp: 25, cycle: 2600, inputs: { iron_bar: 1 }, output: "iron_dagger" },
  { id: "smith_steel_dagger", name: "Smith steel dagger", station: "anvil", skill: "smithing", level: 30, xp: 37.5, cycle: 2800, inputs: { steel_bar: 1 }, output: "steel_dagger" },
  { id: "cook_shrimp", name: "Cook shrimp", station: "fire", skill: "cooking", level: 1, xp: 30, cycle: 2000, inputs: { raw_shrimp: 1 }, output: "shrimp" },
  { id: "cook_trout", name: "Cook trout", station: "fire", skill: "cooking", level: 15, xp: 70, cycle: 2400, inputs: { raw_trout: 1 }, output: "trout" },
  { id: "cook_chicken", name: "Cook raw chicken", station: "fire", skill: "cooking", level: 1, xp: 30, cycle: 2000, inputs: { raw_chicken: 1 }, output: "cooked_chicken" },
  { id: "cook_beef", name: "Cook raw beef", station: "fire", skill: "cooking", level: 15, xp: 30, cycle: 2200, inputs: { raw_beef: 1 }, output: "steak" },
  { id: "cook_egg", name: "Fry an egg", station: "fire", skill: "cooking", level: 1, xp: 20, cycle: 1800, inputs: { egg: 1 }, output: "fried_egg" },
];
export const RECIPE_BY_ID: Record<RecipeId, RecipeDef> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r])
) as Record<RecipeId, RecipeDef>;

export interface EnemyDef {
  id: EnemyTypeId;
  name: string;
  hp: number;
  maxHit: number;
  toHit: number;
  def: number;
  atkSpeed: number; // ms between enemy swings
  coins?: [number, number];
  bones: ItemId;
  extra?: { item: ItemId; min: number; max: number }[];
  wander: number;
  respawn: number;
}

export const ENEMY_TYPES: Record<EnemyTypeId, EnemyDef> = {
  goblin: {
    id: "goblin", name: "Goblin", hp: 7, maxHit: 2, toHit: 0.5, def: 0,
    atkSpeed: 2600, coins: [2, 8], bones: "bones", wander: 2, respawn: 14000,
  },
  brigand: {
    id: "brigand", name: "Bramble Brigand", hp: 24, maxHit: 5, toHit: 0.6, def: 8,
    atkSpeed: 2300, coins: [9, 25], bones: "big_bones", wander: 2, respawn: 22000,
  },
  cow: {
    id: "cow", name: "Cow", hp: 8, maxHit: 1, toHit: 0.45, def: 2,
    atkSpeed: 2800, bones: "bones", extra: [{ item: "raw_beef", min: 1, max: 1 }],
    wander: 2, respawn: 20000,
  },
  chicken: {
    id: "chicken", name: "Chicken", hp: 3, maxHit: 1, toHit: 0.35, def: 0,
    atkSpeed: 2400, bones: "bones",
    extra: [{ item: "raw_chicken", min: 1, max: 1 }, { item: "feather", min: 1, max: 2 }],
    wander: 2, respawn: 12000,
  },
};

export const SHOP_STOCK: ItemId[] = [
  "bronze_axe", "iron_axe", "steel_axe", "mithril_axe",
  "bronze_pick", "iron_pick", "steel_pick", "mithril_pick",
  "fly_rod",
];

/** Attempt-cycle speed multiplier by equipped tool tier (0 = bare hands / no tool). */
export const TOOL_SPEED: Record<number, number> = { 0: 1.55, 1: 1, 2: 0.85, 3: 0.72, 4: 0.6 };

export const MARO_LINES = [
  "Welcome to ForgeBound, adventurer. This little realm lives entirely inside your browser — no servers, no signal needed.",
  "Chop trees in the Westwood, then smelt copper and tin into bronze at the furnace north of the square.",
  "Keldrek Mine is east along the road. Iron hides at level 10, coal at 20, and gold... at 40.",
  "Shrimp shoal in the shallows by the western bank. Trout need a fly rod — Roka sells them.",
  "Everything you own can be banked at the booth. Your progress saves itself to this device.",
  "Steel yourself — goblins squat in Grublin Gully, northeast through the pasture. Bury their bones for Prayer experience.",
  "The adventurer's log chronicles every deed — XP earned, ore banked, daggers forged. Keep one eye on it.",
  "South of the square there's a chicken coop. Feathers make fine trout lures, and the hens lay eggs if you wait a while.",
];

export const SELL_RATIO = 0.55;
