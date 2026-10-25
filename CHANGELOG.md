# Changelog

All notable changes to **ForgeBound**. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project follows semver.

## [Unreleased]

### Changed

- Package metadata now names the project (`forgebound`, version `0.3.0`)
  instead of the starter-template placeholder
- Roadmap's v0.3.1 flicker plan rewritten around the real render loop

### Removed

- `forgebound-gamma-visual-update.zip` — a duplicate of `src/` that had been
  committed by accident; `*.zip` is now git-ignored

### Fixed

- Login builder's notes no longer advertise resizable log & backpack panels,
  which aren't in this build

## [0.3.0] — Gamma v0.3.0 · Visual & Animation Overhaul — 2026-07-25

Eight bits become sixty-four, and the valley finally moves and breathes
at the same pace as its hero.

### Added

- 64-bit remastered renderer: multi-tier tree canopies that sway in the wind,
  crystalline ore veins, mossy Vale Square flagstones, pebbled dirt roads,
  animated multi-tone water with sun glints, a plank bridge with iron bolts,
  and a slow day/night ambience with a hero-glow vignette
- Live engine toggle (64-bit Remastered ⇄ 8-bit Legacy) in the Settings window
- Explorer camera: smooth follow with mouse-wheel zoom from 1.0× grand vista
  to 3.2× close-up
- The realm gained edges — an impassable ring of snow-capped mountain ranges
  with drifting valley mist now encircles the world, so the compass never hides
  playable ground and future updates can simply push the ranges back
- Immersive interface: a full-bleed framed world viewport with the side panel
  (Inventory, Skills, Gear) and a bottom-docked Adventurer's Log, plus a mobile
  drawer — the compass nests in the viewport's corner, never over the map
- A master Settings window (gear button in the side panel): camera field of
  view, render engine, WebAudio synthesis, and save controls
- Two Bramble Brigands (Lvl 9, 22 HP) lurking in the deep gully beyond the camp
- Sculpted fire: the furnace is now a masonry blast furnace with chimney smoke,
  an arched hearth and contained flames; the campfire gains a stone ring,
  crossed end-grained logs and layered teardrop flames
- A proper six-frame walk cycle for the hero — contact, recoil and pass poses
  interpolated over ~500ms, with knees that bend on the lift, arms that
  counter-swing to the legs, a torso that bobs on the down-beats, and the
  whole rig mirrors to face west when travelling left
- True walking gaits for cows, hens and goblins too — swinging limbs replace
  the old vertical hop
- Live fire lighting — the furnace and campfire are real light sources now,
  each casting a warm additive halo (with independent flicker) that pushes
  back the night wash and pools on the tiles around them
- Chopped trees visibly topple, leaving a stump, a fallen trunk with growth
  rings and scattered sawdust until regrowth; sawdust and ore sparks fly while
  gathering
- Combat feedback to spec: red splats dealt, blue taken, grey misses; enemies
  flash white when struck and fade out on death; Defence XP for weathering
  blows and Defence joins the live skill list; distinct hit, hurt, miss, kill,
  death and bone-bury sounds; hostile red pips on the minimap; a foes-defeated
  tally in the Gear panel
- Seven hand-drawn SVG item icons for the livestock set — bones, raw beef,
  steak, raw chicken, feathers, egg and fried egg

### Changed

- Cooked beef is now **Steak** — Cooking 15, heals 9, the best food in the realm
- Feathers are trout bait: every trout caught consumes one feathered fly, and
  hens drop 1–2 feathers per kill
- Laid eggs cap at six on the ground and spoil after two minutes
- The bank is a fixed six-column vault of 36 slots that grows a row at a time;
  left-click withdraws one, right-click withdraws the whole stack
- Better weapons swing faster in melee — bare hands are slowest of all
- Foes mend their wounds while disengaged from combat
- Defeated foes announce their loot as a single combined drop line
- XP orbs return as skill-tinted medallions in the viewport corner; autosaves
  no longer spam the Adventurer's Log
- The Adventurer's Log follows the newest entry and filters by All / Skilling /
  NPCs & Combat
- Login screen restored to the original key art — night sky, moon, layered pine
  hills and the crest — with the Gamma notes riding alongside
- All third-party naming removed; the interface presents as ForgeBound's own

### Fixed

- The walkable buffer beyond the old palisade let players skirt the river; the
  mountain ring seals the crossing to the bridge

## [0.2.1] — 2026-07-25

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

## [0.2.0] — 2026-07-25

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
