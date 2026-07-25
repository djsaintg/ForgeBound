# Changelog

All notable changes to **ForgeBound**. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project follows semver.

## [0.2.1] — 2026

The pasture & coop update.

### Added

- Cows are now passive mobs: attackable in the pasture, dropping bones and raw
  beef — cook it into steak (Cooking 15, heals 9, the best food in the realm)
- A fenced chicken coop in the south-east meadow with four hens; chickens drop
  raw chicken, bones, and 1–2 feathers
- Hens lay eggs on the ground every so often (up to six at once, gone after two
  minutes) — click to gather, fry at the campfire for Cooking XP
- Feathers are now trout bait: every trout caught consumes one feathered fly
- Three new campfire recipes: cook raw chicken, cook raw beef into steak, and
  fry an egg
- The Adventurer's Log reads oldest-to-newest, top-to-bottom: new entries
  arrive at the bottom and older deeds are pushed up out of the way, with the
  view always following the newest line (keyed to the latest message id, so
  it never goes stale once the 90-entry cap is reached)
- Chopped trees visibly topple over, leaving a stump, sawdust and a fallen log
  until they regrow (oaks included)
- Seven new hand-drawn item icons; henhouse, ground eggs, cow and chicken
  sprites all drawn procedurally

### Changed

- The bank is now a fixed slot vault — six columns of 36 slots that grow a row
  at a time (with a scrollbar) instead of a resizing list; click withdraws one,
  right-click withdraws a whole stack, and the deposit side mirrors the
  inventory grid
- Loot is table-driven per enemy with a single combined drop line
- Cows greet their attackers with a suitable moo

## [0.2.0] — 2026

The combat beta. Steel is no longer just for show.

### Added

- Melee combat: click a foe, walk up, and auto-attack with accuracy and max-hit
  rolls driven by Attack, Strength, and weapon tier
- Grublin Gully — a new goblin camp northeast through the pasture, with ragged
  tents, a campfire, four goblins, and two Bramble Brigands in the deep
- Enemies fight back, wander their camp, heal when disengaged, and respawn
- Hitsplats (red dealt, blue taken, grey misses), enemy HP bars, hit flashes,
  and death-fade animations
- Loot: coins plus bones — bury bones from your inventory for Prayer XP
- Five more skills lit up: Attack, Strength, Defence, Constitution, Prayer
  (10 of 23 now live)
- Death and respawn: fall in battle and return to Vale Square, fully recovered
- Foes-defeated counter in the Gear panel, and enemy pips on the minimap
- New synthesized combat sounds: hits, hurts, kills, death, and bone-burying

### Changed

- Daggers finally matter: weapon tier adds attack bonus, strength bonus, and
  faster swings (bare hands still work — slowly)

## [0.1.0] — 2026

First release. A complete, playable offline foundation.

### Added

- Login screen with local-save detection, Continue / New Game, and builder's notes
- A procedural tile world: the Westwood, Vale Square, Keldrek Mine, a river with a
  bridge, and a cow pasture
- Click-to-move with BFS pathfinding; animated water, fire, swaying trees, wandering
  cows, and a slow ambient day/night cycle
- Five live skills on the classic XP curve: Woodcutting, Mining, Fishing, Smithing,
  Cooking (Constitution included as a passive, as is tradition)
- 28-slot inventory, gear slots, and tool tiers from bronze to mithril
- Furnace, anvil and campfire crafting: bars, daggers, and cooked food
- Bank of ForgeBound and Roka's Trading Post with a buy/sell economy
- The Adventurer's Log — a read-only, offline event chronicle
- Minimap with click-to-travel, XP orbs, level-up fanfares, and synthesized sound
- Autosave to `localStorage` (debounced + on exit); the whole game builds to a single
  self-contained `dist/index.html`
- `launch.sh` — offline launcher with project-tree preflight, automatic builds, and a
  zero-dependency local server (python3 or node)
