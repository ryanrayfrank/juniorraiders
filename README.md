# Playbook Blitz

A practice game that teaches the Junior Raiders offense one position at a time.
Pick any of the 11 offensive spots, read your assignment for the called play,
snap on the cadence, and watch (or steer) the play unfold in a live simulation
where the outcome is real: blockers occupy defenders and a free defender makes
the tackle wherever he catches the ball carrier.

## Play it

The site is published with **GitHub Pages** from the [`docs/`](docs/) folder:

> https://ryanrayfrank.github.io/juniorraiders/

No download needed - it runs in any modern browser on phone or computer.

## Structure

| File | Purpose |
| --- | --- |
| `docs/index.html` | Page shell + the `<canvas>` field |
| `docs/styles.css` | Styling (team red/black) |
| `docs/js/plays.js` | All 6 plays x 11 position assignments (June Install) |
| `docs/js/formations.js` | I Right / I Left alignments + the 3-5-3 defense |
| `docs/js/sim.js` | Canvas simulation: blocking, pursuit, collisions, tackle |
| `docs/js/game.js` | Screens, position picker, read step, cadence, scoring |
| `docs/js/audio.js`, `storage.js`, `main.js` | Sound, saved best/XP, bootstrap |

## Local preview

Because it uses ES modules, serve the folder over http (not `file://`):

```bash
python -m http.server 8000 --directory docs
# then open http://localhost:8000
```

## Levels

- **Teach** - slowest, shows you the answer.
- **Read** - you pick the assignment.
- **Game** - faster, no hints.

The published site is entirely in `docs/`. (Source material and the old
single-file prototype used to live in local-only `input/`/`output/` folders;
those have since been removed and are git-ignored if ever recreated.)
