// ===========================================================================
// sim.js - the canvas play simulation.
//
// Every player is real simulation state. At the snap the offensive line opens
// the hole and blocks (each blocker gets BETWEEN his man and the ball), backs
// carry/lead, and the defense pursues the live ball. The play ends when a free
// (unblocked) defender reaches the ball carrier - so the OUTCOME is emergent:
// nobody is ever "run through," and yards = how far the carrier actually got.
// ===========================================================================

import { buildFormation, holeX, PLAYER_R } from "./formations.js";
import { assignmentFor, actionType } from "./plays.js";

const SPEED = { QB: 140, FB: 150, TB: 155, OL: 135, WR: 150, DL: 120, LB: 150, DB: 170 };

// Holes left-to-right across the line. Odd holes are left of center, even right.
const HOLE_ORDER = { 5: 0, 3: 1, 1: 2, 2: 3, 4: 4, 6: 5 };
// The best hole to fake toward: the one on the OPPOSITE side, farthest from the ball.
function farOppositeHole(realHole) {
  const opp = [1, 2, 3, 4, 5, 6].filter((h) => h % 2 !== realHole % 2);
  opp.sort((a, b) => Math.abs(HOLE_ORDER[b] - HOLE_ORDER[realHole]) - Math.abs(HOLE_ORDER[a] - HOLE_ORDER[realHole]));
  return opp[0];
}

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

