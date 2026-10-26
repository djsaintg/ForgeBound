import type {
  BlessingDef,
  BlessingId,
  ItemDef,
  ItemId,
  RecipeDef,
  RecipeId,
  ResKey,
  ResourceDef,
  StationId,
} from "./types";

export const ITEMS: Record<ItemId, ItemDef> = {
  coins: { id: "coins", name: "Coins", cat: "currency", stackable: true, price: 1 },
  logs: { id: "logs", name: "Logs", cat: "resource", stackable: false, price: 12 },
  oak_logs: { id: "oak_logs", name: "Oak logs", cat: "resource", stackable: false, price: 30 },
  copper_ore: { id: "copper_ore", name: "Copper ore", cat: "ore", stackable: false, price: 10 },
  tin_ore: { id: "tin_ore", name: "Tin ore", cat: "ore", stackable: false, price: 10 },
  iron_ore: { id: "iron_ore", name: "Iron ore", cat: "ore", stackable: false, price: 30 },
  coal: { id: "coal", name: "Coal", cat: "ore", stackable: false, price: 60 },
  gold_ore: { id: "gold_ore", name: "Gold ore", cat: "ore", stackable: false, price: 150 },
  raw_shrimp: { id: "raw_shrimp", name: "Raw shrimp", cat: "raw_fish", stackable: false, price: 8 },
  shrimp: { id: "shrimp", name: "Shrimp", cat: "food", stackable: false, price: 15, heal: 3 },
  raw_trout: { id: "raw_trout", name: "Raw trout", cat: "raw_fish", stackable: false, price: 40 },
  trout: { id: "trout", name: "Trout", cat: "food", stackable: false, price: 85, heal: 7 },
  bronze_bar: { id: "bronze_bar", name: "Bronze bar", cat: "bar", stackable: false, price: 50 },
  iron_bar: { id: "iron_bar", name: "Iron bar", cat: "bar", stackable: false, price: 110 },
  steel_bar: { id: "steel_bar", name: "Steel bar", cat: "bar", stackable: false, price: 260 },
  bronze_dagger: { id: "bronze_dagger", name: "Bronze dagger", cat: "weapon", stackable: false, price: 80, tier: 1 },
  iron_dagger: { id: "iron_dagger", name: "Iron dagger", cat: "weapon", stackable: false, price: 190, tier: 2 },
  steel_dagger: { id: "steel_dagger", name: "Steel dagger", cat: "weapon", stackable: false, price: 480, tier: 3, wield: { skill: "attack", level: 5 } },
  bronze_axe: { id: "bronze_axe", name: "Bronze axe", cat: "axe", stackable: false, price: 150, tier: 1 },
  iron_axe: { id: "iron_axe", name: "Iron axe", cat: "axe", stackable: false, price: 500, tier: 2 },
  steel_axe: { id: "steel_axe", name: "Steel axe", cat: "axe", stackable: false, price: 1400, tier: 3, wield: { skill: "woodcutting", level: 6 } },
  mithril_axe: { id: "mithril_axe", name: "Mithril axe", cat: "axe", stackable: false, price: 4000, tier: 4, wield: { skill: "woodcutting", level: 21 } },
  bronze_pick: { id: "bronze_pick", name: "Bronze pickaxe", cat: "pick", stackable: false, price: 150, tier: 1 },
  iron_pick: { id: "iron_pick", name: "Iron pickaxe", cat: "pick", stackable: false, price: 500, tier: 2 },
  steel_pick: { id: "steel_pick", name: "Steel pickaxe", cat: "pick", stackable: false, price: 1400, tier: 3, wield: { skill: "mining", level: 6 } },
  mithril_pick: { id: "mithril_pick", name: "Mithril pickaxe", cat: "pick", stackable: false, price: 4000, tier: 4, wield: { skill: "mining", level: 21 } },
  fly_rod: { id: "fly_rod", name: "Fly fishing rod", cat: "rod", stackable: false, price: 80, tier: 1 },
  // Combat & Livestock Drops
  bones: { id: "bones", name: "Bones", cat: "bone", stackable: false, price: 10 },
  raw_beef: { id: "raw_beef", name: "Raw beef", cat: "raw_food", stackable: false, price: 15 },
  cooked_beef: { id: "cooked_beef", name: "Steak", cat: "food", stackable: false, price: 90, heal: 9 },
  raw_chicken: { id: "raw_chicken", name: "Raw chicken", cat: "raw_food", stackable: false, price: 10 },
  cooked_chicken: { id: "cooked_chicken", name: "Cooked chicken", cat: "food", stackable: false, price: 30, heal: 4 },
  feathers: { id: "feathers", name: "Feathers", cat: "resource", stackable: true, price: 3 },
  egg: { id: "egg", name: "Farm egg", cat: "raw_food", stackable: false, price: 8 },
  fried_egg: { id: "fried_egg", name: "Fried egg", cat: "food", stackable: false, price: 20, heal: 3 },
  bronze_sword: { id: "bronze_sword", name: "Bronze sword", cat: "weapon", stackable: false, price: 120, tier: 1 },
  bronze_platebody: { id: "bronze_platebody", name: "Bronze platebody", cat: "armor", stackable: false, price: 250, tier: 1 },
};

