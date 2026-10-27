// Quest scripts. Every quest is a short chain of steps given by one NPC; the
// dialogue lines live here beside the steps they belong to, so a quest reads
// top to bottom like a script. Logic (counting, hand-ins, rewards) is in useGame.
//
// Line templates: {n} = progress so far (or how many are in the backpack for a
// "bring" step), {need} = how many the step wants, {qp} = the hero's quest
// points, {name} = the hero's name.
import type { BlessingId, GameState, ItemId, NpcId, QuestEvent, QuestId } from "./types";
import { SUPPLY_RUNS, bottleId } from "./data";

export type QuestStep =
  /** Hand items over; they're taken from the backpack. */
  | { kind: "bring"; item: ItemId; n: number; goal: string; checkIn: string[]; done: string[] }
  /** Show an item from the backpack; it's kept. */
  | { kind: "show"; item: ItemId; goal: string; checkIn: string[]; done: string[] }
  /** Do something n times, counted from when this step begins. */
  | { kind: "do"; event: QuestEvent; n: number; goal: string; checkIn: string[]; done: string[] };

export interface QuestDef {
  id: QuestId;
  name: string;
  giver: NpcId;
  /** One line for the Quests tab. */
  blurb: string;
  /** Quests that must be finished before this one is offered. */
  after?: QuestId[];
  /** Quest points needed to start it. */
  minQp?: number;
  /** Said when the hero asks about it without enough quest points. */
  locked?: string[];
  offer: string[];
  accept: string[];
  decline: string[];
  steps: QuestStep[];
  reward: { coins?: number; items?: ItemId[]; choice?: { prompt: string; items: ItemId[] }; blessing?: BlessingId; qp: number };
  /** What the giver says once it's done, in place of the quest. */
  afterword: string;
}

