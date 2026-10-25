# ForgeBound — Roadmap & Planned Changes

Scratchpad for upcoming work. Items here are **not yet implemented** — they are
notes for future versions. Once shipped, they move into `CHANGELOG.md`.

---

## Backlog — render hardening (no known bugs)

Leftovers from the v0.3.1 flicker hunt (shipped — see `CHANGELOG.md`). Pick
these up only if shimmer or flashes show up again.

- **Canvas resets:** assigning `canvas.width/height` wipes the canvas. The
  `ResizeObserver` in `WorldCanvas.tsx` does this whenever the viewport box
  changes (panels/modals opening, mobile drawer). Only resize when the
  computed size actually differs, and redraw immediately after.
- **Sub-pixel shimmering:** snap the final camera offset to whole *device*
  pixels (account for `devicePixelRatio`) after zoom scaling.
- **Render guard:** wrap each entity draw so one bad sprite can't throw and
  abort the rest of the frame (how the v0.3.1 flicker hid for so long).

---

## v0.3.3 — Login Page Edits & UI Polish (planned)

### Display-name flow rework
- Once a display name has been **chosen/confirmed**, the name-entry option
  disappears from the login card (no longer editable at that point).
- A **second button** appears beneath "Begin Your Adventure":
  - Same visual styling as the "Begin Your Adventure" gold button.
  - Sized at roughly **60% of that button** (~40% smaller).
  - Functionality: **delete the current adventure and start over** (wipes the
    local save so a fresh name can be entered / a new game begun).
  - **Button label: TBD** — decide the wording when work begins.

**Open questions to resolve at build time:**
- What exactly "confirming" a name means (e.g. does it lock on first
  Continue, or is there a separate confirm step?).
- Final button copy (e.g. "Start Over", "New Adventure", "Abandon & Restart").
- Confirmation prompt before the save is deleted? (Recommended, to prevent
  accidental wipes.)

### Changelog-driven "What's New" on the login screen
- Tie the login screen's builder's notes to `CHANGELOG.md` so the most recent
  release's updates are displayed automatically — no more hand-editing the
  notes copy each version.
- Goal: whatever was in the latest push shows up on the login page's
  "What's New / Builder's Notes" panel on next build.

**Options to weigh at build time:**
- **Build-time import (recommended):** parse `CHANGELOG.md` at build via a Vite
  plugin / `?raw` import, extract the top (most recent) version block, and feed
  its bullets into the login panel. Keeps everything in one source of truth and
  stays fully offline (baked into `dist/index.html`).
- **Manual mirror:** keep a small `updates.ts` constant the login reads from —
  simpler, but still a second place to edit each release (defeats the purpose).

**Open questions:**
- How many bullets / which sections to surface (Added only? Added + Changed?
  a capped count?).
- Show just the newest version, or a short scrollable history?
- Parse the raw markdown vs. maintain a lightweight structured format the
  changelog is generated from.
- Keep the hand-written flavour intro line, or show raw bullets only?

### Roadmap-driven "What's Next" on the login screen
- Tie the login screen to `ROADMAP.md` as well, so upcoming plans are displayed
  alongside the changelog. Companion to the item above — design and build them
  together.

**Build it as one feature, not two:**
- A single "Builder's Notes" panel with two sections: **What's New** (latest
  `CHANGELOG.md` release) and **What's Next** (planned work from this file).
- One shared build-time parse pipeline (`?raw` import for both files) feeding
  the same panel — avoid two parallel mechanisms.

**Curation is the real problem here (unlike the changelog):**
- This file contains private planning — "TBD" labels, open questions, internal
  options. The login panel must NOT show raw roadmap markdown verbatim.
- Recommended convention: give each planned item a short **public teaser line**
  (e.g. under a `**Teaser:**` sub-bullet) and have the login read only those.
  Full planning detail stays in this file.
- Alternative: a `<!-- public -->` HTML comment marker the parser filters on.

**Open questions:**
- Teaser wording: confident promises ("coming in v0.3.3") vs. soft language
  ("being considered")? Public plans create expectations.
- Show the target version number on planned items, or just "coming soon"?
- If nothing is planned yet, hide the section entirely (don't render an empty
  "What's Next").

### 📐 Resizable Interface Windows
- Restore the functionality allowing players to drag the corners of the
  **Backpack** and **Adventurer's Log** to resize them.
- Note: no resize/drag code exists in the current tree — this is a rebuild,
  not a re-enable. The side panel is a fixed `w-[290px]` and the log a fixed
  `h-[158px]` in `App.tsx`.
- Ensure the layout remains "Gamma-truthful": transparent glass styling that
  allows the map to show through the background.

### 🧭 HUD Occlusion Fix
- Move the **Active Action Banner** ("Chopping tree...") and **XP Orbs** further
  down the screen.
- **Target:** Anchor them at `top: 224px` so they appear cleanly underneath
  the Circular Radar Compass instead of being hidden behind it.
- Note: in the current tree there is **no Active Action Banner** component,
  and the XP orbs sit top-*left* (`XpOrbs.tsx`) while the compass sits
  top-*right* (`App.tsx`), so they only collide on narrow viewports. Decide
  whether to (re)build the action banner first, then place both under the
  compass.

### ⛰️ Mountain Expansion
- Refine the **Mountain Range** border visuals to support "pushing" them back
  as the core world grows in future updates.