export const RESOURCES: Record<ResKey, ResourceDef> = {
  tree: { key: "tree", name: "Tree", skill: "woodcutting", item: "logs", xp: 25, level: 1, tool: "axe", cycle: 2400, respawn: 12000 },
  oak: { key: "oak", name: "Oak tree", skill: "woodcutting", item: "oak_logs", xp: 40, level: 15, tool: "axe", cycle: 2800, respawn: 18000 },
  copper: { key: "copper", name: "Copper rocks", skill: "mining", item: "copper_ore", xp: 18, level: 1, tool: "pick", cycle: 2600, respawn: 8000 },
  tin: { key: "tin", name: "Tin rocks", skill: "mining", item: "tin_ore", xp: 18, level: 1, tool: "pick", cycle: 2600, respawn: 8000 },
  iron: { key: "iron", name: "Iron rocks", skill: "mining", item: "iron_ore", xp: 35, level: 10, tool: "pick", cycle: 3000, respawn: 12000 },
  coal: { key: "coal", name: "Coal rocks", skill: "mining", item: "coal", xp: 50, level: 20, tool: "pick", cycle: 3200, respawn: 16000 },
  gold: { key: "gold", name: "Gold rocks", skill: "mining", item: "gold_ore", xp: 65, level: 40, tool: "pick", cycle: 3600, respawn: 24000 },
  shrimp: { key: "shrimp", name: "Shrimp swarm", skill: "fishing", item: "raw_shrimp", xp: 10, level: 1, cycle: 2000, respawn: 0 },
  trout: { key: "trout", name: "Trout current", skill: "fishing", item: "raw_trout", xp: 50, level: 20, tool: "rod", cycle: 2400, respawn: 0 },
};

export const OBJ_TO_RES: Record<string, ResKey> = {
  T: "tree",
  O: "oak",
  R: "copper",
  S: "tin",
  I: "iron",
  C: "coal",
  G: "gold",
  f: "shrimp",
  t: "trout",
};

export const OBJ_TO_STATION: Record<string, StationId | "bank"> = {
  F: "furnace",
  A: "anvil",
  "*": "fire",
  B: "bank",
};

export const STATION_NAMES: Record<StationId, string> = {
  furnace: "Furnace",
  anvil: "Anvil",
  fire: "Campfire",
};