export const QUESTS: QuestDef[] = [
  // ---------------------------------------------------------- combat chain --
  {
    id: "meat_for_the_table",
    name: "Meat for the Table",
    giver: "maro",
    blurb: "Old Maro's cookpot is empty. The coop hens are a safe first fight.",
    offer: [
      "Work? Ha! The square's cookpot has been empty for days, and my knees won't carry me to the coop anymore.",
      "The hens there are plump and not much for fighting back. A good first scrap for a young one. Bring me three raw chicken, would you?",
    ],
    accept: [
      "Splendid. The coop's just east of the square, past my hut. The gate's on the road side. Left-click a hen to fight it.",
      "If you'd rather hit harder than true, the Gear tab lets you choose what your swings train.",
    ],
    decline: ["No hurry. The hens aren't going anywhere. Well, they wander, but not far."],
    steps: [
      {
        kind: "bring", item: "raw_chicken", n: 3,
        goal: "Bring Old Maro 3 raw chicken from the coop",
        checkIn: ["Three raw chicken from the coop. You've {n} of {need} in your pack."],
        done: [
          "Lovely, lovely. That'll feed the square tonight.",
          "Now, I'd wager you left bones lying out there. Bury three of them. It honours the fallen, and you'll feel your Prayer grow.",
        ],
      },
      {
        kind: "do", event: { kind: "bury" }, n: 3,
        goal: "Bury 3 bones",
        checkIn: ["Bury three bones. Just click them in your pack. {n} of {need} so far."],
        done: [
          "Well done. You fight, you feed folk, you show respect.",
          "Take this Combat XP bottle and pour it into Attack or Strength as you like. When you're ready, ask me about the cows in the north pasture.",
        ],
      },
    ],
    reward: { coins: 40, items: [bottleId("combat", "small")], qp: 1 },
    afterword: "The square's eaten well since you brought that chicken.",
  },
  {
    id: "north_pasture",
    name: "The North Pasture",
    giver: "maro",
    blurb: "Bigger game: the pasture cows, and a steak cooked by your own hand.",
    after: ["meat_for_the_table"],
    offer: [
      "The cows up north are bigger than hens and they'll kick back, though not hard. Bring me three raw beef.",
      "And then, and this is the important part, cook one into a steak. A fighter who can't cook is a fighter who goes hungry.",
      "Steak takes a little skill at the fire: level 5 Cooking. If you're not there yet, practise on shrimp or chicken first.",
    ],
    accept: ["Good. The pasture's north of the square, behind the smithy. Mind their horns."],
    decline: ["The cows will keep. They're very good at standing still."],
    steps: [
      {
        kind: "bring", item: "raw_beef", n: 3,
        goal: "Bring Old Maro 3 raw beef from the north pasture",
        checkIn: ["Three raw beef from the north pasture. You've {n} of {need} in your pack."],
        done: ["Fine cuts, these. Now cook one into a steak on the bonfire in the middle of the square and show me."],
      },
      {
        kind: "do", event: { kind: "make", item: "cooked_beef" }, n: 1,
        goal: "Cook a steak on the bonfire (Cooking 5)",
        checkIn: ["Cook one steak on the bonfire in the square. Raw beef on the fire, and level 5 Cooking. Practise on shrimp or chicken if you need to."],
        done: [
          "A proper steak! You're ready for more than livestock.",
          "Grublin Gully lies north-east. The goblins there steal from our coop. When you've a little more experience under your belt, come and ask me about them.",
        ],
      },
    ],
    reward: { coins: 60, items: [bottleId("combat", "medium")], qp: 1 },
    afterword: "Still tastes of that steak, this square. Well, it smells of it.",
  },
  {
    id: "grublin_gully",
    name: "Trouble in Grublin Gully",
    giver: "maro",
    blurb: "The gully goblins raid the coop at night. Drive them back.",
    after: ["north_pasture"],
    minQp: 3,
    locked: [
      "The goblins? Not yet, young one. They hit back properly, and I'd not forgive myself. Help a few more folk around the valley first.",
      "Come back when you've earned 3 quest points. You have {qp}.",
    ],
    offer: [
      "The gully goblins have been raiding our coop at night. Drive them back: defeat five Goblin Warriors.",
      "Bring food. The Bramble Brigands deeper in are another matter entirely. Leave them be for now.",
    ],
    accept: ["Brave. Grublin Gully is up the north road, north-east of the square. Eat before you're hurt, not after."],
    decline: ["Wise, perhaps. Come back when you feel ready."],
    steps: [
      {
        kind: "do", event: { kind: "kill", foe: "goblin" }, n: 5,
        goal: "Defeat 5 Goblin Warriors in Grublin Gully",
        checkIn: ["Five Goblin Warriors. {n} down so far."],
        done: [
          "Five! They'll think twice before raiding us again.",
          "Take this, and the valley's thanks. Those Bramble Brigands, though… one day, perhaps.",
        ],
      },
    ],
    reward: { coins: 150, items: [bottleId("combat", "large")], qp: 2 },
    afterword: "Not a single hen taken since you saw to those goblins.",
  },

  // ------------------------------------------------------------ smith chain --
  {
    id: "smiths_first_lesson",
    name: "The Smith's First Lesson",
    giver: "maro",
    blurb: "Logs for the fire, bronze from the furnace, and a first blade.",
    offer: [
      "Every adventurer should know how metal is made. Start simple: bring me five logs to keep the square's bonfire fed.",
      "Then I'll send you over to the smithy, to the furnace and the anvil.",
    ],
    accept: ["The Westwood's full of trees, just west of here. Left-click one with an axe in your pack."],
    decline: ["The fire will burn a while yet. Come back when you're ready."],
    steps: [
      {
        kind: "bring", item: "logs", n: 5,
        goal: "Bring Old Maro 5 logs",
        checkIn: ["Five logs for the fire. You've {n} of {need} in your pack."],
        done: [
          "Good dry wood, thank you. One day I'll teach you to light a fire of your own.",
          "Now mine copper and tin at Keldrek Mine, east along the road, and smelt three bronze bars at the furnace in the smithy. One of each ore makes a bar.",
        ],
      },
      {
        kind: "do", event: { kind: "make", item: "bronze_bar" }, n: 3,
        goal: "Smelt 3 bronze bars at the smithy's furnace",
        checkIn: ["Three bronze bars from the furnace: copper and tin, one of each. {n} of {need} smelted."],
        done: ["Three bars. Take one to the anvil, next to the furnace, and smith a bronze dagger. Then bring it to show me."],
      },
      {
        kind: "show", item: "bronze_dagger",
        goal: "Smith a bronze dagger and show it to Old Maro",
        checkIn: ["A bronze dagger, smithed at the anvil. Bring it to show me."],
        done: ["A fine first blade. Keep it, you made it. Come back when you'd like your next lesson."],
      },
    ],
    reward: { coins: 30, items: [bottleId("smithing", "small")], qp: 1 },
    afterword: "That first dagger of yours still makes me smile.",
  },
  {
    id: "plate_and_hammer",
    name: "Plate and Hammer",
    giver: "maro",
    blurb: "From a blade to armour: a bronze platebody of your own.",
    after: ["smiths_first_lesson"],
    offer: [
      "A blade is half of it. Armour is the other half. Smelt three more bronze bars, then hammer them into a platebody.",
      "A platebody needs level 5 Smithing. Daggers and swords at the anvil will get you there.",
    ],
    accept: ["Good. Same smithy, same furnace, same anvil, more bars."],
    decline: ["The anvil will wait for you."],
    steps: [
      {
        kind: "do", event: { kind: "make", item: "bronze_bar" }, n: 3,
        goal: "Smelt 3 more bronze bars",
        checkIn: ["Three more bronze bars. {n} of {need} smelted."],
        done: ["Good. Now three bars at the anvil makes a bronze platebody. You'll need level 5 Smithing."],
      },
      {
        kind: "do", event: { kind: "make", item: "bronze_platebody" }, n: 1,
        goal: "Smith a bronze platebody (Smithing 5)",
        checkIn: ["A bronze platebody from the anvil: three bars and level 5 Smithing."],
        done: [
          "Look at that. Wear it and the goblins' clubs will glance off.",
          "Bronze will only take you so far, though. When you're ready to look for an upgrade, ask me about iron.",
        ],
      },
    ],
    reward: { coins: 50, items: [bottleId("smithing", "medium")], qp: 1 },
    afterword: "Keep that plate polished, and it'll keep you whole.",
  },
  {
    id: "an_iron_will",
    name: "An Iron Will",
    giver: "maro",
    blurb: "The upgrade: mine iron, smelt it, and forge an iron dagger.",
    after: ["plate_and_hammer"],
    offer: [
      "Iron, then. It's harder to win and harder to work. Mine iron ore at Keldrek, smelt a bar, and smith an iron dagger.",
      "You'll need level 10 Mining for the ore and level 15 Smithing for the bar. It's a long road, but you'll walk it.",
    ],
    accept: ["That's the spirit. Bring that dagger to me when it's done."],
    decline: ["Iron's patient. So am I."],
    steps: [
      {
        kind: "do", event: { kind: "gather", item: "iron_ore" }, n: 2,
        goal: "Mine 2 iron ore at Keldrek Mine (Mining 10)",
        checkIn: ["Two iron ore from Keldrek Mine. You need level 10 Mining. {n} of {need} mined."],
        done: ["Heavy stuff, isn't it? Now smelt a bar of it. That takes level 15 Smithing."],
      },
      {
        kind: "do", event: { kind: "make", item: "iron_bar" }, n: 1,
        goal: "Smelt an iron bar (Smithing 15)",
        checkIn: ["One iron bar at the furnace. Level 15 Smithing."],
        done: ["Now hammer it into an iron dagger at the anvil."],
      },
      {
        kind: "do", event: { kind: "make", item: "iron_dagger" }, n: 1,
        goal: "Smith an iron dagger",
        checkIn: ["One iron dagger from the anvil."],
        done: ["Iron, and forged by your own hand. You've learned all I can teach you at the anvil."],
      },
    ],
    reward: {
      items: [bottleId("smithing", "large")],
      choice: { prompt: "I've two old tools going spare. Which would serve you better?", items: ["iron_axe", "iron_pick"] },
      qp: 2,
    },
    afterword: "There goes the finest smith in the valley. After me, of course.",
  },

  // ---------------------------------------------------------- fishing chain --
  {
    id: "fishers_patience",
    name: "A Fisher's Patience",
    giver: "maro",
    blurb: "Catch, cook and eat: how to heal out here.",
    offer: [
      "Out here, food is how you heal. And fish is the easiest food there is.",
      "Net five shrimp from the river, south of the square over the bridge road.",
    ],
    accept: ["Look for the swirls in the shallows. Left-click them and you'll wade in after them."],
    decline: ["The river will keep flowing."],
    steps: [
      {
        kind: "do", event: { kind: "gather", item: "raw_shrimp" }, n: 5,
        goal: "Net 5 shrimp from the river",
        checkIn: ["Five shrimp from the shallows. {n} of {need} caught."],
        done: ["Now cook three of them on the bonfire in the middle of the square. Raw shrimp will do you no good at all."],
      },
      {
        kind: "do", event: { kind: "make", item: "shrimp" }, n: 3,
        goal: "Cook 3 shrimp on the bonfire",
        checkIn: ["Cook three shrimp on the bonfire in the square. {n} of {need} cooked."],
        done: ["Next time you're hurt, eat one. Watch your health come back. That's the whole secret."],
      },
      {
        kind: "do", event: { kind: "eat", item: "shrimp" }, n: 1,
        goal: "Eat a cooked shrimp",
        checkIn: ["Eat one of those cooked shrimp. Click it in your pack."],
        done: [
          "There. Now you'll never starve.",
          "Take my old fly rod. Trout run in the fast water, but they won't bite a bare hook. Roka's always after feathers too. Ask about them.",
        ],
      },
    ],
    reward: { items: ["fly_rod", bottleId("fishing", "small")], qp: 1 },
    afterword: "Caught anything big lately? Trout's a fine supper.",
  },

  // ---------------------------------------------------------- Greyhallow --
  {
    id: "restless_crypt",
    name: "The Restless Crypt",
    giver: "cael",
    blurb: "Something stirs in the old crypt beneath Greyhallow's churchyard.",
    minQp: 4,
    locked: [
      "You've a kind face, but this is no errand for someone fresh to the road. The dead below hit back.",
      "Help the folk of the Vale a while longer. Come back with 4 quest points and we'll speak again. You have {qp}.",
    ],
    offer: [
      "The crypt beneath our churchyard was sealed the year the goblins came down from the gully. We buried our dead in haste, without the proper rites.",
      "And now they will not rest. At night I hear them below the stones, walking. Will you go down and lay them to rest?",
      "First I need bones to bless. Five, from any honest fight. The blessing goes with you into the dark.",
    ],
    accept: ["Thank you, friend. Bring me five bones, and I'll unseal the crypt door. It's at the top of the churchyard."],
    decline: ["I understand. The crypt has waited this long. Pray it waits a little longer."],
    steps: [
      {
        kind: "bring", item: "bones", n: 5,
        goal: "Bring Brother Cael 5 bones to bless",
        checkIn: ["Five bones for the blessing. You have {n} of {need} with you."],
        done: [
          "Rest now, all of you. There. They carry the blessing, and so do you.",
          "I've unsealed the crypt door. Go down, and lay five of the Restless Dead to rest. Take food, and Stoneskin if you have it.",
        ],
      },
      {
        kind: "do", event: { kind: "kill", foe: "restless" }, n: 5,
        goal: "Lay 5 of the Restless Dead to rest in the crypt",
        checkIn: ["Five of the Restless Dead, in the burial chamber below. {n} laid to rest so far."],
        done: [
          "Five at peace. But you say they rose again behind you?",
          "Then it's as I feared. Something in the sanctum at the far end keeps them walking: the Hollow Warden, the crypt's old keeper. End its watch, and they'll sleep.",
        ],
      },
      {
        kind: "do", event: { kind: "kill", foe: "warden" }, n: 1,
        goal: "Defeat the Hollow Warden in the crypt's sanctum",
        checkIn: ["The Hollow Warden waits in the sanctum, past the burial chamber. It hits hard. Pray at the old altar there if you need to."],
        done: [
          "It's quiet. For the first time in years, it's quiet under the stones. You've done Greyhallow a great kindness.",
          "Let me teach you a prayer the old wardens used. Spirit Ward: it takes the edge off any blow. You'll find it in your Prayer tab.",
        ],
      },
    ],
    reward: { coins: 120, items: [bottleId("prayer", "large")], blessing: "spirit_ward", qp: 2 },
    afterword: "The churchyard sleeps soundly now. So do I.",
  },
];

