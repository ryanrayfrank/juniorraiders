# Architecture

How the game code is organized and how a single play runs. All gameplay lives in
the [`docs/`](../docs) folder (which is also the GitHub Pages root).

## Files

| File | Purpose |
| --- | --- |
| `docs/index.html` | Page shell: the four screens (home / setup / play / result) + the `<canvas id="field">`. |
| `docs/styles.css` | All styling (team red/black look). |
| `docs/js/main.js` | Bootstrap — waits for DOM, calls `Game.init()`. |
| `docs/js/game.js` | The controller: screens, position picker, per-play flow, gap select, cadence, scoring, results. |
| `docs/js/sim.js` | The canvas simulation: formation setup, blocking, pursuit, collisions, tackle/score, rendering. |
| `docs/js/plays.js` | The 6 plays × 11 position assignments (the June Install) + helpers (`assignmentFor`, `actionType`). |
| `docs/js/formations.js` | I Right / I Left offense alignment, the 3-5-3 defense, and `holeX()` (x-position of each hole). |
| `docs/js/audio.js` | Tiny WebAudio sound effects (no audio files). |
| `docs/js/storage.js` | Best-drive / XP persistence via `localStorage` (with in-memory fallback). |

It's plain ES modules + canvas — **no build step, no framework, no dependencies.**
That keeps it $0 and trivially hostable on GitHub Pages.

## Screens

`#home` → `#setup` (pick position + difficulty) → `#play` (the field) →
`#result`. Only one `.screen` has `.active` at a time.

## Per-play flow (the important part)

Driven by `Game` in `game.js`, one play at a time inside a 6-play "drive":

1. **`nextPlay()`** — picks the next play + a random strength side (R/L) + a random
   snap count (ON 1/2/3). Calls `sim.setup()` to build the formation. Shows the
   play call (`I RIGHT · 35 Power · ON 2`) and the player's job in the banner.
2. **Gap select** (ball carrier only) — `startGapSelect()` calls
   `sim.enterGapSelect()`, which draws the six numbered holes and a sliding lane.
   The player moves ◀ ▶ and presses **READY**. Wrong hole → corrective hint +
   retry (and it dings the READS stat). Non-carriers skip straight to cadence.
3. **Cadence** — `startCadence()` runs DOWN / SET / HUT 1 / HUT 2 … The player must
   snap on **HUT &lt;snapCount&gt;**. Snapping early = false start, late = broken
   play (`failCadence()`); on time → `onSnap()` → `sim.begin()`.
4. **Live play** — `sim.update()` runs the simulation each frame. If the human is
   the carrier they steer (◀ ▶ / swipe, GO to burst); otherwise the AI carries and
   the human watches their block. The play ends when a free defender reaches the
   carrier (`endPlay`).
5. **Result** — `onPlayEnd()` scores yards/TD/timing/streak, then advances. After 6
   plays, `showResults()`.

## The simulation model (`sim.js`)

- Every player is real state (`x, y, vx, vy, r, team, role, label`).
- At the snap, each **blocker** moves to get **between his man and the ball**, then
  drives him back. Receivers stalk the nearest corner; the puller kicks out the
  edge; the FB leads to the first linebacker.
- **Unblocked defenders become pursuers** — the real tacklers. So the outcome is
  **emergent**: yards = how far the carrier actually got before a free defender
  caught him. Nobody is ever "run through."
- Defenders are kept from stacking (circle separation), and everyone is clamped in
  bounds.
- **Rendering:** turf + yard lines + the running lane, then each player as a filled
  circle with its label; the carrier gets a ball marker. A `ResizeObserver`
  re-measures the canvas (and rescales all coordinates) whenever its display size
  changes, so players always stay **true circles** even as control rows toggle.

## Difficulty & speed

- **Levels:** Teach (1) / Read (2) / Game (3) set a base time scale
  (`LEVEL_FACTOR` 0.5 / 0.7 / 1.0) and whether hints show (Teach highlights the
  correct hole + target HUT).
- **Speed button:** 🐢 Slow / ▶ Normal / ⚡ Fast multiplies the time scale on top.

## Gotchas for future edits

- `game.js` is a single object literal — **methods are comma-separated.** Forgetting
  a comma between methods is a silent syntax break; run `node --check docs/js/game.js`.
- `#readChoices` still exists in the HTML (the old multiple-choice box). It's no
  longer activated, but `game.js` still calls `.remove("active")` on it, so don't
  delete the element without also removing that reference.
- The canvas uses logical pixels with a devicePixelRatio transform; coordinates in
  `sim.js` are in CSS pixels.
