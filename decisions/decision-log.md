# Decision Log

Chronological record of product decisions, oldest first. Newest work is at the
bottom. This is seeded from the original "Playbook Blitz Conversation Recap" and
extended with everything since.

> When you make a new decision, add a dated entry at the bottom.

---

## Phase 1 — Original single-file prototype (Microsoft Copilot)

These are the decisions that produced the original `Playbook-Blitz-DEMO.html` (a
single self-contained HTML file). It lived in a local-only `output/` folder that
has since been deleted; it is not in the repo.

1. **The brief.** Build a game that teaches a youth football playbook to an
   11-year-old who is new to football and has ADHD. Likes Fortnite, snake.io.
   Start from the team's offense + defense PDFs.
2. **Device & budget.** No budget — no app store, no hosting. Decision: build it
   as **one self-contained HTML file** ($0, runs by double-click, also opens on a
   phone/tablet via cloud storage).
3. **Position & scope.** Son plays Tailback / receiver / some O-line. **Start with
   offense.** Build a quick playable demo first.
4. **More realism (v2).** Don't just show gaps — render the real **O-line** and
   I-formation backfield so the user picks what's happening. Added **position
   select (FB/TB)** (the job changes per play) and **3 levels** (Teach / Read /
   Game).
5. **Look & motion (v3).** Removed red gaps (all gaps = highlighted dotted lanes).
   Made X/Z the same chip color as everyone. **Centered labels.** Runner bursts
   through the **chosen gap**. Added the **3-5-3 defense** + snap animation in
   Levels 2–3.
6. **Pop-up in the way.** Coaching pop-up blocked the buttons → moved all coaching
   to the **yellow text at the top** (and stopped it revealing answers early on
   harder levels).
7. **Real football (v4).** Made the fake meaningful (pulls defenders off the ball);
   real **lead block** that drives the LB out; receivers split **wide**; keep the
   defense on the field with the **safety as the true tackler**; show the **FB
   leading in front** of the TB.
8. **Slower & focused (v5).** Removed the "Crack the Code" quiz drill — **Run the
   Play is all we need**. Slowed everything down. All **22 players move** at the
   snap. FB clears a lane and the back runs **beside** the block, never on top.
9. **Coaching tool + cadence (v6).** Reframed as a per-position coaching tool:
   home = one big **"LET'S GO"** button → formation screen to **pick your
   position** → backs start in the I and run into the gap → real **cadence /
   hard-count**: snap on the right "HUT" (early = false start, late = breaks down,
   on time = runs, with a chance to draw the defense offsides).
10. **Everything together.** Play call shows **"I LEFT · 35 POWER · ON 2"** (hut
    count in the call). Whole play fires **simultaneously** (TB on the FB's hip).
    Defense is realistic — **D-line walled off**, only **linebackers read** the
    ball.
11. **Fake choice + tight line (v7).** On a fake, the user **picks which gap to
    fake toward** — far from the ball pulls 2 defenders, too close pulls none.
    Replaced gap boxes with a **tight O-line + sliding lane selector**; receivers
    pushed way out.
12. **Pacing fix.** Cut default pace ~in half, trimmed dead time between plays,
    added an in-game **speed button (🐢 Slow / ▶ Normal / ⚡ Fast)**.

## Phase 2 — Canvas rewrite + GitHub Pages (current)

13. **Rebuilt as a multi-file canvas web app** in the `docs/` folder (replacing the
    single HTML file). Split into ES modules: `plays.js`, `formations.js`,
    `sim.js`, `game.js`, `audio.js`, `storage.js`, `main.js` + `index.html` /
    `styles.css`. The simulation now runs on an HTML `<canvas>`.
14. **Published to GitHub Pages** on the `ryanrayfrank/juniorraiders` repo, served
    from `docs/`. Live at https://ryanrayfrank.github.io/juniorraiders/.
15. **Restored two mechanics lost in the rewrite** + **fixed circles**
    (2026-06-26):
    - **Pre-snap gap selection** for the ball carrier (numbered holes + sliding
      lane + ◀ ▶ READY), back from the original demo.
    - **Snap-count cadence** ("ON X"; DOWN / SET / HUT 1 / HUT 2 …; snap on the
      correct HUT; early = false start, late = too late).
    - **Real circles:** the canvas was measured once while a tall panel showed, so
      CSS later stretched the bitmap into ellipses. Fixed with a `ResizeObserver`
      that re-measures + rescales coordinates whenever the field resizes.
16. **Removed the multiple-choice "pick your assignment" read step**
    (2026-06-26). The user didn't like that screen. Now the **ball carrier goes
    straight to the gap-select screen**; non-carrier positions go straight to the
    cadence. Picking the wrong gap still counts against the READS accuracy stat.
17. **Added this `decisions/` folder** (2026-06-26) as durable project memory so a
    new chat window can get fully up to speed without restarting.
18. **Deleted the local `input/` and `output/` folders** (2026-06-26) — no longer
    needed. They were already git-ignored (never in the repo); the `.gitignore`
    rules stay as a safety net. Docs were updated to stop referencing them.
19. **Teaching & pacing tweaks** (2026-06-26):
    - **Slower cadence** — the HUT count was too fast. Beat interval is now
      per-level (Teach ~1.15s, Read ~0.9s, Game ~0.68s).
    - **Post-play coaching** — after every play we now explain *what happened and
      how to do better* (e.g. "the Mike linebacker filled fast — hit the hole
      quicker and tap GO"), naming the actual tackler. This is the point of the
      game, so it shows even when the read was correct but the gain was small.
    - **Teach (Level 1) is now true beginner mode** — a plain-language breakdown
      of the whole play up top ("33 LEAD: follow your fullback through the 3 hole"),
      simple step prompts below, and a much more forgiving defense (bigger head
      start + slower pursuit via `sim.gameLevel`) so a brand-new player succeeds
      and learns first. Higher levels stay realistic (and explain the losses).

---

## Open / not yet done

- Per-position coaching for the **rest of the offense** (currently the carrier
  flow is the most developed; blockers go straight to cadence with their job shown).
- The **full defense package** (gaps A–D, technique numbers, stunts, coverages
  Cover 3 "RED" / Cover 1 "BLACK", ~20 blitzes). Defense is "Coming soon".