export const RECIPES: RecipeDef[] = [
  { id: "smelt_bronze", name: "Smelt bronze bar", station: "furnace", skill: "smithing", level: 1, xp: 6.2, cycle: 2200, inputs: { copper_ore: 1, tin_ore: 1 }, output: "bronze_bar" },
  { id: "smelt_iron", name: "Smelt iron bar", station: "furnace", skill: "smithing", level: 15, xp: 12.5, cycle: 2400, inputs: { iron_ore: 1 }, output: "iron_bar" },
  { id: "smelt_steel", name: "Smelt steel bar", station: "furnace", skill: "smithing", level: 30, xp: 17.5, cycle: 2600, inputs: { iron_ore: 1, coal: 2 }, output: "steel_bar" },
  { id: "smith_bronze_dagger", name: "Smith bronze dagger", station: "anvil", skill: "smithing", level: 1, xp: 12.5, cycle: 2400, inputs: { bronze_bar: 1 }, output: "bronze_dagger" },
  { id: "smith_iron_dagger", name: "Smith iron dagger", station: "anvil", skill: "smithing", level: 15, xp: 25, cycle: 2600, inputs: { iron_bar: 1 }, output: "iron_dagger" },
  { id: "smith_steel_dagger", name: "Smith steel dagger", station: "anvil", skill: "smithing", level: 30, xp: 37.5, cycle: 2800, inputs: { steel_bar: 1 }, output: "steel_dagger" },
  { id: "smith_bronze_sword", name: "Smith bronze sword", station: "anvil", skill: "smithing", level: 3, xp: 18, cycle: 2500, inputs: { bronze_bar: 1 }, output: "bronze_sword" },
  { id: "smith_bronze_platebody", name: "Smith bronze armor", station: "anvil", skill: "smithing", level: 5, xp: 45, cycle: 3200, inputs: { bronze_bar: 3 }, output: "bronze_platebody" },
  { id: "cook_shrimp", name: "Cook shrimp", station: "fire", skill: "cooking", level: 1, xp: 30, cycle: 2000, inputs: { raw_shrimp: 1 }, output: "shrimp" },
  { id: "cook_trout", name: "Cook trout", station: "fire", skill: "cooking", level: 15, xp: 70, cycle: 2400, inputs: { raw_trout: 1 }, output: "trout" },
  { id: "cook_beef", name: "Cook steak", station: "fire", skill: "cooking", level: 15, xp: 70, cycle: 2400, inputs: { raw_beef: 1 }, output: "cooked_beef" },
  { id: "cook_chicken", name: "Roast chicken", station: "fire", skill: "cooking", level: 1, xp: 30, cycle: 2000, inputs: { raw_chicken: 1 }, output: "cooked_chicken" },
  { id: "cook_egg", name: "Fry farm egg", station: "fire", skill: "cooking", level: 1, xp: 20, cycle: 1800, inputs: { egg: 1 }, output: "fried_egg" },
];

export const RECIPE_BY_ID: Record<RecipeId, RecipeDef> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r])
) as Record<RecipeId, RecipeDef>;

export const SHOP_STOCK: ItemId[] = [
  "bronze_axe",
  "iron_axe",
  "steel_axe",
  "mithril_axe",
  "bronze_pick",
  "iron_pick",
  "steel_pick",
  "mithril_pick",
  "fly_rod",
  "bronze_sword",
  "bronze_platebody",
];

/** Attempt-cycle speed multiplier by equipped tool tier (0 = bare hands / no tool). */
export const TOOL_SPEED: Record<number, number> = { 0: 1.55, 1: 1, 2: 0.85, 3: 0.72, 4: 0.6 };

export const MARO_LINES = [
  "Welcome to ForgeBound! You can engage in combat with cows in the north pasture, chickens in the S.E. coop, or the goblins of Grublin Gully to the N.E.!",
  "Goblins carry coins and sometimes drop bronze swords or platebodies when vanquished. Pick up their dropped loot from the ground!",
  "Chickens regularly lay fresh farm eggs in the coop straw! Gather eggs, raw beef, and raw chicken to cook over the campfire.",
  "Don't forget to bury monster bones from your backpack—it honors the departed and earns valuable Prayer XP!",
  "Chop trees in the Westwood, then smelt copper and tin into bronze at the furnace north of Vale Square.",
  "Keldrek Mine is east along the road. Iron hides at level 10, coal at 20, and gold at 40.",
  "Bury bones to grow your Prayer, then call on blessings in the Prayer tab. When your prayer runs dry, kneel at the altar in the square.",
  "Everything you own can be banked at the booth. Try toggling between 8-bit Legacy and 64-bit Remastered mode in the settings!",
];

export const SELL_RATIO = 0.55;

/** Anything left on the ground (dropped items, loot, laid eggs) vanishes after this long. */
export const GROUND_ITEM_MS = 120000;
/** ...and blinks for this long before it goes, as a warning. */
export const GROUND_ITEM_WARN_MS = 15000;

/** Prayer XP for burying one set of bones. */
export const BURY_XP = 25;

export const ROKA_LINES = [
  "Roka: Axes, picks, a good fly rod. Everything an honest worker needs, at an honest price!",
  "Roka: Bring me ore, logs or fish and I'll pay you fair coin for them. Well, fair-ish.",
  "Roka: A mithril pickaxe bites through rock like butter. Costly, mind, but worth every coin.",
  "Roka: Those goblins up the gully drop bronze from time to time. I'll take it off your hands.",
  "Roka: Trout won't bite a bare hook. Pluck some feathers from the coop hens first.",
];

