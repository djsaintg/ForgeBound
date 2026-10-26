# ForgeBound — Roadmap & Planned Changes

Scratchpad for upcoming work. Items here are **not yet implemented** — they are
notes for future versions. Once shipped, they move into `CHANGELOG.md`.

**Public teasers:** the login screen's Builder's Notes reads only lines of the
form `- **Teaser:** …` sitting under a `## vX.Y.Z — … (planned)` heading.
Everything else in this file stays private. Keep teasers soft ("being
forged", not promises).

---

## Backlog — render hardening (no known bugs)

Leftovers from the v0.3.1 flicker hunt (shipped — see `CHANGELOG.md`). Pick
these up only if shimmer or flashes show up again.

- **Sub-pixel shimmering:** snap the final camera offset to whole *device*
  pixels (account for `devicePixelRatio`) after zoom scaling.
- **Render guard:** wrap each entity draw so one bad sprite can't throw and
  abort the rest of the frame (how the v0.3.1 flicker hid for so long).

---

## v0.4.0 — Quests & Prayer (planned)

The first real goals beyond grinding: things to *do* with what you gather,
and something to spend Prayer on. Fits the current map — no new zone needed.

### 📜 Basic Gathering Quests
- **Teaser:** Your first quests — townsfolk in need of fish, logs and ore
- A quest-giver NPC (or a notice board in Vale Square) hands out simple
  fetch quests: "Bring me 10 logs", "5 raw trout", "8 copper + 8 tin ore".
- Rewards: coins, a skill XP lamp, and occasionally a tool/gear upgrade.
- A **Quests** tab in the side panel: available / in progress / complete,
  with a progress counter (e.g. 6/10 logs) that updates from the backpack.
- Save format: add a `quests` map to the save payload (bump `SAVE_VERSION`
  with a migration so existing saves keep working).

**Open questions:**
- Fixed hand-written quest list, or repeatable randomised "daily" tasks too?
- Do turned-in items get consumed (yes, probably) and must they be in the
  backpack, or can the bank count?
- Quest points as a separate tally / unlock gate for later content?

### 🖱️ Right-Click Action Menus
- **Teaser:** Right-click anything for a menu of actions — talk, trade, inspect and more
- **Left-click stays as-is:** walk to a tile, or perform the target's
  *default* action (Roka → open the trading post, tree → chop, rock → mine,
  goblin → attack, ground item → pick up).
- **Right-click opens a context menu** at the cursor listing every action for
  whatever is under it, default first. Examples:
  - **Roka:** Talk · Trade (open trading post) · Inspect
  - **Tree / rock / fishing spot:** Chop / Mine / Fish · Inspect
  - **Goblin / brigand / cow / hen:** Attack · Inspect (level, HP)
  - **Ground item:** Take · Inspect
  - **Empty tile:** Walk here
- **Talk** gives NPCs a few lines of dialogue, and it's the hook the quest
  system uses (quest-givers offer and turn in quests through Talk).
- **Inspect** prints a flavour/stat line to the Adventurer's Log.
- Menu closes on choosing an option, clicking elsewhere, Escape, or moving
  the mouse well away from it. Styled to match the glass panels.
- Build note: `WorldCanvas.tsx` currently swallows right-clicks
  (`onContextMenu` → `preventDefault`). Refactor each target's click handling
  into a list of `{ label, run, isDefault }` actions so left-click runs the
  default and right-click renders the list — one source for both.
- Consider the same pattern for backpack items later (left-click = use/eat/
  equip, right-click = Use · Drop · Inspect · Sell).

**Open questions:**
- Long-press on touch/mobile to open the menu?
- Should the menu list every target stacked on a tile (e.g. a cow standing on
  dropped loot), or only the topmost?

### ✨ Prayer, Properly
- **Teaser:** Prayer grows teeth — an altar and blessings to call on in battle
- Prayer is already a live skill, but only for burying bones; there is
  nothing to spend it on yet. Add **Prayer points** (max = Prayer level) and
  a small set of toggleable combat blessings that drain points over time:
  e.g. +5% Defence (lvl 1), +5% Strength (lvl 4), faster HP regen (lvl 7),
  +10% accuracy (lvl 10).
- A small shrine/altar near spawn to recharge points (and later: offer bones
  at it for bonus XP).
- Ties straight into combat — goblins and brigands become the natural
  training loop alongside burying their bones.

---

## v0.5.0 — The Wider Realm (planned)

Grow the world roughly **5× in playable area** and open new zones inside a
pushed-back mountain ring, built around levelling the next skills. The
current valley becomes one region of many. First new zone, working name:
*The Wildwood*.

### 🗺️ World Expansion — ~5× the map
- **Teaser:** Beyond the ridge — a far wider realm opens inside the mountains
- **Size:** today's playable core is 56×36 tiles (2,016) inside an 8-tile
  mountain band. Target ≈ 125×80 core (~10,000 tiles, ≈5×), so it is ~400%
  *more* map. Final numbers decided at build time.

**Engine groundwork (small — do first, no new content yet):**
- **Renderer & pathfinding: already fine.** Drawing only covers tiles on
  screen, and BFS over ~10k tiles is trivial. No real cost there.
- **Minimap → radar.** `Minimap.tsx` draws the *entire* map at 3 px/tile
  (216×156 px today). At 5× that's ~375×240 — too big. Turn it into a
  player-centred radar window (fixed size, scrolls with the hero), keeping
  click-to-travel; optionally add a full **World Map** overlay (key `M`).
- **The 8-tile padding exists only so the full-map compass never covers
  playable ground.** With a radar it can shrink to a slim mountain rim.
- **Region-based authoring.** `map.ts` hand-places everything with
  `+ OFFSET_X/Y` arithmetic in one file. Split into region modules
  (`regions/valley.ts`, `regions/wildwood.ts`, …), each authored in local
  coordinates (ideally as an ASCII layout block) and stamped onto the world
  grid at an origin. Makes 5× the content manageable to write and tweak.
- **Save migration.** Hero position, ground items and station lookups are
  absolute tile coords. Keep the current valley at a fixed origin in the new
  grid and migrate old saves by that offset (pattern already exists in
  `loadGame`: the pre-expansion `g.x < 8` shift). Bump `SAVE_VERSION`.
- Spawn lists (cows, hens, goblins) move into their regions too.
- **Mountain ring visuals** (carried over from v0.3.x): refine the range art
  so the border reads well wherever it ends up once it's pushed back.

**Content (the real work):**
- 5× the land needs 5× the reasons to walk it, or it feels empty. Plan
  regions before drawing:
  - **The Vale** (current valley, kept as the starter hub).
  - **The Wildwood** — dense forest, willow/maple trees, a lake with a new
    fishing spot, Fletching & Ranged training ground (below).
  - **A highland mining camp** — higher-tier ore (mithril), a second
    furnace/anvil, tougher foes guarding it.
  - **Ruins / a second settlement** — quest-givers, a bank, Roka-style
    trader, Prayer altar (ties into v0.4.0).
- Roads linking regions, with landmarks so travel reads as a journey.
- Gate deeper regions by level or quest (e.g. v0.4.0 starter quests).
- Tougher foes for mid-level combat, with better drops.
- Consider releasing in steps: v0.5.0 = groundwork + Wildwood, later
  point releases add the remaining regions.

**Open questions:**
- Exact target size, and grow outward evenly or mostly in one direction?
- Fast travel (signposts / teleports) once the map is large, or walk only?
- Does the hero's walk speed need a bump (or a run toggle) for longer trips?

### 🏹 New Skills: Fletching & Ranged
- **Teaser:** Fletching and Ranged — carve bows, fletch arrows, fight from afar
- The best fit for the existing world: **logs** and **feathers** already
  drop, so Fletching (logs → shafts → arrows, logs → bows) slots in with no
  new raw materials. Ranged then gives a second combat style that uses them.
- The new zone hosts the training ground: an archery range / target butts
  and a fletcher's workshop NPC.
- Both skills already exist as greyed-out entries in `xp.ts` (`impl: false`);
  flip them on and add their recipes/actions.

**Open questions:**
- Zone name and theme.
- How big a map expansion the renderer and pathfinding can comfortably take.
- Ranged ammo: consumed per shot, or partially recoverable from the ground?

---

## v0.6.0 — A Proper Village (planned)

The Vale's open square becomes a real village: actual buildings that house
the people and services already there.

### 🏘️ Vale Village Rebuild
- **Teaser:** The Vale grows up — a proper village with real buildings
- Give every service a home instead of standing in the open:
  - **Forge / smithy** — furnace and anvil under one roof
  - **Bank** — a stone counting-house
  - **Roka's trading post** — a shopfront
  - **Old Maro's cottage** — the guide's house
  - **Inn / tavern** — campfire cooking moves to a hearth; a natural home
    for quest-givers (ties into v0.4.0 quests and Talk menus)
  - Homes for villagers, a well, market stalls, a chapel or shrine
    (pairs with the v0.4.0 Prayer altar)
- **How buildings work (decide at build time):**
  - *Exterior-only* — walls block, a door tile is the way in, the roof fades
    out when the hero walks inside (classic top-down approach; fits the
    current single-map renderer best).
  - *Separate interiors* — doors load a small interior map. More work:
    needs map switching and save support.
- Multi-tile sprites: walls, roofs, doors, windows, chimneys with smoke —
  in both 64-bit and 8-bit modes.
- Builds on the v0.5.0 region system: the Vale becomes its own region
  module, so rebuilding it doesn't touch the rest of the world.
- Save migration if station/NPC tiles move.

**Open questions:**
- Roofs that fade vs. separate interior maps?
- Keep the existing layout recognisable, or redesign the square freely?
- Villager NPCs who wander/idle, or static figures?

---

## Ideas — later skills (unscheduled, private)

Candidates for after v0.5.0, roughly in order of how well they fit what
already exists:

- **Crafting** — cows could drop cowhide → leather armour; gold ore
  (already mined) → rings and amulets at the furnace.
- **Herblore** — herbs as rare goblin drops or a herb patch → potions that
  pair with combat (strength / defence / prayer restore).
- **Agility** — an obstacle course in the new zone; perks like faster run
  energy or shortcuts across the map.
- **Thieving / Slayer / Magic / Runecrafting / Farming / Construction** —
  bigger systems; park until the core loop and zones are richer.