export const QUEST_BY_ID: Record<QuestId, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q])) as Record<QuestId, QuestDef>;

export const NPC_NAME: Record<NpcId, string> = { maro: "Old Maro", roka: "Roka", hesta: "Hesta", cael: "Brother Cael" };

/** Does a hero action count for a quest step's event? */
export function eventMatches(want: QuestEvent, got: QuestEvent): boolean {
  if (want.kind !== got.kind) return false;
  if ((want.kind === "make" || want.kind === "gather" || want.kind === "eat") && "item" in got) return want.item === got.item;
  if (want.kind === "kill" && got.kind === "kill") return want.foe === got.foe;
  return true;
}

// ------------------------------------------------- read-only quest state --
// Pure reads of the game state, shared by useGame, the Quests tab and the
// renderer's markers over NPCs' heads.

const countIn = (g: GameState, item: ItemId) => g.inv.reduce((sum, s) => (s && s.item === item ? sum + s.n : sum), 0);

export const today = () => new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD

export const questPointsOf = (g: GameState) =>
  QUESTS.reduce((sum, q) => sum + (g.quests[q.id]?.done ? q.reward.qp : 0), 0);

export function currentStepOf(g: GameState, q: QuestDef): QuestStep | null {
  const p = g.quests[q.id];
  return p && !p.done ? q.steps[p.step] : null;
}

