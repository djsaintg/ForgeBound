# Changelog

All notable changes to **ForgeBound**. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project follows semver.

## [0.4.0] — Gamma v0.4.0 · Visuals — 2026-10-26

Make what's already in the game look the part: a hero and townsfolk who
look like people, livestock that walk like animals, real icons for every
tool and weapon, and a different motion for every job.

### Added

- Distinct work animations, timed to the action bar: a level, side-on axe
  swing with a "thunk" hold at the trunk; an overhead pickaxe strike that
  recoils off the rock; quick hammer taps at the anvil; both hands feeding
  ore into the furnace under its glow; a pan held out and turned over the
  fire; a fishing cast with line and bobber on the water (or a net dipped
  into the shallows for shrimp); and per-weapon combat: dagger stab, sword
  slash with a motion trail, and bare-fisted jabs
- Combat training switch in the Gear tab: melee hits train Attack,
  Strength or both. Each hit's XP is shared between the skills switched on
  (one alone gets the whole amount), and at least one always stays on.
  Defence is still earned only from blows taken, and Hitpoints from every
  hit. The choice is saved with the game
- The hero kneels for a moment when burying bones
- Sawdust, ore sparks, anvil sparks and splashes burst as each blow lands
  instead of trickling out at random, and every axe, pick and hammer blow
  has its own thunk, clink or tap
- The hero turns to face the tree, rock, station or foe being worked
- Classic 8-bit mode shows a simple tool that follows the same motions
- The hero faces and walks in all four directions, with front and back
  views as well as the side view, and turns up or down to work a tree,
  rock or foe above or below

### Changed

- The hero is a jointed figure instead of a round body: head with hair and
  a face, neck, a torso that tapers from the shoulders to the belt, and
  arms and legs with elbows and knees. Walking is a real stride (knees
  fold as each leg swings through, arms swing opposite the legs), and the
  bronze platebody now covers the shoulders and upper arms
- The right tool is in hand for each job: an axe to chop and a pickaxe to
  mine (tinted bronze, iron, steel or mithril by tier), a smith's hammer,
  a rod or net, a frying pan. It used to be one generic stick tinted by
  whatever happened to be equipped. When idle or walking the hero carries
  the equipped weapon
- Hand-drawn icons for every tool and weapon, using the same shapes the
  hero holds in the world: bronze sword (was ⚔️, two swords), bronze /
  iron / steel daggers, bronze / iron / steel / mithril axes and pickaxes,
  each tinted by metal so tiers read at a glance; bronze platebody (was a
  🛡️ shield) and the fly fishing rod
- Goblins, Bramble Brigands, Roka and Old Maro share the hero's jointed
  body. Goblins are short and green with big pointy ears, a studded club
  and a round shield; brigands stand taller and broader. Roka wears a robe
  and a feathered cap, Old Maro a blue robe, a white beard and his orb
  staff. Everyone walks in four directions
- Cows and hens are redrawn with jointed legs: cows walk with a proper
  diagonal gait, swish their tails and stop to graze; hens bob their heads
  as they step and peck at the ground. Both face the way they walk
- Foes turn to face the hero in a fight and strike on the same beat: a
  goblin swings its club, a cow lowers its head and butts, a hen flaps and
  pecks
- Mining rocks are faceted boulders (a slightly different shape on every
  tile) with ore crystals set into the stone, cracks, rubble at the foot and
  a glint on gold, instead of round grey balls with coloured diamonds.
  Emptied rocks sink to a low rubble mound
- Raw beef and steak are drawn as a proper cut of meat (marbled red raw,
  seared brown with grill marks when cooked, fat rim and bone), replacing
  the shapeless red blob
- Paddock fences around the cows and the chicken coop are post-and-rail:
  one wooden post per tile with split rails that join only to neighbouring
  fence, so corners and gate gaps connect cleanly. They used to be a
  repeating grid that looked like railway track
- Cooked chicken has its own golden-brown icon (it shared 🍗 with raw
  chicken), and logs and oak logs are stacked, end-on log piles

### Fixed

- The hero stops beside a cow, hen or goblin to fight it instead of walking
  onto its tile. A foe in a fight now holds its ground instead of wandering
  off, and wandering animals and goblins no longer step onto the hero
- Smelting and smithing stop as soon as the last set of materials is used.
  The hero used to take one more empty swing at the furnace or anvil before
  noticing nothing was left

## [0.3.4] — Gamma v0.3.4 · Resizable Windows & HUD — 2026-10-25

Make the screen your own: panels that stretch, a HUD that knows its place,
and bars that look like metal.

### Added

