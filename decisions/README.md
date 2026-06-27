# Playbook Blitz — Project Memory

This folder is the **single source of truth** for everything we've decided on this
project. Read it at the start of any new chat so you don't have to re-explain the
context. When we make a new decision, it gets written down here.

> **For a new AI chat / collaborator:** read this file top-to-bottom first, then
> skim [`decision-log.md`](decision-log.md). That's enough to be fully caught up.

---

## What this project is

**Playbook Blitz** is a free, browser-based practice game that teaches the
**Junior Raiders** youth football offense (the "AJRF 6th 2026 June Install"),
one position at a time. It was originally built for an 11-year-old who is new to
football, has ADHD, and learns better through a game than by sitting and reading
a playbook.

**Core idea:** pick a position → read the called play → pick your gap / snap on
the cadence → watch (or steer) the play run in a live simulation where the
outcome is real (blockers occupy defenders; a free defender makes the tackle
wherever he catches the ball carrier).

## The football being taught

- **Offense:** I-Formation. Play numbers are a code — **1st digit = ball carrier**
  (2 = FB, 3 = TB), **2nd digit = hole** (odd = left, even = right).
- **6 plays:** 21/22 Dive, 33/34 Lead, 35/36 Power.
- **Cadence:** the huddle calls how many hut counts ("ON 2"); snapping on the
  wrong count = false start (early) or a broken play (late).
- **Defense:** 3-5-3 (taught later; currently "Coming soon" on the pick screen).

## Where it lives / how to play

- **Live site:** https://ryanrayfrank.github.io/juniorraiders/
- **GitHub repo:** `ryanrayfrank/juniorraiders` (branch `main`)
- **Hosting:** GitHub Pages, served from the [`docs/`](../docs) folder.
- Deploy = commit + push `main`. Full steps in [`deployment.md`](deployment.md).

## Current state (keep this updated)

- The app is a **canvas-based, multi-file** web game in `docs/` (rebuilt from an
  earlier single-file prototype).
- Per-play flow for the **ball carrier**: read the play call → **slide to pick
  your gap** (◀ ▶ then READY) → **cadence** (snap on the right HUT) → steer the
  run. The old multiple-choice "pick your assignment" screen was **removed**.
- Players render on an HTML `<canvas>`; a `ResizeObserver` keeps them as true
  circles when the field resizes.
- Defense is not yet playable; only offense positions are selectable.

## Repo layout

```
Football/
├─ docs/            # the published game (GitHub Pages root)
├─ decisions/       # THIS folder — project memory & decisions
└─ README.md        # short public-facing readme
```

> Earlier there were local-only `input/` (playbook PDFs + images) and `output/`
> (the old single-file prototype + conversation recap) folders. They've since been
> deleted; both are still listed in `.gitignore` so they're never committed if
> recreated.

See [`architecture.md`](architecture.md) for how the code is organized.

## The other docs in this folder

| File | What's in it |
| --- | --- |
| [`decision-log.md`](decision-log.md) | Chronological log of every product decision, oldest → newest. |
| [`architecture.md`](architecture.md) | How the game code is structured and how a play runs. |
| [`deployment.md`](deployment.md) | GitHub + GitHub Pages: how to deploy, and Windows/PowerShell gotchas. |

## Conventions / preferences we've settled on

- **$0 forever.** No paid hosting, no app store, no installs. Runs in any browser.
- All players are **one consistent chip style** per team (no per-position colors);
  labels centered; the ball carrier is highlighted gold.
- Coaching text goes in the **yellow line at the top**, never a pop-up that blocks
  buttons.
- Keep it **slow/clear by default** with an in-game speed toggle (🐢 / ▶ / ⚡).
- The simulation outcome should be **emergent and realistic** — nobody is "run
  through"; the D-line gets walled off while linebackers read and flow to the ball.
