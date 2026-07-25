<p align="center">
  <img src="docs/banner.png" alt="ForgeBound — twilight key art: an anvil and forge fire beside a river valley" width="100%">
</p>

<h1 align="center">ForgeBound</h1>

<p align="center">
  <b>A single-player action-RPG that lives in one HTML file.</b><br>
  Chop, mine, fish, smelt and smith — no servers, no accounts, no signal.
</p>

<p align="center">
  <code>v0.2.1 — combat beta</code> &nbsp;·&nbsp; <code>100% offline</code> &nbsp;·&nbsp; <code>MIT licensed</code>
</p>

---

## Why this exists

Most of my working year is spent out of town — mine sites, back roads, places where the
phone bars go to die. ForgeBound is a classic-style browser RPG I'm building to play in
those dead zones: one that never phones home, never needs an account, and compiles down
to **a single HTML file** I can keep on a laptop or a phone.

It's cut from the same cloth as the great browser MMOs of the 2000s — skilling, XP
curves, banks and bartering — rebuilt as a quiet single-player world. Every name, tile,
icon and sound in here is original and made from scratch.

## Quickstart

```bash
npm install        # once, while you still have signal
chmod +x launch.sh # once
./launch.sh        # builds if needed, then opens the game in your browser
```

| Command                  | What it does                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| `./launch.sh`            | Verifies the project tree, builds if `dist/` is missing, opens the game      |
| `./launch.sh --serve`    | Serves the game at `http://localhost:4173` (zero-dependency) and opens it    |
| `./launch.sh --rebuild`  | Forces a fresh build before launching                                        |
| `./launch.sh --help`     | Usage                                                                        |

Prefer the plain tools? `npm run dev` for a dev server, `npm run build` to produce the
single-file game, `npm run preview` to serve the build.

## Taking it offline

The build inlines *everything* — code, styles, fonts — into one file: `dist/index.html`.
Once it exists, the internet is optional forever.

| Bring                          | Needed for                                   |
| ------------------------------ | -------------------------------------------- |
| `dist/index.html`              | Playing — that one file **is** the whole game|
| `launch.sh`                    | Convenient launching / local serving         |
| `src/` + configs + `node_modules/` | Rebuilding while off the grid            |

Open `dist/index.html` directly (double-click or `file://`) or use `launch.sh --serve`.
Progress autosaves to the browser's local storage — same machine, same browser, pick up
where you left off.

## The world

| Region         | What's there                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| **Vale Square**    | The heart of it: furnace, anvil, campfire, bank booth, and Roka's trading post |
| **The Westwood**   | Trees and oaks — your first XP                                               |
| **Keldrek Mine**   | Copper, tin, iron, coal… and gold, if you're good enough                     |
| **The River**      | Shrimp in the western shallows, trout in the eastern current (bring a rod)   |
| **The Pasture**    | Cows — now with opinions *and* raw beef                                      |
| **The Coop**       | Four hens south of the square: feathers, raw chicken, and eggs they lay      |
| **Grublin Gully**  | A goblin camp northeast through the pasture — brigands lurk in the deep      |

Old Maro stands in the square and knows this realm well — talk to him often.

## Skills

Ten skills are live in v0.2.0, all running on the authentic-feeling XP curve
(83 XP to level 2, 13,034,431 to level 99):

| Skill            | Source                                              | Notes                       |
| ---------------- | --------------------------------------------------- | --------------------------- |
| Attack ⚔         | Melee combat in Grublin Gully                       | Improves accuracy           |
| Strength 👊      | Melee combat                                        | Raises your max hit         |
| Defence 🛡       | Being hit in combat                                 | Harder for foes to land on  |
| Constitution ♥   | Dealing and taking damage                           | Your hitpoints              |
| Prayer ✦         | Burying bones dropped by the fallen                 | Big bones pay best          |
| Woodcutting 🪓   | Trees and oaks in the Westwood                      | —                           |
| Mining ⛏         | Copper/tin at 1, iron at 10, coal at 20, gold at 40 | —                           |
| Fishing 🐟       | Shrimp by hand; trout at the eastern current        | Trout: level 20 + rod + feather |
| Smithing 🔨      | Smelt bars at the furnace, forge daggers at the anvil | Steel: level 30           |
| Cooking 🍳       | Cook catch, meat and eggs at the campfire           | Steak: level 15             |

The full 23-skill grid is already stubbed in the UI — the rest light up as combat and
quests arrive.

## How to play

| Do this                                   | To…                                   |
| ----------------------------------------- | ------------------------------------- |
| Left-click the ground                     | Walk (pathfinding handles the rest)   |
| Left-click a tree, rock or fishing spot   | Gather — repeatedly, automatically    |
| Left-click a goblin or brigand            | Fight — auto-attacks until it falls   |
| Left-click a cow or chicken               | Farm it — meat, bones and feathers    |
| Click an egg on the ground                | Gather it — fry it at the campfire    |
| Click bones in your inventory             | Bury them for Prayer XP               |
| Left-click furnace / anvil / campfire     | Open crafting, then pick a recipe     |
| Left-click the bank booth                 | Deposit and withdraw                  |
| Left-click Roka                           | Buy tools, sell your haul             |
| Click food in your inventory              | Eat it (+HP)                          |
| Click a tool in your inventory            | Wield it — better tiers work faster   |
| Right-click an inventory slot             | Drop it                               |
| `Esc`                                     | Close any panel                       |

## Under the hood

- **React 19 + TypeScript**, built with **Vite 7** and **Tailwind v4**
- `vite-plugin-singlefile` collapses the entire game into one portable HTML file
- All in-game art is **drawn procedurally on `<canvas>`** — zero image assets
- All sound is **synthesized with WebAudio** — zero audio assets
- BFS pathfinding, resource respawns, wandering cows, a slow day/night tint
- Autosave to `localStorage`, debounced plus on-exit

```
ForgeBound/
├── launch.sh            # offline launcher (preflight, build, open/serve)
├── src/
│   ├── game/            # the engine
│   │   ├── map.ts       #   procedural tile world
│   │   ├── data.ts      #   items, resources, recipes, shop stock
│   │   ├── useGame.ts   #   the tick loop — actions, economy, saves
│   │   ├── pathfinding.ts
│   │   ├── render.ts    #   canvas renderer
│   │   ├── xp.ts        #   the XP curve + skill table
│   │   ├── audio.ts     #   WebAudio synth
│   │   └── types.ts
│   └── components/      # login screen, HUD, panels, modals, event log
└── dist/index.html      # ← the game, after one build
```

**Good places to start extending:** new items, resources and recipes live in
`src/game/data.ts`; new terrain in `src/game/map.ts`; new gameplay loops in the tick
inside `src/game/useGame.ts`.

## Roadmap

- [x] Combat v1 — melee, hitsplats, loot, death/respawn and Prayer
- [ ] Quests with real rewards
- [ ] Light up the remaining 17 skills
- [ ] A bigger world — new country east of the mine
- [ ] An original soundtrack
- [ ] Deeper crafting chains (fletching, crafting, leather)

## Legal note

ForgeBound is a personal, non-commercial project inspired by the classic browser MMOs
of the 2000s. It is **not affiliated with, endorsed by, or connected to Jagex**, and no
copyrighted assets are used — everything here (names, art, icons, sound) is original.

## License

[MIT](LICENSE) — take it, learn from it, forge something of your own.
