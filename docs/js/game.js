import { Sim } from "./sim.js";
import { PLAYS, assignmentFor } from "./plays.js";
import { Storage } from "./storage.js";
import { SFX } from "./audio.js";

const $ = (id) => document.getElementById(id);

const DESC = {
  QB: "Quarterback - take the snap and hand off.",
  FB: "Fullback - dive or lead block.",
  TB: "Tailback - the main ball carrier.",
  LT: "Left Tackle - block the edge.",
  LG: "Left Guard - block or pull.",
  C: "Center - snap it, block the nose.",
  RG: "Right Guard - block or pull.",
  RT: "Right Tackle - block the edge.",
  Y: "Tight End - block or seal the edge.",
  X: "Split End - stalk block outside.",
  Z: "Flanker - stalk block outside.",
};

// Readable defender names for post-play coaching explanations.
// Picker layout (percent of the formation box).
const OFF_CHIPS = [
  { l: "X", x: 7, y: 34 }, { l: "Z", x: 93, y: 34 },
  { l: "LT", x: 31, y: 40 }, { l: "LG", x: 41, y: 40 }, { l: "C", x: 50, y: 40 },
  { l: "RG", x: 59, y: 40 }, { l: "RT", x: 69, y: 40 }, { l: "Y", x: 79, y: 40 },
  { l: "QB", x: 50, y: 57 }, { l: "FB", x: 50, y: 74 }, { l: "TB", x: 50, y: 91 },
];
const DEF_CHIPS = [
  { l: "E", x: 32, y: 30 }, { l: "N", x: 50, y: 30 }, { l: "E", x: 68, y: 30 },
  { l: "R", x: 26, y: 58 }, { l: "S", x: 40, y: 58 }, { l: "M", x: 50, y: 58 }, { l: "W", x: 60, y: 58 }, { l: "B", x: 74, y: 58 },
  { l: "LC", x: 12, y: 86 }, { l: "H", x: 50, y: 86 }, { l: "RC", x: 88, y: 86 },
];

const LEVEL_FACTOR = { 1: 0.5, 2: 0.7, 3: 1.0 };
// "Normal" is the old "Slow" pace; "Slower" is an even gentler setting for new players.
const SPEED_STATES = [
  { id: "slower", label: "&#128034; Slower", mult: 0.4 },
  { id: "normal", label: "&#9654; Normal", mult: 0.6 },
  { id: "fast", label: "&#9889; Fast", mult: 1.0 },
];