/** How far along the current step is; bring / show steps read the backpack. */
export function stepProgressOf(g: GameState, q: QuestDef): { n: number; need: number; met: boolean } {
  const st = currentStepOf(g, q);
  if (!st) return { n: 0, need: 0, met: false };
  if (st.kind === "do") {
    const n = g.quests[q.id]!.count;
    return { n, need: st.n, met: n >= st.n };
  }
  const have = countIn(g, st.item);
  const need = st.kind === "bring" ? st.n : 1;
  return { n: Math.min(have, need), need, met: have >= need };
}

/** Not started, its earlier quests done, and enough quest points to begin. */
export const questOpen = (g: GameState, q: QuestDef) =>
  !g.quests[q.id] && (q.after ?? []).every((a) => g.quests[a]?.done) && questPointsOf(g) >= (q.minQp ?? 0);

/**
 * What floats over an NPC's head: a gold ? when something's ready to hand in,
 * a gold ! for a new quest, and blue for Roka's daily Supply Runs.
 */
export type NpcMarker = "turnin" | "new" | "daily-turnin" | "daily" | null;

export function npcMarker(g: GameState, npc: NpcId): NpcMarker {
  const mine = QUESTS.filter((q) => q.giver === npc);
  if (mine.some((q) => stepProgressOf(g, q).met)) return "turnin";
  if (mine.some((q) => questOpen(g, q))) return "new";
  if (npc === "roka") {
    const run = SUPPLY_RUNS.find((r) => r.id === g.supply);
    if (run) return countIn(g, run.item) >= run.n ? "daily-turnin" : null;
    if (SUPPLY_RUNS.some((r) => g.supplyDay[r.id] !== today())) return "daily";
  }
  return null;
}
