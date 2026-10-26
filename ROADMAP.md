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

- **Music for the new zones:** since v0.4.4 each area plays a theme
  (`music.ts`: a chord per bar, a melody line and per-theme patterns, mapped
  from `tileName` in `themeFor`). Each new zone gets its own original theme,
  and the Wildwood can lean on the Westwood's harp and flute. Still open from
  v0.4.4: a night-time variation (thinner, slower arrangement after dark).

**Engine groundwork (small — do first, no new content yet):**
- **Renderer & pathfinding: already fine.** Drawing only covers tiles on
  screen, and BFS over ~10k tiles is trivial. No real cost there.
- **Minimap → radar.** Since v0.4.1 the minimap zooms (1×–4×) and follows
  the hero, and since v0.4.2 its terrain is pre-painted at 16 px/tile
  (1,152×832 px today). At 5× the map that layer would be ~5,800×4,200 px,
  too big for one canvas: paint it in tiles/chunks around the hero instead,
  and drop the 1× "whole realm" step (or cap it) so it's a true
  player-centred radar, keeping click-to-travel; optionally add a full
  **World Map** overlay (key `M`).
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
    trader, Prayer altar (ties into v0.4.2).
- Roads linking regions, with landmarks so travel reads as a journey.
- Gate deeper regions by level or quest (e.g. v0.4.3 starter quests).
- Tougher foes for mid-level combat, with better drops.
- Consider releasing in steps: v0.5.0 = groundwork + Wildwood, later
  point releases add the remaining regions.

**Open questions:**
- Exact target size, and grow outward evenly or mostly in one direction?
- Fast travel (signposts / teleports) once the map is large, or walk only?
- Does the hero's walk speed need a bump (or a run toggle) for longer trips?

### 🔥 Firemaking
- **Teaser:** Light your own fires — anywhere the valley allows
- On the skills list since v0.4.3 (`impl: false`). Logs + a tinderbox make a
  fire on the hero's tile that burns out after a while; cook on it like the
  square's campfire. Oak logs at a higher level.
- Pays off a thread from Old Maro's "The Smith's First Lesson", where he
  takes your logs "until I teach you to light a fire of your own". A short
  Maro quest can teach it.
- Pairs naturally with Fletching below: both turn logs into something.

### 🕯️ The Crypt (first Prayer quest)
- **Teaser:** Something stirs in the old crypt beneath the shrine
- Held back from v0.4.3 until there's somewhere to build it: an old crypt
  beneath the chapel / shrine, sealed since the goblins came. Bring the
  priest bones and candles (or similar), clear the restless dead inside,
  and earn a new blessing or a blessed altar that recharges faster.
- Needs its own small area: an instanced room, or a corner of the expanded
  map. Gate it with quest points (the combat chain gives most of them).
- Builds on the v0.4.3 quest system as is: steps, dialogue, markers,
  quest points and XP bottles (a Prayer bottle fits).

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
    for quest-givers (ties into v0.4.3 quests and v0.4.1 Talk menus)
  - Homes for villagers, a well, market stalls, a chapel or shrine
    (pairs with the v0.4.2 Prayer altar)
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
