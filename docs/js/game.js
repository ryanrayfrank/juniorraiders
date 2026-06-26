import { Sim } from "./sim.js";
import { PLAYS, choicesFor, assignmentFor, groupOf } from "./plays.js";
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
const SPEED_STATES = [
  { id: "slow", label: "&#128034; Slow", mult: 0.6 },
  { id: "normal", label: "&#9654; Normal", mult: 1.0 },
  { id: "fast", label: "&#9889; Fast", mult: 1.5 },
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

    // steering
    const press = (el, dir) => {
      const on = (e) => { e.preventDefault(); this.sim.setSteer(dir); };
      const off = () => this.sim.setSteer(0);
      el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointerleave", off); el.addEventListener("pointercancel", off);
    };
    press($("steerL"), -1); press($("steerR"), 1);
    $("burstBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); this.sim.setBurst(true); });
    $("burstBtn").addEventListener("pointerup", () => this.sim.setBurst(false));
    $("burstBtn").addEventListener("pointerleave", () => this.sim.setBurst(false));

    // field swipe / drag to steer
    const fw = $("fieldWrap");
    fw.addEventListener("pointerdown", (e) => { if (!this.sim.isPlayerCarrier || this.sim.phase !== "live") return; const r = fw.getBoundingClientRect(); this._drag = e.clientX; this.sim.setSteer(e.clientX < r.left + r.width / 2 ? -1 : 1); });
    fw.addEventListener("pointermove", (e) => { if (this._drag == null) return; const dx = e.clientX - this._drag; if (Math.abs(dx) > 6) this.sim.setSteer(dx < 0 ? -1 : 1); });
    fw.addEventListener("pointerup", () => { this._drag = null; this.sim.setSteer(0); });
    fw.addEventListener("pointerleave", () => { this._drag = null; this.sim.setSteer(0); });

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (!$("play").classList.contains("active")) return;
      if (e.code === "ArrowLeft") this.sim.setSteer(-1);
      else if (e.code === "ArrowRight") this.sim.setSteer(1);
      else if (e.code === "ArrowUp") this.sim.setBurst(true);
      else if (e.code === "Space") { e.preventDefault(); if ($("snapRow").classList.contains("active")) this.onSnap(); else this.sim.setBurst(true); }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") this.sim.setSteer(0);
      if (e.code === "ArrowUp" || e.code === "Space") this.sim.setBurst(false);
    });
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
    this.cur = { play, side };
    this.playerCorrect = true;
    this.applyTimeScale();
    this.sim.setup(play, side, this.label, true, LEVEL_FACTOR[this.level]);

    $("pYards").textContent = this.driveYards;
    $("pPlay").textContent = (this.idx + 1) + "/" + this.order.length;
    $("pStreak").textContent = this.streak + "\uD83D\uDD25";
    const callTxt = "I " + (side === "R" ? "RIGHT" : "LEFT") + " \u00b7 " + play.call;
    $("pCall").textContent = callTxt;
    const myAssign = assignmentFor(play, this.label, side);
    $("pTask").textContent = "You are " + this.label + ". What is your job?";
    $("pTask").classList.add("flash"); this.timer(20, () => $("pTask").classList.remove("flash"));

    this.doReadStep(play, side, myAssign);
  },

  doReadStep(play, side, myAssign) {
    $("snapRow").classList.remove("active");
    $("steerRow").classList.remove("active");
    $("pHint").textContent = "Pick the right assignment for your position.";
    const box = $("readChoices"); box.innerHTML = ""; box.classList.add("active");
    const { correct, options } = choicesFor(play, this.label, side);
    this.curCorrect = correct;
    options.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "choice"; b.textContent = opt;
      if (this.level === 1 && opt === correct) b.classList.add("hint"); // Teach: show the answer
      b.onclick = () => this.onReadChoice(b, opt, correct);
      box.appendChild(b);
    });
  },

  onReadChoice(btn, opt, correct) {
    const box = $("readChoices");
    if (box.dataset.done) return; box.dataset.done = "1";
    const right = opt === correct;
    this.playerCorrect = right;
    btn.classList.add(right ? "right" : "wrong");
    if (!right) {
      [...box.children].forEach((c) => { if (c.textContent === correct) c.classList.add("right"); });
      SFX.bad(); this.streak = 0;
    } else { SFX.big(); }
    box.querySelectorAll("button").forEach((b) => (b.disabled = true));

    // re-setup the sim with the real consequence of the read, then go to cadence
    this.sim.setup(this.cur.play, this.cur.side, this.label, right, LEVEL_FACTOR[this.level]);
    this.applyTimeScale();
    this.timer(right ? 650 : 1100, () => { box.classList.remove("active"); box.dataset.done = ""; this.startCadence(); });
  },

  // ---------- cadence ----------
  startCadence() {
    $("snapRow").classList.add("active");
    $("pHint").textContent = "Snap on \u201cHUT\u201d! (tap SNAP or press Space)";
    this.snapped = false; this.hutTime = null;
    const d = this.level === 3 ? 430 : 620;
    const flash = (w, tgt) => { const cw = $("cadWord"); cw.textContent = w; cw.classList.toggle("tgt", !!tgt); cw.style.opacity = "1"; this.timer(440, () => (cw.style.opacity = "0")); };
    this.timer(120, () => { flash("DOWN"); SFX.snap(); });
    this.timer(120 + d, () => { flash("SET"); SFX.snap(); });
    this.timer(120 + 2 * d, () => { flash("HUT!", true); this.hutTime = performance.now(); SFX.hut(); });
    this.timer(120 + 2 * d + 1700, () => { if (!this.snapped) this.onSnap(); });
  },

  onSnap() {
    if (this.snapped || !$("snapRow").classList.contains("active")) return;
    this.snapped = true;
    this.clearTimers();
    $("snapRow").classList.remove("active");
    $("cadWord").style.opacity = "0";
    SFX.snap();

    if (this.hutTime == null) { this.timing = "early"; }
    else { const dl = performance.now() - this.hutTime; this.timing = dl < 650 ? "perfect" : "good"; }

    if (this.sim.isPlayerCarrier) {
      $("steerRow").classList.add("active");
      $("pHint").textContent = "Steer through the hole \u2014 \u25c0 \u25b6 or swipe, GO to burst!";
    } else {
      $("pHint").textContent = "Watch your block spring the runner!";
    }
    this.applyTimeScale();
    this.sim.begin();
  },

  // ---------- result of one play ----------
  onPlayEnd(r) {
    this.sim.setSteer(0); this.sim.setBurst(false);
    $("steerRow").classList.remove("active");
    this.driveYards += r.yards;
    $("pYards").textContent = this.driveYards;

    let score = 0;
    if (this.playerCorrect) { score += 10; this.correctCount++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); }
    if (this.timing === "perfect") score += 5; else if (this.timing === "good") score += 2; else score -= 2;
    score += Math.max(0, r.yards);
    if (r.td) { score += 20; this.tds++; }
    this.xpGain += Math.max(0, score);

    // feedback
    const assign = assignmentFor(this.cur.play, this.label, this.cur.side);
    let head, color;
    if (r.td) { head = "TOUCHDOWN! \uD83C\uDFC8"; color = "#ffd23f"; SFX.td(); }
    else if (this.playerCorrect && r.yards > 4) { head = "+" + r.yards + " YARDS!"; color = "#27d17c"; SFX.big(); }
    else if (r.yards >= 0) { head = "+" + r.yards + " yds"; color = "#fff"; SFX.block(); }
    else { head = r.yards + " yds (loss)"; color = "#ff4d4d"; SFX.bad(); }
    this.popCombo(head, color);

    const mark = this.playerCorrect ? "\u2714 " : "\u2718 ";
    let task = mark + this.label + ": " + assign + ".";
    if (!this.playerCorrect) task += " " + this.cur.play.coach;
    if (this.timing === "early") task += " (False start \u2013 wait for HUT.)";
    $("pTask").textContent = task;
    $("pTask").classList.add("flash"); this.timer(20, () => $("pTask").classList.remove("flash"));
    $("pStreak").textContent = this.streak + "\uD83D\uDD25";

    this.idx++;
    const delay = r.td ? 2200 : 1900;
    this.timer(delay, () => { if (this.idx >= this.order.length) this.showResults(); else this.nextPlay(); });
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