- Resizable panels: drag the bar on the side panel's left edge to widen the
  Backpack / Skills / Gear panel, or the bar above the Adventurer's Log to
  make it taller. Sizes are remembered; double-click a bar to reset it. The
  map always keeps at least about half the screen
- Action banner under the compass: "Chopping tree…", "Mining copper
  rocks…", "Smelting bronze bar…", "Fighting the Goblin Warrior…" and so on,
  with a progress bar that fills with the action timer. While walking over it
  reads "Heading to the tree…"

### Changed

- A wider side panel shows the backpack in more columns instead of
  stretching each slot
- Bronze, iron and steel bars are hand-drawn SVG ingots in their metal's
  colours, replacing the orange square (🟧), white square (⬜) and bolt (🔩)
  emojis
- XP orbs moved from the top-left corner to a column under the compass,
  below the action banner, so the compass, banner and orbs never overlap
- Ore and bar icons are drawn larger, filling their backpack slot like the
  other items

### Fixed

- The hero no longer swings an axe or pickaxe (or kicks up sawdust and ore
  sparks) while still walking to a tree or rock. The work animation now starts
  when the hero arrives and the action timer begins. The same applies to
  chasing a foe
- The world canvas only resizes when its size really changes, and repaints
  immediately when it does, so resizing panels or opening the mobile drawer
  can't flash a blank frame

## [0.3.3] — Gamma v0.3.3 · Login Page Edits — 2026-10-25

A new front door: your hero's name is yours for keeps, the builder's notes
write themselves, and the realm can fill the whole screen.

### Added

- **Abandon & Restart** on the login card: a smaller gold button under
  Continue that deletes the current save so a new hero can be named. It asks
  for a second click before anything is wiped, and backs out on its own after
  five seconds
- Builder's notes now write themselves and stay on show: a three-column strip
  under the login card shows the previous release, the live release
  (centred and highlighted) and what's on the anvil next. Releases come
  straight from this changelog and the preview from public teaser lines in
  `ROADMAP.md`, all baked into the build
- Fullscreen play: tick **Play fullscreen** on the login card and the game
  fills the screen when you enter the realm, with no browser tabs, address bar
  or title bar. The choice is remembered, and Settings has a Fullscreen
  on/off button. Esc always drops back to a window

### Changed

- The display name is chosen once. With a save on the device, the login card
  shows your hero's name instead of an input box, and the old "Begin a new
  adventure" button is gone

## [0.3.2] — Gamma v0.3.2 · Gathering Fixes — 2026-10-24

A small patch: click from anywhere and get to work, with ore you can tell
apart.

### Fixed

- Tin ore showed a cog (⚙️) in the backpack, and copper and iron shared the
  same plain rock. All five ores now have hand-drawn SVG chunks studded with
  crystals in the same colours as their veins in the mine
- Clicking a tree, rock or fishing spot from more than a tile away now works:
  the adjacency check was cancelling the action on the first frame of the
  walk over, so the hero arrived and just stood there

## [0.3.1] — Gamma v0.3.1 · Visual Repairs — 2026-10-24

The valley holds still. Flicker gone, clicks true, and no more swinging at
stumps.

### Fixed

- World flicker while walking or gathering: the hero's shadow mixed a pixel
  bob into a tile-fraction formula, its radius went negative, and the canvas
  threw mid-frame — skipping everything drawn after the hero, including the
  lighting pass, on alternating frames
- Camera and click-picking now use the same whole-pixel tile size as the
  renderer, so the hero stays centred, the view no longer jitters while
  walking zoomed, and clicks land on the tile under the cursor anywhere on the
  map (previously off by ~0.4px per tile, ≈20px by tile 50)
- Felling a tree or emptying a rock now ends the action immediately, instead
  of swinging a full extra cycle at the stump for nothing
- Once the Adventurer's Log reached its 90-entry cap, new lines could wait to
  appear until something else on screen changed; panels now refresh on every
  new entry
- Mouse-wheel zoom is held to the same 1.0×–3.2× range as the Settings slider
- Login builder's notes no longer advertise resizable log & backpack panels,
  which aren't in this build

### Changed

- The UI-refresh check no longer serialises inventory, bank and XP to JSON
  every frame; a lightweight hash does the same job without the per-frame
  string allocation
- The version number now comes from `package.json` alone — the page title,
  login screen and Adventurer's Log all read it at build time
- Package metadata names the project (`forgebound`) instead of the
  starter-template placeholder
- Login builder's notes lead with the v0.3.1 repairs

### Removed

- `forgebound-gamma-visual-update.zip` — a duplicate of `src/` that had been
  committed by accident; `*.zip` is now git-ignored

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
