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

20. **Flow & clarity fixes** (2026-06-26):
    - **NEXT button between plays** — post-play coaching no longer auto-disappears;
      the play pauses on the result until the user taps NEXT (or Space). Last play
      shows "SEE RESULTS". Applies to blown-cadence plays too.
    - **Huddle/gap pick on every play** — previously the gap selector only showed
      when the user was the ball carrier, so it was skipped on ~half the plays.
      Now every play asks for the hole (your hole if you carry it, otherwise where
      the ball goes).
    - **Football icon** — a small football now floats above whoever has the ball
      (QB pre-snap, then the ball carrier) so the user can always follow it.
    - **Live SPRINT button** — the old unexplained "GO" is relabeled "SPRINT" and
      the live hint explains: steer ◀ ▶, hold SPRINT to run faster.
21. **Removed live steering entirely** (2026-06-26) — supersedes the SPRINT/steer
    work above. Since the user already picks the gap pre-snap, that's the decision;
    the back now runs the chosen hole automatically (AI: hit the hole, then climb
    to daylight). Removed the ◀ / SPRINT / ▶ row, swipe-to-steer, and arrow/burst
    keyboard during the live play. Arrows now only move the gap selector. The
    player just watches the result of their pre-snap read.
22. **SPRINT back (speed only), realism & beginner coaching** (2026-06-26):
    - **SPRINT button is back, no steering** — a single "HOLD TO SPRINT" button
      (and hold Space) gives the ball carrier a ~25% speed burst through the hole.
      There is still no directional steering; the back auto-runs the chosen gap.
      The button only shows when the user is the ball carrier.
    - **Speed settings re-tiered** — the old "Slow" is now the default **Normal**
      (mult 0.6) and a new **Slower** (0.4) is even gentler. Fast is now 1.0.
    - **Realistic handoff** — the QB now reverse-pivots *back* to meet the deep
      back instead of standing still. Mesh point is deeper on lead/power so the TB
      takes the ball **behind** the FB and can follow him through the hole (it's no
      longer a straight sprint up past the FB). Dive mesh stays shallow/quick.
    - **TB fake on dives** — when the user is the TB on a dive (e.g. 22, FB carries)
      the gap picker now asks them to **fake**: pick a hole on the *other* side of
      the ball. Faking farther away pulls more defenders (0/1/2 linebackers/DBs
      chase the faker), which frees the real runner for more yards. The AI TB does
      the same automatically when the user is the FB.
    - **Coaching rewritten for an 11-year-old** — removed football jargon and
      tackler/position names; feedback is now plain and encouraging ("A defender
      got you behind the line — that's okay! Hold SPRINT the moment you get the
      ball…"), with specific fake feedback ("you pulled TWO defenders — he got X!").

23. **Fake/sprint/cadence fixes** (2026-06-26):
    - **Real runner no longer follows the fake** — the gap selector reuses
      `sim.gapX`, so after a TB locked a fake the FB was running to the *fake*
      hole. `lockFakeFromSelection` now restores `gapX` to the play's real hole.
    - **SPRINT reliability** — handoff is now proximity-based (the QB hands off
      when he reaches the back) so the back no longer freezes at the mesh waiting
      on a timer; the burst is stronger (1.6×); the button uses pointer capture so
      holding keeps working if the finger/mouse drifts off it.
    - **Cadence tracks game speed** — the HUT count interval now scales with the
      speed setting (Normal ×1, Slower ×1.5, Fast ×0.6) on top of a slower base.

24. **Real football rules, touchdowns, and replay** (2026-06-26):
    - **Touchdown bug fixed** — the carrier's y was clamped to its radius, so the
      old `y <= 10` end-zone test could never fire and no run ever scored. The end
      of a play is now: crossed the (visible) goal line → TD; broke free off the
      top → big gain; otherwise tackled.
    - **Down & distance + field position** — a possession now starts 1st & 10 on
      the own 25 and drives toward the 100. Each play moves the ball by the yards
      gained; cross the line to gain → first down (4 fresh tries); reach the 100 →
      touchdown (6 pts, new drive); fail on 4th → turnover on downs (new drive).
      A blown snap is a 5-yard penalty that replays the down. A session is 12
      snaps; results show points, TDs, first downs, total yards, read %.
    - **The field now teaches it** — the canvas draws the yellow dashed FIRST DOWN
      "line to gain" and the red END ZONE (when within ~30 yds), and the sim is
      handed `toGo`/`toGoal` so those lines match the real down & distance. The HUD
      shows DOWN ("1st & 10"), BALL ON ("OWN 25"/"OPP 30"), and POINTS. Post-play
      coaching now also explains the rule that just happened in plain language.
    - **Replay** — every play is recorded frame-by-frame; a 🔁 REPLAY button on the
      between-plays bar re-runs it over ~3.4s so the user can watch how everyone
      moved without it flying by.

25. **Sprint, teaching, touchdown & speed-order fixes** (2026-06-27):
    - **SPRINT now responds instantly** — holding SPRINT used to do nothing for
      ~1–2s because the back didn't have the ball yet (it was still meeting the QB
      at the mesh). Now holding SPRINT also speeds the back (and the QB closing to
      him) to the mesh, so the handoff happens sooner and the burst kicks in right
      away. Proximity-handoff gate lowered (`t > 0.12` → `0.05`).
    - **No more run jitter ("glitch")** — the ball carrier only steers around a
      free defender who is actually *ahead* of him and close (≤80px); defenders
      level with or behind him are ignored. This stops the left-right wobble that
      the SPRINT boost used to amplify.
    - **Break-aways are touchdowns** — if the carrier runs off the top of the
      field with nobody able to catch him, it's now a **TOUCHDOWN** (he takes it
      all the way), not a "29-yard first down". The old "BROKE = big gain" outcome
      is gone.
    - **Teach explains "I LEFT / I RIGHT"** — the Level 1 breakdown now opens by
      explaining that the call's LEFT/RIGHT tells the tight end (Y) which side to
      line up on (the strong side).
    - **Speed cycle re-ordered** — the speed button now cycles **Normal → Slow →
      Fast** (was Normal → Fast → Slower) and defaults to Normal. "Slower" renamed
      to "Slow".