export class Sim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.running = false;
    this.timeScale = 1;
    this.burst = false;
    this.onEnd = null;
    this.onReplayEnd = null;
    this.gaps = null;
    this.selGapIdx = 0;
    this.record = [];      // per-frame snapshots so a play can be re-watched
    this.toGo = 10;        // yards to the first-down line (drawn on the field)
    this.toGoal = 70;      // yards to the end zone (drawn when close enough)
    this.loop = this.loop.bind(this);

    // Keep the drawing buffer matched to the on-screen size at all times so
    // players always render as true circles. The field's display height changes
    // as the control rows toggle (read choices -> gap select -> snap -> steer);
    // without this the fixed-resolution bitmap gets stretched into ellipses.
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => { if (this.W) { this.measure(); this.render(); } });
      this.ro.observe(canvas);
    }
  }

  // ---- layout ----
  // Re-measures the canvas to its current display size. If players already
  // exist (mid-play resize), every position is rescaled proportionally so the
  // play stays visually consistent while the circles stay perfectly round.
  measure() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const newW = Math.max(280, Math.round(rect.width));
    const newH = Math.max(300, Math.round(rect.height));
    const oldW = this.W, oldH = this.H;
    this.W = newW; this.H = newH;
    this.canvas.width = Math.round(newW * dpr);
    this.canvas.height = Math.round(newH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.losY = Math.round(this.H * 0.6);
    this.pxPerYard = this.losY / 30;

    if (oldW && oldH && (oldW !== newW || oldH !== newH) && this.players) {
      const sx = newW / oldW, sy = newH / oldH;
      for (const p of this.players) { p.x *= sx; p.y *= sy; p.hx *= sx; p.hy *= sy; }
      if (this.gaps) for (const g of this.gaps) g.x *= sx;
      if (this.gapX != null) this.gapX *= sx;
      if (this.meshX != null) this.meshX *= sx;
      if (this.meshY != null) this.meshY *= sy;
      if (this.cx != null) this.cx *= sx;
    }
  }

  byId(id) { return this.players.find((p) => p.id === id); }

  // ---- build a play ----
  setup(play, side, playerLabel, playerCorrect, levelFactor, toGo, toGoal) {
    this.measure();
    const { offense, defense, cx, SP } = buildFormation(this.W, this.H, this.losY, side);
    this.cx = cx; this.SP = SP; this.side = side; this.play = play;
    this.levelFactor = levelFactor;
    this.toGo = (toGo != null) ? toGo : 10;       // distance to the first-down line
    this.toGoal = (toGoal != null) ? toGoal : 70; // distance to the end zone
    this.record = [];

    let id = 0;
    this.players = [...offense, ...defense];
    this.players.forEach((p) => { p.id = id++; p.vx = 0; p.vy = 0; p.engaged = false; p.engagedBy = null; p.targetId = null; p.missed = false; });
    this.offense = offense; this.defense = defense;

    this.gapX = holeX(offense, play.hole, side);
    offense.forEach((o) => { o.assignment = assignmentFor(play, o.label, side); o.action = actionType(o.assignment, o.label); o.speed = SPEED[o.role] || 140; });
    defense.forEach((d) => { d.speed = SPEED[d.role] || 150; d.pursuer = false; });

    this.assignBlocks(play);

    // The human's chosen position is the variable. A wrong read has a real cost.
    this.playerLabel = playerLabel;
    this.isPlayerCarrier = playerLabel === play.carrier;
    this.botch = false;
    const pp = offense.find((o) => o.label === playerLabel);
    this.playerAction = pp ? pp.action : null;
    if (pp) {
      if (pp.action === "CARRY" || pp.action === "HANDOFF") { if (!playerCorrect) this.botch = true; }
      else if (!playerCorrect && pp.targetId != null) { pp.targetId = null; pp.missed = true; }
    }

    // Defenders nobody blocks become pursuers (the real tacklers).
    const targeted = new Set(offense.map((o) => o.targetId).filter((x) => x != null));
    defense.forEach((d) => { d.pursuer = !targeted.has(d.id); d.chaseFake = false; });

    const qb = offense.find((o) => o.label === "QB");
    this.qb = qb;
    this.carrier = offense.find((o) => o.label === play.carrier);
    this.ball = { carrierId: qb.id, handoffAt: play.type === "DIVE" ? 0.34 : 0.62 };
    // Reverse-pivot handoff: the QB drops back to meet the deep back. On a dive
    // the mesh is shallow (quick hitter); on a lead/power it's deeper so the TB
    // takes it behind the FB and can follow him through the hole.
    this.meshX = cx; this.meshY = this.losY + (play.carrier === "FB" ? 48 : 66);

    // Fake (boot/misdirection): the non-carrying back carries out a fake to pull
    // defenders away from the ball. If the human IS the faker they pick the fake
    // gap pre-snap; otherwise the AI fakes to the far opposite hole automatically.
    this.faker = offense.find((o) => o.action === "FAKE") || null;
    this.isFaker = !!(pp && pp.action === "FAKE");
    this.fakeX = null; this.pulled = 0;
    this.gapCorrectHole = this.isFaker ? farOppositeHole(play.hole) : play.hole;
    if (this.faker && !this.isFaker) this.applyFake(farOppositeHole(play.hole));

    this.t = 0;
    this.phase = "pre";
    this.result = null;
    this.gaps = null;
    this.render();
  }

  assignBlocks(play) {
    const O = this.offense, D = this.defense;
    const taken = new Set();
    const take = (b, c) => { if (b && c) { b.targetId = c.id; taken.add(c.id); } };
    const nearest = (x, y, pool) => {
      let best = null, bd = Infinity;
      for (const d of pool) { if (taken.has(d.id)) continue; const dd = dist(d.hx, d.hy, x, y); if (dd < bd) { bd = dd; best = d; } }
      return best;
    };
    const corners = D.filter((d) => d.label === "LC" || d.label === "RC");
    const box = D.filter((d) => d.role === "DL" || d.role === "LB" || d.label === "H");

    // Receivers stalk the nearest corner.
    O.filter((o) => o.role === "WR").forEach((w) => take(w, nearest(w.hx, w.hy, corners)));
    // Fullback (lead) takes the linebacker closest to the hole.
    const fb = O.find((o) => o.label === "FB");
    if (fb && fb.action === "LEAD") take(fb, nearest(this.gapX, this.losY - 78, D.filter((d) => d.role === "LB")));
    // Pulling guard kicks out the edge defender at the hole.
    const puller = O.find((o) => o.action === "PULL");
    if (puller) take(puller, nearest(this.gapX, this.losY - 34, box));
    // Remaining linemen / TE block the nearest available box defender in front.
    O.filter((o) => o.role === "OL" && o.targetId == null && (o.action === "BLOCK" || o.action === "SEAL" || o.action === "CUTOFF"))
      .forEach((o) => take(o, nearest(o.hx, o.hy, box)));
  }

  // ---- pre-snap gap selection (ball carrier picks the hole) ----
  // Builds the six numbered holes left-to-right and lets the player slide a lane
  // selector to the gap they intend to attack, just like the original demo.
  enterGapSelect(showCorrect, correctHole) {
    const holes = [1, 2, 3, 4, 5, 6];
    this.gaps = holes
      .map((h) => ({ hole: h, x: holeX(this.offense, h, this.side) }))
      .sort((a, b) => a.x - b.x);
    this.showCorrectGap = !!showCorrect;
    if (correctHole != null) this.gapCorrectHole = correctHole;
    // Start the selector on the middle-ish gap so the player has to move it.
    this.selGapIdx = Math.floor(this.gaps.length / 2);
    this.gapX = this.gaps[this.selGapIdx].x;
    this.phase = "gapselect";
    this.render();
  }
  moveGap(dir) {
    if (this.phase !== "gapselect" || !this.gaps) return;
    this.selGapIdx = Math.max(0, Math.min(this.gaps.length - 1, this.selGapIdx + dir));
    this.gapX = this.gaps[this.selGapIdx].x;
    this.render();
  }
  selectedHole() { return this.gaps ? this.gaps[this.selGapIdx].hole : null; }
  // Lock in the chosen gap as the live running lane and clear the selector UI.
  lockGap() {
    if (this.gaps) this.gapX = this.gaps[this.selGapIdx].x;
    this.gaps = null;
    this.phase = "pre";
    this.render();
  }

  // The human chose a fake gap: the real carrier still runs the play's real
  // hole, while the human runs the fake toward the picked hole. Moving the gap
  // selector reused this.gapX, so restore it to the real hole here.
  lockFakeFromSelection() {
    const hole = this.selectedHole();
    this.applyFake(hole);
    this.gapX = holeX(this.offense, this.play.hole, this.side);
    this.gaps = null;
    this.phase = "pre";
    this.render();
  }

  // Set the fake target and decide how many defenders "bite" based on how far
  // the fake is from the ball (farther away = more defenders pulled = better).
  applyFake(fakeHole) {
    this.fakeX = holeX(this.offense, fakeHole, this.side);
    const sep = Math.abs((HOLE_ORDER[fakeHole] ?? 2) - (HOLE_ORDER[this.play.hole] ?? 3));
    this.pulled = sep >= 3 ? 2 : (sep === 2 ? 1 : 0);
    this.defense.forEach((d) => (d.chaseFake = false));
    const pool = this.defense.filter((d) => d.role === "LB" || d.role === "DB");
    pool.sort((a, b) => Math.abs(a.hx - this.fakeX) - Math.abs(b.hx - this.fakeX));
    for (let i = 0; i < this.pulled && i < pool.length; i++) pool[i].chaseFake = true;
  }

  // ---- live control ----
  begin() { this.gaps = null; this.phase = "live"; this.t = 0; this.last = 0; this.record = []; if (!this.running) { this.running = true; requestAnimationFrame(this.loop); } }
  setBurst(b) { this.burst = b; }
  setTimeScale(s) { this.timeScale = s; }

  start() { if (!this.running) { this.running = true; this.last = 0; requestAnimationFrame(this.loop); } }
  stop() { this.running = false; }

  // ---- replay: re-run the recorded frames so the user can watch it again ----
  playReplay() {
    if (!this.record || this.record.length < 2) return false;
    this.replayPos = 0;
    this.replayRate = this.record.length / 3.4; // play the whole thing back over ~3.4s
    this.phase = "replay";
    this.last = 0;
    if (!this.running) { this.running = true; requestAnimationFrame(this.loop); }
    return true;
  }
  applyFrame(idx) {
    const f = this.record[idx];
    if (!f) return;
    for (let i = 0; i < this.players.length && i < f.p.length; i++) { this.players[i].x = f.p[i].x; this.players[i].y = f.p[i].y; }
    if (f.c != null && this.ball) this.ball.carrierId = f.c;
  }
  stepReplay(dt) {
    this.replayPos += dt * this.replayRate;
    let idx = Math.floor(this.replayPos);
    if (idx >= this.record.length - 1) {
      this.applyFrame(this.record.length - 1);
      this.phase = "over";
      if (this.onReplayEnd) this.onReplayEnd();
      return;
    }
    this.applyFrame(idx);
  }

  loop(ts) {
    if (!this.running) return;
    if (!this.last) this.last = ts;
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    if (this.phase === "live") this.update(dt);
    else if (this.phase === "replay") this.stepReplay(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }

  moveToward(p, tx, ty, st, slow) {
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(p.speed * st * (slow || 1), d);
    p.x += (dx / d) * step; p.y += (dy / d) * step;
  }

  update(dt) {
    const st = dt * this.timeScale;
    this.t += st;
    // Hand off as soon as the QB reaches the back (no dead wait at the mesh),
    // with the timer as a fallback so it always happens.
    const met = this.qb && dist(this.qb.x, this.qb.y, this.carrier.x, this.carrier.y) < (this.qb.r + this.carrier.r + 5);
    const handoff = this.t >= this.ball.handoffAt || (this.t > 0.12 && met);
    if (handoff && this.ball.carrierId !== this.carrier.id) this.ball.carrierId = this.carrier.id;

    const ballX = this.carrier.x, ballY = this.carrier.y;

    // --- offense ---
    for (const o of this.offense) {
      if (o === this.carrier && handoff) continue; // carrier handled below
      if (o.label === "QB") {
        // mesh then boot fake away from the play
        if (handoff) this.moveToward(o, this.cx + (this.gapX < this.cx ? 40 : -40), this.losY + 46, st, 0.7);
        else this.moveToward(o, this.meshX, this.meshY, st, 0.8);
        continue;
      }
      if (o === this.carrier && !handoff) { this.moveToward(o, this.meshX, this.meshY - 4, st, 0.7); continue; }

      // blockers
      const tgt = o.targetId != null ? this.byId(o.targetId) : null;
      if (tgt) {
        // aim to be BETWEEN the defender and the ball
        const bx = handoff ? ballX : this.gapX, by = handoff ? ballY : this.losY - 6;
        const ang = Math.atan2(by - tgt.y, bx - tgt.x);
        const spot = { x: tgt.x + Math.cos(ang) * (o.r + tgt.r - 2), y: tgt.y + Math.sin(ang) * (o.r + tgt.r - 2) };
        if (dist(o.x, o.y, tgt.x, tgt.y) > o.r + tgt.r + 3) {
          this.moveToward(o, spot.x, spot.y, st);
        } else {
          // engaged: hold position in front of the man and drive him back, off the ball
          tgt.engaged = true; tgt.engagedBy = o.id;
          const away = Math.atan2(tgt.y - by, tgt.x - bx);
          const push = o.speed * st * 0.28;
          o.x += Math.cos(ang) * push * -0.4; o.y += Math.sin(ang) * push * -0.4;
          tgt.x = o.x + Math.cos(away) * (o.r + tgt.r - 1);
          tgt.y = o.y + Math.sin(away) * (o.r + tgt.r - 1);
        }
      } else if (o.action === "FAKE") {
        // sell the fake: sprint toward the fake gap, away from the real ball
        const fx = this.fakeX != null ? this.fakeX : o.x;
        this.moveToward(o, fx, this.losY - 12, st, 0.95);
      } else if (o.role === "WR") {
        this.moveToward(o, o.hx, this.losY - 60, st, 0.7);
      }
    }

    // --- ball carrier ---
    if (handoff) this.runCarrier(st);

    // --- defense (a short read/react beat gives the runner a head start) ---
    // Teach (L1) gives a much bigger head start and a slower pursuit so a brand
    // new player can succeed and watch the play develop; Game (L3) is realistic.
    const lvl = this.gameLevel || 2;
    const reactDelay = lvl === 1 ? 0.8 : (lvl === 2 ? 0.45 : 0.28);
    const pursuit = lvl === 1 ? 0.68 : (lvl === 2 ? 0.84 : 0.92);
    const react = this.t > reactDelay;
    for (const d of this.defense) {
      if (d.engaged) continue;
      if (!react) { this.moveToward(d, d.x, this.losY - 20, st, 0.35); continue; }
      // defenders fooled by the fake chase the faker instead of the real ball
      if (d.chaseFake && this.faker) { this.moveToward(d, this.faker.x, this.faker.y, st, pursuit); continue; }
      this.moveToward(d, ballX, ballY, st, this.botch && d.pursuer ? 1.05 : pursuit);
    }

    // --- keep defenders from stacking (no two circles share a spot) ---
    for (let i = 0; i < this.defense.length; i++) for (let j = i + 1; j < this.defense.length; j++) {
      const a = this.defense[i], b = this.defense[j];
      if (a.engaged || b.engaged) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1, min = a.r + b.r;
      if (dd < min) { const p = (min - dd) / 2, ux = dx / dd, uy = dy / dd; a.x -= ux * p; a.y -= uy * p; b.x += ux * p; b.y += uy * p; }
    }

    // clamp everyone in bounds
    for (const p of this.players) { p.x = Math.max(p.r, Math.min(this.W - p.r, p.x)); p.y = Math.max(p.r, Math.min(this.H - p.r, p.y)); }

    // record this frame so the play can be re-watched
    this.record.push({ p: this.players.map((pl) => ({ x: pl.x, y: pl.y })), c: this.ball ? this.ball.carrierId : null });

    // --- tackle / score ---
    if (handoff) {
      const goalY = this.losY - this.toGoal * this.pxPerYard;
      // Crossed the end-zone goal line (only when the goal is close enough to see).
      if (this.toGoal <= 30 && this.carrier.y <= goalY + 2) return this.endPlay("TD", null);
      // Broke completely free and ran off the top of the field (open field, big gain).
      if (this.carrier.y <= this.carrier.r + 3) return this.endPlay("BROKE", null);
      for (const d of this.defense) {
        if (d.engaged) continue;
        if (dist(d.x, d.y, this.carrier.x, this.carrier.y) <= d.r + this.carrier.r + 1) return this.endPlay(false, d);
      }
    }
    if (this.t > 9) this.endPlay(false, null); // safety valve
  }

  runCarrier(st) {
    const c = this.carrier;
    // The user already chose the gap pre-snap, so the back runs it automatically:
    // hit the chosen hole, then climb to daylight away from the nearest free
    // defender. Holding SPRINT (player carrier only) gives a speed burst.
    const boost = (this.isPlayerCarrier && this.burst) ? 1.6 : 1;
    let tx, ty;
    if (c.y > this.losY - 6) { tx = this.gapX; ty = this.losY - 14; }
    else {
      let nd = null, bd = Infinity;
      for (const d of this.defense) { if (d.engaged) continue; const dd = dist(d.x, d.y, c.x, c.y); if (dd < bd) { bd = dd; nd = d; } }
      const dodge = nd ? (c.x < nd.x ? -1 : 1) * 26 : 0;
      tx = Math.max(c.r, Math.min(this.W - c.r, c.x + dodge)); ty = 0;
    }
    this.moveToward(c, tx, ty, st, (this.botch ? 0.7 : 1) * boost);
    c.x = Math.max(c.r, Math.min(this.W - c.r, c.x));
  }

  // kind: "TD" (crossed the goal), "BROKE" (broke free for the canvas max), or
  // false (tackled). The game converts these yards into down & distance.
  endPlay(kind, tackler) {
    if (this.phase === "over") return;
    this.phase = "over";
    const td = kind === "TD";
    let yards = Math.round((this.losY - this.carrier.y) / this.pxPerYard);
    if (td) yards = this.toGoal; // reached the end zone exactly
    else if (kind === "BROKE") yards = Math.max(yards, Math.round(this.losY / this.pxPerYard));
    yards = Math.max(yards, -9);
    this.result = { td, broke: td || kind === "BROKE", yards, tackler: tackler ? tackler.label : null, botch: this.botch, faker: this.isFaker, pulled: this.pulled };
    if (this.onEnd) this.onEnd(this.result);
  }

  // ---- rendering ----
  render() {
    const ctx = this.ctx, W = this.W, H = this.H;
    // turf
    const band = Math.max(18, this.pxPerYard * 5);
    for (let y = 0; y < H; y += band) { ctx.fillStyle = (Math.floor(y / band) % 2 === 0) ? "#2e7d32" : "#256528"; ctx.fillRect(0, y, W, band); }
    // yard lines
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
    for (let y = this.losY % band; y < H; y += band) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // line of scrimmage + running lane
    if (this.gapX != null && this.phase !== "over") {
      ctx.fillStyle = this.phase === "gapselect" ? "rgba(255,210,63,.28)" : "rgba(255,210,63,.16)";
      ctx.fillRect(this.gapX - 13, 0, 26, this.losY + 30);
    }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, this.losY); ctx.lineTo(W, this.losY); ctx.stroke();

    this.drawFieldMarks();

    for (const p of this.players) this.drawPlayer(p);
    // football floats above whoever holds it (QB pre-snap, then the ball carrier)
    const holder = (this.ball && this.byId(this.ball.carrierId)) || this.carrier;
    if (holder) this.drawBall(holder.x, holder.y - holder.r - 8);
    // gap numbers last so they always sit on top and stay readable
    if (this.phase === "gapselect") this.drawGaps();
  }

  // The yellow first-down line (the "line to gain") and the end zone, so the
  // user can SEE what they're running toward - the whole point of down & distance.
  drawFieldMarks() {
    const ctx = this.ctx, W = this.W;
    // end zone + goal line (only drawn when it's within the visible field)
    if (this.toGoal != null) {
      const gY = this.losY - this.toGoal * this.pxPerYard;
      if (gY >= -2 && gY < this.losY) {
        ctx.fillStyle = "rgba(226,35,26,.30)"; ctx.fillRect(0, 0, W, Math.max(0, gY));
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(W, gY); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText("END ZONE", W / 2, 5);
      }
    }
    // first-down line (dashed gold) - cross this to move the chains
    if (this.toGo != null) {
      const fdY = this.losY - this.toGo * this.pxPerYard;
      const goalBeyond = this.toGoal != null && this.toGo >= this.toGoal;
      if (!goalBeyond && fdY > 4 && fdY < this.losY - 1) {
        ctx.save();
        ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 3; ctx.setLineDash([11, 7]);
        ctx.beginPath(); ctx.moveTo(0, fdY); ctx.lineTo(W, fdY); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#ffd23f"; ctx.font = "bold 10px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText("1ST DOWN", 6, fdY - 2);
      }
    }
  }

  // A small, recognizable football marker so the user can always see the ball.
  drawBall(x, y) {
    y = Math.max(9, y);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#7a3b12"; ctx.strokeStyle = "#3f1d08"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, 9, 5.5, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 4.5, y); ctx.lineTo(x + 4.5, y); ctx.stroke();
    for (let i = -3; i <= 3; i += 2) { ctx.beginPath(); ctx.moveTo(x + i, y - 2); ctx.lineTo(x + i, y + 2); ctx.stroke(); }
    ctx.restore();
  }

  // Numbered hole markers shown while the carrier picks his gap. The selected
  // hole pulses gold; in Teach mode the correct hole is tinted green.
  drawGaps() {
    const ctx = this.ctx;
    const y = this.losY - 16; // right at the line, in the clear band below the D-line
    const correctHole = this.gapCorrectHole != null ? this.gapCorrectHole : (this.play ? this.play.hole : null);
    ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    this.gaps.forEach((g, i) => {
      const sel = i === this.selGapIdx;
      const correct = this.showCorrectGap && g.hole === correctHole;
      const rad = sel ? 13 : 10;
      ctx.beginPath(); ctx.arc(g.x, y, rad, 0, 7);
      ctx.fillStyle = sel ? "#ffd23f" : (correct ? "#27d17c" : "rgba(0,0,0,.72)");
      ctx.fill();
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeStyle = sel ? "#fff" : (correct ? "#aef5cf" : "rgba(255,255,255,.5)");
      ctx.stroke();
      ctx.fillStyle = (sel || correct) ? "#111" : "#fff";
      ctx.fillText(String(g.hole), g.x, y);
    });
  }

  drawPlayer(p) {
    const ctx = this.ctx;
    const isCarrier = this.carrier && p.id === this.carrier.id;
    const isYou = p.label === this.playerLabel && p.team === "OFF";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
    if (isCarrier) ctx.fillStyle = "#ffd23f";
    else if (p.team === "OFF") ctx.fillStyle = "#9a241d";
    else ctx.fillStyle = "#15466f";
    ctx.fill();
    ctx.lineWidth = isYou ? 3 : 2;
    ctx.strokeStyle = isYou ? "#ffd23f" : (p.team === "OFF" ? "#000" : "#06192b");
    ctx.stroke();
    if (isYou && !isCarrier) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 4, 0, 7); ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = isCarrier ? "#111" : "#fff";
    ctx.font = "bold 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.label, p.x, p.y);
  }
}