export const Game = {
  init() {
    this.sim = new Sim($("field"));
    this.sim.onEnd = (r) => this.onPlayEnd(r);
    this.label = null;
    this.level = 2;
    this.speedIdx = 1;
    this.timers = [];
    this.buildPickers();
    this.bindUI();
    this.refreshHome();
    this.show("home");
  },

  // ---------- helpers ----------
  show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
    if (id !== "play") { this.clearTimers(); this.sim.stop(); }
  },
  timer(ms, fn) { const t = setTimeout(fn, ms); this.timers.push(t); return t; },
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; },
  refreshHome() { $("bestHole").textContent = Storage.bestDrive(); },

  // ---------- pickers ----------
  buildPickers() {
    const off = $("offBox"); off.innerHTML = "";
    OFF_CHIPS.forEach((c) => {
      const el = document.createElement("div");
      el.className = "fchip pickable"; el.textContent = c.l; el.dataset.l = c.l;
      el.style.left = c.x + "%"; el.style.top = c.y + "%";
      el.onclick = () => this.pick(c.l, el);
      off.appendChild(el);
    });
    const def = $("defBox");
    DEF_CHIPS.forEach((c) => {
      const el = document.createElement("div");
      el.className = "fchip def lock"; el.textContent = c.l;
      el.style.left = c.x + "%"; el.style.top = c.y + "%";
      def.appendChild(el);
    });
  },
  pick(label, el) {
    SFX.tap();
    this.label = label;
    document.querySelectorAll("#offBox .fchip").forEach((c) => c.classList.remove("sel"));
    el.classList.add("sel");
    $("pickedTag").innerHTML = "<b>" + label + "</b> &mdash; " + DESC[label];
    $("startPlayBtn").disabled = false;
  },

  // ---------- UI wiring ----------
  bindUI() {
    $("startBtn").onclick = () => { SFX.resume(); SFX.tap(); this.show("setup"); };
    $("setupHome").onclick = () => this.show("home");
    $("playHome").onclick = () => this.show("home");
    document.querySelectorAll("#lvlPicks .lvl").forEach((l) => {
      l.onclick = () => { SFX.tap(); this.level = parseInt(l.dataset.lvl, 10); document.querySelectorAll("#lvlPicks .lvl").forEach((x) => x.classList.remove("sel")); l.classList.add("sel"); };
    });
    document.querySelector('#lvlPicks .lvl[data-lvl="2"]').classList.add("sel");
    $("startPlayBtn").onclick = () => { if (this.label) this.startDrive(); };
    $("resAgain").onclick = () => this.startDrive();
    $("resHome").onclick = () => { this.refreshHome(); this.show("home"); };
    $("snapBtn").onclick = () => this.onSnap();
    $("speedBtn").onclick = () => this.cycleSpeed();
    this.updateSpeedBtn();

    // gap selection (ball carrier)
    $("gapL").onclick = () => { if ($("gapRow").classList.contains("active")) { SFX.tap(); this.sim.moveGap(-1); } };
    $("gapR").onclick = () => { if ($("gapRow").classList.contains("active")) { SFX.tap(); this.sim.moveGap(1); } };
    $("gapReady").onclick = () => this.gapReady();

    // advance to the next play (after reading the result)
    $("nextBtn").onclick = () => this.advancePlay();

    // SPRINT: hold to give the ball carrier a speed burst (no steering).
    // Capture the pointer so holding keeps working even if the finger/mouse
    // drifts off the small button mid-run.
    const sb = $("sprintBtn");
    sb.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { sb.setPointerCapture(e.pointerId); } catch (_) {}
      this.sim.setBurst(true);
    });
    const stopBurst = () => this.sim.setBurst(false);
    sb.addEventListener("pointerup", stopBurst);
    sb.addEventListener("pointercancel", stopBurst);
    sb.addEventListener("lostpointercapture", stopBurst);

    // keyboard: arrows move the gap selector; Space/Enter confirms the active step;
    // during the live run, holding Space sprints.
    window.addEventListener("keydown", (e) => {
      if (!$("play").classList.contains("active")) return;
      const gap = $("gapRow").classList.contains("active");
      if (e.code === "ArrowLeft") { if (gap) { SFX.tap(); this.sim.moveGap(-1); } }
      else if (e.code === "ArrowRight") { if (gap) { SFX.tap(); this.sim.moveGap(1); } }
      else if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (gap) this.gapReady();
        else if ($("nextRow").classList.contains("active")) this.advancePlay();
        else if ($("snapRow").classList.contains("active")) this.onSnap();
        else if ($("sprintRow").classList.contains("active")) this.sim.setBurst(true);
      }
    });
    window.addEventListener("keyup", (e) => { if (e.code === "Space" || e.code === "Enter") this.sim.setBurst(false); });
    window.addEventListener("resize", () => { if (this.sim.phase === "pre") this.sim.measure(); });
  },

  cycleSpeed() { this.speedIdx = (this.speedIdx + 1) % SPEED_STATES.length; this.updateSpeedBtn(); this.applyTimeScale(); SFX.tap(); },
  updateSpeedBtn() { $("speedBtn").innerHTML = SPEED_STATES[this.speedIdx].label; },
  applyTimeScale() { this.sim.setTimeScale(LEVEL_FACTOR[this.level] * SPEED_STATES[this.speedIdx].mult); },

  // ---------- drive ----------
  startDrive() {
    this.order = [...PLAYS].sort(() => Math.random() - 0.5);
    this.idx = 0;
    this.driveYards = 0; this.tds = 0; this.streak = 0; this.bestStreak = 0; this.correctCount = 0; this.xpGain = 0;
    $("pChip").textContent = this.label + " \u00b7 L" + this.level;
    this.show("play");
    this.nextPlay();
  },

  nextPlay() {
    this.clearTimers();
    const play = this.order[this.idx];
    const side = Math.random() < 0.5 ? "R" : "L";
    this.snapCount = 1 + Math.floor(Math.random() * 3); // play is "ON 1/2/3"
    this.cur = { play, side };
    this.playerCorrect = true;
    this.applyTimeScale();
    this.sim.setup(play, side, this.label, true, LEVEL_FACTOR[this.level]);
    this.sim.gameLevel = this.level; // drives how forgiving the defense is

    $("gapRow").classList.remove("active");
    $("snapRow").classList.remove("active");
    $("sprintRow").classList.remove("active");
    $("nextRow").classList.remove("active");

    $("pYards").textContent = this.driveYards;
    $("pPlay").textContent = (this.idx + 1) + "/" + this.order.length;
    $("pStreak").textContent = this.streak + "\uD83D\uDD25";
    const callTxt = "I " + (side === "R" ? "RIGHT" : "LEFT") + " \u00b7 " + play.call + " \u00b7 ON " + this.snapCount;
    $("pCall").textContent = callTxt;
    const myAssign = assignmentFor(play, this.label, side);
    $("readChoices").classList.remove("active");
    $("pTask").textContent = this.level === 1
      ? this.teachBreakdown(play, myAssign)
      : "You are " + this.label + " \u2014 " + myAssign + ".";
    $("pTask").classList.add("flash"); this.timer(20, () => $("pTask").classList.remove("flash"));

    // Every play starts with the huddle/gap pick: identify where the ball goes
    // (your hole if you carry it, otherwise the hole the play hits).
    this.startGapSelect();
  },

  // ---------- gap select ----------
  startGapSelect() {
    this.sim.enterGapSelect(this.level === 1);
    $("gapRow").classList.add("active");
    $("snapRow").classList.remove("active");
    $("sprintRow").classList.remove("active");
    const hole = this.cur.play.hole;
    const youCarry = this.sim.isPlayerCarrier;
    const youFake = this.sim.isFaker;
    const fakeHole = this.sim.gapCorrectHole; // the green target on a fake
    if (this.level === 1) {
      // Teach: keep the full breakdown up top, put the simple action below.
      if (youFake) {
        $("pTask").textContent = "You FAKE on this one! Run the OTHER way to trick the defense so the fullback has room.";
        $("pHint").textContent = "Slide \u25c0 \u25b6 to the green " + fakeHole + " (far from the ball), then READY.";
      } else if (youCarry) {
        $("pHint").textContent = "Slide \u25c0 \u25b6 to the green " + hole + " (YOUR hole), then READY.";
      } else {
        $("pHint").textContent = "Slide \u25c0 \u25b6 to the green " + hole + " (where the ball goes), then READY.";
      }
    } else {
      $("pHint").textContent = "Pick the hole \u2014 \u25c0 \u25b6 then READY";
      $("pTask").textContent = youFake
        ? "You're faking! Pick a hole on the FAR side, away from the ball, to pull the defense."
        : (youCarry
          ? "Which hole do YOU run on " + this.cur.play.num + "? Slide there."
          : "Where does the ball go on " + this.cur.play.num + "? Pick that hole.");
    }
  },

  // A simple, kid-friendly breakdown of the whole play for Teach (Level 1).
  teachBreakdown(play, myAssign) {
    const hole = play.hole;
    if (this.label === play.carrier) {
      if (play.type === "DIVE") return play.num + " DIVE: you're the " + this.label + ". Take the quick handoff and hit the " + hole + " hole FAST and low.";
      if (play.type === "LEAD") return play.num + " LEAD: you're the " + this.label + ". Your fullback blocks ahead \u2014 follow right behind him through the " + hole + " hole.";
      return play.num + " POWER: you're the " + this.label + ". Follow the pulling guard around through the " + hole + " hole.";
    }
    return play.num + ": you're the " + this.label + ". Your job is to " + myAssign.toLowerCase() + ". The ball goes through the " + hole + " hole.";
  },

  gapReady() {
    if (!$("gapRow").classList.contains("active")) return;
    const picked = this.sim.selectedHole();
    const realHole = this.cur.play.hole;

    if (this.sim.isFaker) {
      // A fake must go to the OTHER side of the ball (different odd/even parity).
      const sameSide = (picked % 2) === (realHole % 2);
      if (sameSide) {
        SFX.bad();
        this.playerCorrect = false;
        this.streak = 0; $("pStreak").textContent = this.streak + "\uD83D\uDD25";
        $("pHint").textContent = "Fake AWAY from the ball \u2014 pick a hole on the OTHER side of the center.";
        return;
      }
      SFX.tap();
      this.sim.lockFakeFromSelection();
      $("gapRow").classList.remove("active");
      this.startCadence();
      return;
    }

    if (picked !== realHole) {
      SFX.bad();
      this.playerCorrect = false; // missed the gap at least once -> counts against READS
      this.streak = 0; $("pStreak").textContent = this.streak + "\uD83D\uDD25";
      $("pHint").textContent = this.level === 3
        ? "Wrong gap \u2014 check the play number and try again."
        : "That's the " + picked + " hole. " + this.cur.play.num + " hits the " + realHole + " hole.";
      return;
    }
    SFX.tap();
    this.sim.lockGap();
    $("gapRow").classList.remove("active");
    this.startCadence();
  },

  // ---------- cadence ----------
  // The call was "ON <snapCount>". Cadence runs DOWN, SET, HUT 1, HUT 2, ...
  // and the player must snap exactly on "HUT <snapCount>". Early = false start,
  // late = the play breaks down.
  startCadence() {
    $("snapRow").classList.add("active");
    $("pHint").textContent = "Snap on \u201cHUT " + this.snapCount + "\u201d! (tap SNAP or Space)";
    $("pTask").textContent = this.level === 1
      ? "Almost! Wait for \u201cHUT " + this.snapCount + ",\u201d then tap SNAP to start the play."
      : "Listen for the count \u2014 the ball is snapped ON " + this.snapCount + ".";
    this.snapped = false;

    const beats = ["DOWN", "SET"];
    for (let i = 1; i <= this.snapCount; i++) beats.push("HUT " + i);
    this.targetBeat = beats.length - 1; // the final HUT is the snap beat
    this.beatIdx = -1;
    // Slower, clearer cadence - especially in Teach so a beginner can follow it.
    // It also tracks the game-speed setting so a slower game has a slower count.
    const base = this.level === 1 ? 1300 : (this.level === 2 ? 1000 : 800);
    const speedFactor = 0.6 / SPEED_STATES[this.speedIdx].mult; // Normal=1, Slower=1.5, Fast=0.6
    const d = Math.round(base * speedFactor);
    const hint = this.level === 1;

    const step = () => {
      this.beatIdx++;
      if (this.beatIdx >= beats.length) {
        if (!this.snapped) this.failCadence("late"); // ran past the count
        return;
      }
      const w = beats[this.beatIdx];
      const isTarget = this.beatIdx === this.targetBeat;
      const cw = $("cadWord");
      cw.textContent = w; cw.classList.toggle("tgt", isTarget && hint); cw.style.opacity = "1";
      this.timer(d * 0.6, () => { if (!this.snapped) cw.style.opacity = "0"; });
      if (w.indexOf("HUT") === 0) SFX.hut(); else SFX.snap();
      this.timer(d, step);
    };
    step();
  },

  onSnap() {
    if (this.snapped || !$("snapRow").classList.contains("active")) return;
    this.snapped = true;
    const beat = this.beatIdx;
    this.clearTimers();
    $("cadWord").style.opacity = "0";

    if (beat < this.targetBeat) { this.failCadence("early"); return; }
    if (beat > this.targetBeat) { this.failCadence("late"); return; }

    this.timing = "perfect"; // snapped on the right count
    $("snapRow").classList.remove("active");
    SFX.snap();
    if (this.sim.isPlayerCarrier) {
      $("sprintRow").classList.add("active");
      $("pHint").textContent = "You've got the ball! Hold SPRINT to burst through your hole for more yards.";
    } else if (this.sim.isFaker) {
      $("pHint").textContent = "Watch yourself fake the other way and pull the defense \u2014 it frees the runner!";
    } else {
      $("pHint").textContent = "Watch the ball \u2014 your block springs the runner!";
    }
    this.applyTimeScale();
    this.sim.begin();
  },

  // A blown snap count ends the play before it starts.
  failCadence(type) {
    this.snapped = true;
    this.clearTimers();
    $("snapRow").classList.remove("active");
    $("cadWord").style.opacity = "0";
    SFX.bad();
    this.streak = 0;
    $("pStreak").textContent = this.streak + "\uD83D\uDD25";
    const early = type === "early";
    this.popCombo(early ? "FALSE START! \uD83D\uDEA9" : "TOO LATE! \uD83D\uDEA9", "#ff7b7b");
    $("pTask").textContent = early
      ? "\uD83D\uDEA9 Too early \u2014 false start. Wait for \u201cHUT " + this.snapCount + "\u201d."
      : "\uD83D\uDEA9 Too late \u2014 the play broke down. Snap right on \u201cHUT " + this.snapCount + "\u201d.";
    $("pTask").classList.add("flash"); this.timer(20, () => $("pTask").classList.remove("flash"));
    this.endPlayPause();
  },

  // ---------- result of one play ----------
  onPlayEnd(r) {
    this.driveYards += r.yards;
    $("pYards").textContent = this.driveYards;

    let score = 0;
    if (this.playerCorrect) { score += 10; this.correctCount++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); }
    if (this.timing === "perfect") score += 5; else if (this.timing === "good") score += 2; else score -= 2;
    score += Math.max(0, r.yards);
    if (r.td) { score += 20; this.tds++; }
    this.xpGain += Math.max(0, score);

    // feedback
    let head, color;
    if (r.td) { head = "TOUCHDOWN! \uD83C\uDFC8"; color = "#ffd23f"; SFX.td(); }
    else if (this.playerCorrect && r.yards > 4) { head = "+" + r.yards + " YARDS!"; color = "#27d17c"; SFX.big(); }
    else if (r.yards >= 0) { head = "+" + r.yards + " yds"; color = "#fff"; SFX.block(); }
    else { head = r.yards + " yds (loss)"; color = "#ff4d4d"; SFX.bad(); }
    this.popCombo(head, color);

    // Always explain WHAT happened and HOW to do better - that's the whole point.
    let task = this.explainPlay(r);
    if (!this.playerCorrect && !this.sim.isFaker) task += " (Remember: " + this.cur.play.num + " hits the " + this.cur.play.hole + " hole.)";
    $("pTask").textContent = task;
    $("pTask").classList.add("flash"); this.timer(20, () => $("pTask").classList.remove("flash"));
    $("pStreak").textContent = this.streak + "\uD83D\uDD25";

    this.endPlayPause();
  },

  // Pause after a play so the coaching stays on screen until the user taps NEXT.
  endPlayPause() {
    this.sim.setBurst(false);
    $("gapRow").classList.remove("active");
    $("snapRow").classList.remove("active");
    $("sprintRow").classList.remove("active");
    const last = (this.idx + 1) >= this.order.length;
    $("nextBtn").innerHTML = last ? "\u25b6 SEE RESULTS" : "\u25b6 NEXT PLAY";
    $("nextRow").classList.add("active");
    $("pHint").textContent = "Read what happened, then tap NEXT (or press Space).";
  },

  advancePlay() {
    if (!$("nextRow").classList.contains("active")) return;
    SFX.tap();
    $("nextRow").classList.remove("active");
    this.idx++;
    if (this.idx >= this.order.length) this.showResults(); else this.nextPlay();
  },

  // Plain, encouraging coaching an 11-year-old can follow - no football jargon.
  explainPlay(r) {
    const youCarry = this.sim.isPlayerCarrier;

    if (r.faker) {
      const ran = r.yards;
      if (r.pulled >= 2) return "\uD83C\uDFAD Awesome fake! You ran the other way and TWO defenders chased you. That left the runner wide open \u2014 he got " + ran + " yards!";
      if (r.pulled === 1) return "\uD83C\uDFAD Good fake \u2014 ONE defender chased you. Run even FARTHER from the ball to trick more of them. (The runner got " + ran + ".)";
      return "Nobody fell for it \u2014 you faked too close to the ball. Run to the FAR side, away from where the ball is going, to trick the defenders. (The runner got " + ran + ".)";
    }

    if (r.td) {
      return youCarry
        ? "\uD83C\uDFC8 Touchdown! You ran through your hole and nobody could catch you. Awesome!"
        : "\uD83C\uDFC8 Touchdown! Your block helped the runner score. Great job!";
    }

    if (youCarry) {
      if (r.yards <= 0) return "A defender got you behind the line for " + r.yards + ". That's okay \u2014 it happens! Next time hold SPRINT the moment you get the ball so you shoot through the hole before it closes.";
      if (r.yards <= 3) return "You got " + r.yards + " yards, but a defender filled the hole fast. Hold SPRINT right away to burst through quicker and get more.";
      if (r.yards <= 7) return "Nice \u2014 " + r.yards + " yards! You ran through the right hole. Hold SPRINT to go even faster and pick up extra yards.";
      return "Great run \u2014 " + r.yards + " yards! You hit the hole fast and zoomed past the defense. \uD83C\uDFC8";
    }

    // blocker
    if (r.yards <= 0) return "The runner got stopped. Your job is to push your defender out of the way \u2014 stay in front of him longer to open the hole.";
    return "Nice block! The runner followed you for " + r.yards + " yards. " + (r.yards > 6 ? "You opened a big hole!" : "Stay on your block a little longer to make the hole even bigger.");
  },

  popCombo(txt, color) {
    const c = $("pCombo"); c.textContent = txt; c.style.color = color;
    c.style.animation = "none"; void c.offsetWidth; c.style.animation = "pop 1.4s ease";
  },

  // ---------- results ----------
  showResults() {
    this.sim.stop();
    const acc = Math.round((this.correctCount / this.order.length) * 100);
    const best = Math.max(Storage.bestDrive(), this.driveYards);
    Storage.setBestDrive(best); Storage.addXP(this.xpGain);
    $("resTitle").textContent = this.tds > 0 ? "DRIVE COMPLETE! \uD83C\uDFC8" : "DRIVE COMPLETE!";
    $("resScore").textContent = this.driveYards;
    $("resUnit").textContent = "TOTAL YARDS";
    $("resRow").innerHTML =
      this.card(this.tds, "TDs") +
      this.card(acc + "%", "READS") +
      this.card(this.bestStreak + "\uD83D\uDD25", "BEST STREAK") +
      this.card("+" + this.xpGain, "XP");
    this.show("result");
  },
  card(b, s) { return '<div class="resCard"><b>' + b + "</b><span>" + s + "</span></div>"; },
};