26. **Smoother sprint run + numberless gaps on L2/L3** (2026-06-27):
    - **Sprint "glitch" (wobble) removed** — the ball carrier's daylight steering
      was hard-aiming at the single nearest defender, so it flipped left/right as
      the nearest one changed (the SPRINT boost made the wobble obvious). It now
      sums a closeness-weighted "drift away" from *every* free defender ahead into
      one smooth steer, so the run is fluid while sprinting.
    - **Gap numbers hidden in Read (L2) & Game (L3)** — the pre-snap hole markers
      and sliding selector still show, but the numbers are only drawn in Teach
      (L1). On the harder levels the player has to learn to read the gap by where
      it sits in the line. (A wrong pick in L2 still names the right hole after.)

27. **Sprint "glitch" (pile vibration) properly fixed** (2026-06-27): a GIF showed
    the ball carrier and the blocked pile around him vibrating while SPRINT was
    held. Root cause: the carrier's sideways steer changed abruptly each frame
    (defenders flicking in/out of the "ahead of me" test) and, because every
    blocker positions its defender relative to the ball carrier, the carrier's
    jitter shook the whole pile (the burst amplified it). Fix: past the line the
    carrier now drives **straight upfield** with the forward motion decoupled from
    a **low-pass-filtered sidestep** (a closeness-weighted blend of all free
    defenders ahead), so the steer can never snap frame-to-frame. `p.steer` is
    reset each play.

28. **Visible build version + the real collision-rumble fix** (2026-06-27):
    - **Build badge / cache-busting** — a small version badge now shows in the
      bottom-right corner (driven by `VERSION` in `main.js`). The same number is a
      `?v=NN` cache-buster on every module import and the `<script>` tag, so a
      normal reload always pulls the latest code and you can confirm a push went
      live by checking the number. Bump process documented in `architecture.md`.
    - **Collision "rumble" fixed (the real cause)** — when the lines met, each
      blocker toggled between "approach" and "engage" every frame and *teleported*
      its defender to the opposite shoulder; that feedback loop made the whole pile
      vibrate (it was never really about the SPRINT button). Engagement is now
      **sticky** (`o.locked`) and fully **eased** — the blocker rides the
      defender's ball-side shoulder and drives the pair slowly back off the ball,
      with no per-frame snapping. Carrier steer smoothing from #27 stays.

## Open / not yet done

- Per-position coaching for the **rest of the offense** (currently the carrier
  flow is the most developed; blockers go straight to cadence with their job shown).
- The **full defense package** (gaps A–D, technique numbers, stunts, coverages
  Cover 3 "RED" / Cover 1 "BLACK", ~20 blitzes). Defense is "Coming soon".