/** Inspect text for every item, shown in the Adventurer's Log. */
export const ITEM_EXAMINE: Record<ItemId, string> = {
  coins: "Shiny coins, the currency of the valley.",
  logs: "Freshly cut logs from a valley tree.",
  oak_logs: "Heavy logs of seasoned oak.",
  copper_ore: "A lump of copper ore. Smelt it with tin for bronze.",
  tin_ore: "A lump of tin ore. Smelt it with copper for bronze.",
  iron_ore: "A dense lump of iron ore.",
  coal: "Black, crumbly and hot-burning. Steel needs it.",
  gold_ore: "A glittering nugget of gold ore.",
  raw_shrimp: "Some raw shrimp. Better cooked.",
  shrimp: "Some nicely cooked shrimp.",
  raw_trout: "A raw river trout, still slippery.",
  trout: "A golden-brown trout, cooked to perfection.",
  bronze_bar: "A bar of bronze, ready for the anvil.",
  iron_bar: "A bar of solid iron.",
  steel_bar: "A bar of fine steel.",
  bronze_dagger: "A short bronze blade. Quick in the hand.",
  iron_dagger: "A short iron blade.",
  steel_dagger: "A short, keen steel blade.",
  bronze_axe: "A woodcutter's axe with a bronze head.",
  iron_axe: "A sturdy iron-headed axe.",
  steel_axe: "A well-balanced steel axe.",
  mithril_axe: "A light, wickedly sharp mithril axe.",
  bronze_pick: "A miner's pickaxe with a bronze head.",
  iron_pick: "A sturdy iron pickaxe.",
  steel_pick: "A well-forged steel pickaxe.",
  mithril_pick: "A light mithril pickaxe that bites through stone.",
  fly_rod: "A whippy rod for fly fishing. Each cast needs a feather.",
  bones: "Bones of the fallen. Bury them for Prayer.",
  raw_beef: "A raw cut of beef. Cook it on the fire.",
  cooked_beef: "A thick steak, seared on the campfire.",
  raw_chicken: "Raw chicken. Don't eat it like this.",
  cooked_chicken: "A roast chicken, crisp and golden.",
  feathers: "Soft hen feathers. Fly fishers tie them to their hooks.",
  egg: "A fresh farm egg from the coop.",
  fried_egg: "A fried egg, sunny side up.",
  bronze_sword: "A bronze sword with a good long reach.",
  bronze_platebody: "A bronze breastplate. Heavy, but it turns a blow.",
};

/** Melee swing-time multiplier by weapon tier (0 = bare hands, slowest). */
export const SWING_SPEED: Record<number, number> = { 0: 1.5, 1: 1, 2: 0.9, 3: 0.8, 4: 0.7 };

export type FoeId = "cow" | "chicken" | "goblin" | "brigand";

export const FOES: Record<FoeId, { name: string; level: number; hp: number; about: string }> = {
  chicken: { name: "Coop hen", level: 1, hp: 3, about: "A plump hen. It sheds feathers and lays eggs." },
  cow: { name: "Pasture cow", level: 2, hp: 8, about: "A placid cow, chewing the cud." },
  goblin: { name: "Goblin Warrior", level: 5, hp: 12, about: "A scrappy goblin of the gully clan." },
  brigand: { name: "Bramble Brigand", level: 11, hp: 22, about: "A hulking brute of the deep gully. Hits hard." },
};

/** Combat blessings, lowest level first. Effects are applied in useGame's combat round. */
export const BLESSINGS: BlessingDef[] = [
  { id: "stoneskin", name: "Stoneskin", icon: "🪨", level: 1, effect: "Foes' blows miss 15% more often", drainMs: 20000 },
  { id: "ox_might", name: "Ox's Might", icon: "🐂", level: 4, effect: "+1 maximum hit", drainMs: 20000 },
  { id: "mending", name: "Mending Light", icon: "💗", level: 7, effect: "Regain 1 HP every 6 seconds", drainMs: 30000 },
  { id: "clear_eye", name: "Clear Eye", icon: "👁️", level: 10, effect: "+10% accuracy", drainMs: 20000 },
];

export const BLESSING_BY_ID: Record<BlessingId, BlessingDef> = Object.fromEntries(
  BLESSINGS.map((b) => [b.id, b])
) as Record<BlessingId, BlessingDef>;

/** Mending Light: one HP back every this many ms. */
export const MENDING_MS = 6000;
