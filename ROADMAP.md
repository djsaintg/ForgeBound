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

## Backlog — tooling (unscheduled)

### ⬆️ One-click updates
Getting a new version today means pulling and rebuilding by hand. Add an
update path that does it in one step.

- **Launcher only:** the game is a page in the browser, and a page can't run
  `git` or write files; it also makes zero network requests by design. So
  updating is the launcher's job, done before the game opens. No in-game
  update button: with auto-update on launch it isn't needed.
- **`./launch.sh --update`:** `git fetch --tags`, compare the newest release
  tag with `package.json`'s version, and if there's a newer one:
  `git pull --ff-only`, `npm ci` only if `package-lock.json` changed, then
  rebuild `dist/index.html`. Print what changed (that version's changelog
  section) and relaunch.
- **Auto-update on launch:** a plain `./launch.sh` first checks whether the
  repo's remote is reachable, by asking it directly (`git ls-remote` under a
  short timeout, ~5s) rather than pinging some other host, so it's a real
  "can we update?" test. Reachable → run the `--update` step automatically,
  then launch. Unreachable, timed out, or not a git checkout (e.g. a copied
  folder) → print one line ("Offline — skipping update check") and launch
  the current build as normal. A failed or refused update never blocks
  play: warn and launch what's already built.
- **Opting out:** `./launch.sh --offline` (or `FORGEBOUND_NO_UPDATE=1`)
  skips the check entirely, for slow or metered connections.
- **Safety:** skip the update for a checkout with local changes (show `git
  status`, then launch as normal), fast-forward only, never touch saves
  (they live in the browser's localStorage, not the repo), and keep the
  previous `dist/index.html` as a backup in case the new build fails.
- **Also:** the launcher's `REQUIRED_FILES` list is hand-kept (refreshed in
  v0.5.0); consider deriving it from `src/` so it never goes stale.

---

## v0.5.1 — The Wildwood (planned)

v0.5.0 shipped the wider realm's groundwork: the Vale at ~5× its old area,
region-built `map.ts`, the radar minimap, save migration, the village on the
square, Greyhallow and the Restless Crypt, and waygates (see `CHANGELOG.md`).
Next, the new zones themselves, one point release at a time.

### 🌲 The Wildwood
- **Teaser:** The Wildwood — deep forest beyond the Vale, and a lake that has never been fished
- Dense forest, willow/maple trees, a lake with a new fishing spot, and the
  Fletching & Ranged training ground (below). Its own region block in
  `map.ts`, its own theme in `music.ts` (it can lean on the Westwood's harp
  and flute), and a waygate.
- Where it goes: the map has room south of the river (the meadow there is
  empty for now) or the surface can grow again. Decide at build time.

### 🔥 Firemaking
- **Teaser:** Light your own fires — anywhere the valley allows
- On the skills list since v0.4.3 (`impl: false`). Logs + a tinderbox make a
  fire on the hero's tile that burns out after a while; cook on it like the
  square's bonfire. Oak logs at a higher level.
- Pays off a thread from Old Maro's "The Smith's First Lesson", where he
  takes your logs "until I teach you to light a fire of your own". A short
  Maro quest can teach it.

### 🏹 New Skills: Fletching & Ranged
- **Teaser:** Fletching and Ranged — carve bows, fletch arrows, fight from afar
- Logs and feathers already drop, so Fletching (logs → shafts → arrows,
  logs → bows) needs no new raw materials. Ranged gives a second combat
  style that uses them. Both exist as greyed-out entries in `xp.ts`.
- The Wildwood hosts an archery range and a fletcher's workshop NPC.
- **Decided:** arrows are used up on firing, but roughly 1 in 3 lands near
  the target and can be picked up again.

### 🗺️ More regions (v0.5.2+)
- **A highland mining camp** — mithril, a second furnace/anvil, tougher foes.
- **Ruins / a second settlement** — quest-givers, a trader.
- Tougher mid-level foes with better drops; gate deeper regions by level or
  quest. Each new region gets a waygate.
- Still open from v0.4.4: a night-time variation for the music.
- **Mountain ring visuals:** refine the range art now the rim is slim.
- **Minimap:** the radar paints the whole realm into one canvas at 16 px a
  tile (~2.6k × 1.7k today). If the map grows much more, paint it in chunks
  around the hero instead. A full World Map overlay (key `M`) is still an
  option.

---

## v0.6.0 — A Proper Village (planned)

v0.5.0 already put the square's services under roofs: the smithy, the bank
(with Hesta), Roka's Trading Post and Old Maro's hut, round a central
bonfire, using exterior-only buildings whose roofs fade while you're inside
(`raise()` in `map.ts`, art in `village.ts`). v0.6.0 finishes the village.

### 🏘️ The rest of the Vale village
- **Teaser:** The Vale grows up — homes, an inn and a market round the square
- **Inn / tavern** — a hearth to cook at and a home for new quest-givers
  (ties into the v0.4.3 quest system and v0.4.1 Talk menus)
- Homes for villagers, a well, market stalls
- Furnishing inside the existing buildings: a coal heap and quench trough
  in the smithy, a counter in the trading post, a bed and hearth in Maro's hut
- Villager NPCs who wander or idle about the square

**Open questions:**
- Keep exterior-only buildings, or add separate interior maps for larger ones?
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
