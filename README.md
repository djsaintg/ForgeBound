![ForgeBound — twilight key art: an anvil and forge fire beside a river valley](docs/banner.png)

**A single-player action-RPG that lives in one HTML file.**
Chop, mine, fish, smelt and smith — no servers, no accounts, no signal.

`v0.4.3 — Gamma Quests` · `100% offline` · `MIT licensed`

---

## 💖 Support this Project

[![Sponsor](https://raw.githubusercontent.com/djsaintg/djsaintg/main/sponsor.svg)](https://buymeacoffee.com/djsaintg)

## What's new in v0.4.3

- **Your first quests** — Old Maro teaches the valley's basics in three
  chains: combat (hens, cows, then the goblins), smithing (bronze up to
  iron) and fishing (catch, cook, eat)
- **Conversations** — a proper dialogue box with portraits and replies to
  choose from
- **Daily jobs for Roka** — four Supply Runs that pay double, once a day
- **XP bottles** — quest rewards that pour XP into the skill you trained;
  the Combat bottle lets you choose Attack, Strength or both
- **Quest markers** — a gold ! for a new quest, blue for a daily job, and a
  ? when it's time to hand in
- **Bubbling fishing spots** — fizzing water and the odd leaping fish

## v0.4.2 — Prayer

- **Prayer with teeth** — prayer points and four combat blessings to call
  on in a fight: Stoneskin, Ox's Might, Mending Light and Clear Eye
- **An altar in Vale Square** — kneel there to refill your prayer points
- **Arrange your side panel** — drag a tab below another to see your
  inventory and skills (or prayer) at the same time; resize the panes,
  and the layout is remembered
- **A minimap that matches the world** — detailed terrain, map icons for
  the bank, shops, stations and fishing spots, and a gold arrow showing
  which way you're heading

## v0.4.1 — Hands-On

- **Right-click anything** — a menu of every action for whatever is under
  the cursor: Talk, Trade, Attack, Inspect, Take and more. Left-click still
  does the obvious thing
- **A backpack you can handle** — drag to rearrange, drag into the bank to
  deposit or out onto the world to drop. Pick an item up and use it on
  things: ore on the furnace, raw food on the fire. Works on touch too
- **Skill guides** — click a skill to see what your level unlocks, what
  comes next, and the tools and recipes that go with it
- **Zoomable minimap** — − / + or scroll to zoom in and follow the hero
- **Tidier ground** — anything left lying around vanishes after two minutes
- **Wield levels** — steel and mithril tools and blades need the skill to
  match

## v0.4.0 — Visuals

- **People and animals with real bodies** — the hero, goblins and
  townsfolk have heads, shoulders, elbows and knees and walk in all four
  directions; cows and hens walk, graze and peck like the real thing
- **Every job moves differently** — chop, mine, hammer, smelt, cook, cast,
  stab, slash and punch each have their own motion, with sparks, sawdust
  and sounds landing on the blow
- **The right tool in hand** — axe, pickaxe, hammer, rod, net or pan, tinted
  by its metal, and the hero turns to face the work
- **Hand-drawn gear icons** — every sword, dagger, axe, pickaxe, the
  platebody and the fishing rod, plus cooked chicken and log piles
- **Rocks that look like rock** — faceted boulders with ore set into them
- **Choose your combat training** — switch melee XP between Attack,
  Strength or both in the Gear tab; Defence still grows from blows taken

## v0.3.4 — Resizable Windows & HUD

- **Resizable panels** — drag the side panel's edge or the bar above the
  Adventurer's Log; sizes are remembered, double-click to reset
- **Action banner** — what the hero is doing ("Chopping tree…") with a live
  progress bar, sitting under the compass with the XP orbs
- **Metal that looks like metal** — bronze, iron and steel bars are proper
  ingots, and ore and bar icons fill their slots
- **No early swings** — the chop / mine animation waits until the hero
  arrives and the action actually starts

## v0.3.3 — Login Page Edits

- **Your name, for keeps** — the display name locks when the adventure
  begins; a smaller **Abandon & Restart** button (with a second-click
  confirm) wipes the save when you want a new hero
- **Builder's notes that write themselves** — an always-on strip under the
  login card shows the previous release, the live one and what's on the
  anvil next, read straight from `CHANGELOG.md` and `ROADMAP.md` at build
- **Fullscreen play** — tick *Play fullscreen* on the login card (or use
  Settings) to hide the browser's tabs and title bar

## v0.3.2 — Gathering Fixes

- **Gather from anywhere** — click a tree, rock or fishing spot from across
  the map and the hero walks over and gets straight to work (it used to
  arrive and just stand there)
- **Ore you can tell apart** — copper, tin, iron, coal and gold each have
  their own hand-drawn icon, coloured like their veins in the mine

## v0.3.1 — Visual Repairs

A repair pass on the Gamma overhaul:

- **No more flicker** — walking and chopping no longer strobe the lighting
  and nearby sprites
- **Clicks land true** — the tile under your cursor is the tile you get,
  anywhere on the map, and the hero stays dead centre at every zoom
- **No phantom swings** — felling a tree or emptying a rock ends the action
  the moment it falls
- **A livelier log** — the Adventurer's Log keeps updating even after it
  fills up

## The Gamma overhaul (v0.3.0)

The Gamma release is a ground-up visual pass over the whole valley, with the
gameplay of the combat beta fully folded in:

- **64-bit remastered renderer** — multi-tier swaying tree canopies,
  crystalline ore veins, mossy flagstones, animated water with sun glints,
  and a plank bridge with iron bolts. Flip back to the **8-bit legacy**
  engine any time from the Settings window.
- **A hero that actually walks** — a six-frame interpolated cycle with
  bending knees, counter-swinging arms and a bobbing torso; cows, hens and
  goblins got real gaits too.
- **Live fire lighting** — the furnace and campfire are true light sources,
  each casting a warm additive halo that pushes back the night.
- **Explorer camera** — mouse-wheel zoom from a 1.0× grand vista to a 3.2×
  close-up, with smooth sub-tile follow.
- **A valley with edges** — an impassable ring of snow-capped mountains now
  seals the realm; future updates simply push the ranges back to grow it.
- **Everything from the combat beta** — Grublin Gully, the chicken coop,
  loot drops, steak, feather-lure trout, bone-burying Prayer and more.

Full detail in [`CHANGELOG.md`](CHANGELOG.md). Planned work lives in
[`ROADMAP.md`](ROADMAP.md).

---

## Why this exists

Most of my working year is spent out of town — mine sites, back roads, places
where the phone bars go to die. ForgeBound is a classic-style browser RPG I'm
building to play in those dead zones: one that never phones home, never needs
an account, and compiles down to **a single HTML file** I can keep on a laptop
or a phone.

It's cut from the same cloth as the great browser MMOs of the 2000s — skilling,
XP curves, banks and bartering — rebuilt as a quiet single-player world. Every
name, tile, icon and sound in here is original and made from scratch.

## Quickstart

```bash
npm install        # once, while you still have signal
chmod +x launch.sh # once
./launch.sh        # builds if needed, then opens the game in your browser
```

| Command                | What it does                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `./launch.sh`          | Verifies the project tree, builds if `dist/` is missing, opens the game |
| `./launch.sh --serve`  | Serves the game at `http://localhost:4173` (zero-dependency) and opens it |
| `./launch.sh --rebuild`| Forces a fresh build before launching                                   |
| `./launch.sh --help`   | Usage                                                                   |

Prefer the plain tools? `npm run dev` for a dev server, `npm run build` to
produce the single-file game, `npm run preview` to serve the build.

## Taking it offline

The build inlines _everything_ — code, styles, fonts — into one file:
`dist/index.html`. Once it exists, the internet is optional forever.

| Bring                            | Needed for                                     |
| -------------------------------- | ---------------------------------------------- |
| `dist/index.html`                | Playing — that one file **is** the whole game  |
| `launch.sh`                      | Convenient launching / local serving           |
| `src/` + configs + `node_modules/` | Rebuilding while off the grid                |

Open `dist/index.html` directly (double-click or `file://`) or use
`launch.sh --serve`. Progress autosaves to the browser's local storage — same
machine, same browser, pick up where you left off.

## The world

| Region            | What's there                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| **Vale Square**   | The heart of it: furnace, anvil, campfire, bank booth, and Roka's trading post |
| **The Westwood**  | Trees and oaks — your first XP                                               |
| **Keldrek Mine**  | Copper, tin, iron, coal… and gold, if you're good enough                     |
| **The River**     | Shrimp in the western shallows, trout in the eastern current (bring a rod and feathers) |
| **The Pasture**   | Cows — with opinions, raw beef, and bones                                    |
| **The Coop**      | Four hens south-east of the square: feathers, raw chicken, and eggs they lay |
| **Grublin Gully** | A goblin camp north-east through the pasture — two Bramble Brigands lurk in the deep |
| **The Peaks**     | An impassable ring of snow-capped mountains sealing the valley; the bridge is the only crossing |

Old Maro stands in the square and knows this realm well — talk to him often.

## Skills

Ten skills are live, all running on the authentic-feeling XP curve
(83 XP to level 2, 13,034,431 to level 99):

| Skill           | Source                                            | Notes                          |
| --------------- | ------------------------------------------------- | ------------------------------ |
| Attack ⚔        | Melee combat in Grublin Gully                     | Improves accuracy              |
| Strength 👊     | Melee combat                                      | Raises your max hit            |
| Defence 🛡      | Being hit in combat                               | Harder for foes to land on you |
| Constitution ♥  | Dealing and taking damage                         | Your hitpoints                 |
| Prayer ✦        | Burying bones dropped by the fallen               | Big bones pay best             |
| Woodcutting 🪓  | Trees and oaks in the Westwood                    | —                              |
| Mining ⛏        | Copper/tin at 1, iron at 10, coal at 20, gold at 40 | —                            |
| Fishing 🐟      | Shrimp by hand; trout at the eastern current      | Trout: level 20 + rod + feather|
| Smithing 🔨     | Smelt bars at the furnace, forge blades at the anvil | Steel: level 30             |
| Cooking 🍳      | Cook catch, meat and eggs at the campfire         | Steak: level 5, heals 6        |

The full 23-skill grid is already stubbed in the UI — the rest light up as
quests and deeper systems arrive.

## How to play

| Do this                                     | To…                                              |
| ------------------------------------------- | ------------------------------------------------ |
| Left-click the ground                       | Walk (pathfinding handles the rest)              |
| Right-click anything (world or backpack)    | See every action: Talk, Trade, Inspect, Drop…    |
| Mouse-wheel over the world                  | Zoom the camera in and out                       |
| − / + or mouse-wheel on the minimap         | Zoom the minimap                                 |
| Left-click a tree, rock or fishing spot     | Gather — repeatedly, automatically               |
| Left-click a goblin or brigand              | Fight — auto-attacks until it falls              |
| Left-click a cow or chicken                 | Farm it — meat, bones and feathers               |
| Click loot on the ground                    | Pick it up — coins, blades, eggs and more        |
| Click an egg on the ground                  | Gather it — fry it at the campfire               |
| Click bones in your inventory               | Bury them for Prayer XP                          |
| Left-click furnace / anvil / campfire       | Open crafting, then pick a recipe                |
| Left-click the bank booth                   | Deposit and withdraw                             |
| Left-click Roka                             | Buy tools, sell your haul                        |
| Talk to someone with a ! over their head    | Take on a quest (gold) or a daily job (blue)     |
| Talk to someone with a ? over their head    | Hand in a finished quest step                    |
| Click an XP bottle in your inventory        | Pour its XP into the skill (combat: choose)      |
| Click food in your inventory                | Eat it (+HP)                                     |
| Click a tool in your inventory              | Wield it — better tiers work faster              |
| Click ore, bars or raw food, then a target  | Use it there — furnace, anvil, campfire, bank    |
| Drag an inventory item                      | Move it, deposit it in the bank, or drop it      |
| Shift-click an inventory item               | Drop it                                          |
| Click a skill                               | Open its guide — unlocks, tools, recipes         |
| Click a blessing in the Prayer tab          | Switch it on or off (drains prayer points)       |
| Left-click the altar                        | Pray — refill your prayer points                 |
| Drag a side-panel tab onto another pane     | Dock it above / below, or group it there         |
| Gear button in the side panel               | Engine settings — zoom, render mode, audio       |
| `Esc`                                       | Close any panel, or put down a held item         |

## Under the hood

- **React 19 + TypeScript**, built with **Vite 7** and **Tailwind v4**
- `vite-plugin-singlefile` collapses the entire game into one portable HTML file
- All in-game art is **drawn procedurally on `<canvas>`** — zero image assets
- Two render engines in one: the **64-bit remaster** and the **8-bit legacy**
  mode, switchable live from Settings
- **Lighting pass** — additive fire haloes over a day/night wash, plus
  interpolated six-frame character animation
- All sound is **synthesized with WebAudio** — zero audio assets
- BFS pathfinding, table-driven loot, resource respawns, wandering livestock,
  mountain-sealed world bounds
- Autosave to `localStorage`, debounced plus on-exit

```
ForgeBound/
├── launch.sh            # offline launcher (preflight, build, open/serve)
├── CHANGELOG.md         # release history (Keep a Changelog format)
├── ROADMAP.md           # planned work for upcoming versions
├── src/
│   ├── game/            # the engine
│   │   ├── map.ts       #   procedural tile world + mountain bounds
│   │   ├── data.ts      #   items, resources, recipes, loot, shop stock
│   │   ├── useGame.ts   #   the tick loop — actions, combat, economy, saves
│   │   ├── pathfinding.ts
│   │   ├── render.ts    #   dual-mode canvas renderer + lighting
│   │   ├── xp.ts        #   the XP curve + skill table
│   │   ├── audio.ts     #   WebAudio synth
│   │   └── types.ts
│   └── components/      # login, HUD, panels, modals, event log
└── dist/index.html      # ← the game, after one build
```

**Good places to start extending:** new items, resources and recipes live in
`src/game/data.ts`; new terrain in `src/game/map.ts` (push the mountains back
to grow the world); new gameplay loops in the tick inside `src/game/useGame.ts`.

**Cutting a release:** bump `"version"` in `package.json` (the page title,
login screen and log pick it up on build), move the changelog's notes under a
new version heading, then tag it — `git tag -a v0.3.3 -m "..."`. Planned items in `ROADMAP.md`
reach the login screen only through their `- **Teaser:**` lines.

## Roadmap

- [x] Combat v1 — melee, hitsplats, loot, death/respawn and Prayer
- [x] Pasture & coop — livestock, eggs, steak, feather-lure trout
- [x] Gamma v0.3.0 — remastered renderer, walk cycle, fire lighting, mountains, camera
- [x] v0.3.1 — visual repairs: canvas flicker, camera jitter and click targeting
- [x] v0.3.2 — gathering fixes: gather from any distance, distinct ore icons
- [x] v0.3.3 — locked hero name, Abandon & Restart, self-writing builder's notes, fullscreen
- [x] v0.3.4 — resizable panels, action banner & HUD under the compass, ingot icons
- [x] v0.4.0 — Visuals: jointed people & livestock, 4-way movement, per-job animations, gear icons, new rocks
- [x] v0.4.1 — Hands-On: right-click menus, drag / select / use-on backpack, skill guides, minimap zoom
- [x] v0.4.2 — Prayer: prayer points, combat blessings, an altar, docked side panels, new minimap
- [x] v0.4.3 — Quests: Old Maro's quest chains, Roka's daily Supply Runs, XP bottles, quest markers
- [ ] v0.4.4 — Sound & Score: original background music and a full sound-effects pass
- [ ] v0.5.0 — a ~5× wider realm, the Wildwood, Fletching & Ranged
- [ ] v0.6.0 — the Vale square rebuilt as a proper village
- [ ] Light up the remaining 13 skills
- [ ] Deeper crafting chains (fletching, crafting, leather)

## Legal note

ForgeBound is a personal, non-commercial project inspired by the classic
browser MMOs of the 2000s. It is **not affiliated with, endorsed by, or
connected to Jagex**, and no copyrighted assets are used — everything here
(names, art, icons, sound) is original.

## License

[MIT](LICENSE) — take it, learn from it, forge something of your own.
