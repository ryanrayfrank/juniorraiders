// ===========================================================================
// Alignment for the I-Formation offense (all 11) and the 3-5-3 defense.
// All coordinates are in canvas logical pixels. The endzone is at the top
// (y = 0); the offense lines up at/below the line of scrimmage (losY) and
// drives upward. The Center is always at cx, so the backfield (QB/FB/TB)
// lines up directly behind him regardless of the tight-end side.
// ===========================================================================

export const PLAYER_R = 15;

export function spacing(W) {
  return Math.max(26, Math.min(40, W / 13));
}

// side = "R" (TE right) or "L" (TE left).
export function buildFormation(W, H, losY, side) {
  const cx = W / 2;
  const SP = spacing(W);
  const r = PLAYER_R;
  const mk = (label, role, team, x, y) => ({ label, role, team, x, y, hx: x, hy: y, r });

  const offense = [];
  // Offensive line, Center centered, TE on the strength side.
  offense.push(mk("LT", "OL", "OFF", cx - 2 * SP, losY + 4));
  offense.push(mk("LG", "OL", "OFF", cx - SP, losY + 4));
  offense.push(mk("C", "OL", "OFF", cx, losY + 4));
  offense.push(mk("RG", "OL", "OFF", cx + SP, losY + 4));
  offense.push(mk("RT", "OL", "OFF", cx + 2 * SP, losY + 4));
  offense.push(mk("Y", "OL", "OFF", side === "R" ? cx + 3 * SP : cx - 3 * SP, losY + 4));

  // Backfield (the "I"), straight behind the Center.
  offense.push(mk("QB", "QB", "OFF", cx, losY + 30));
  offense.push(mk("FB", "FB", "OFF", cx, losY + 64));
  offense.push(mk("TB", "TB", "OFF", cx, losY + 98));

  // Wide receivers split to the sidelines. I Right: X left / Z right. I Left: flipped.
  const farL = 24, farR = W - 24;
  offense.push(mk("X", "WR", "OFF", side === "R" ? farL : farR, losY + 2));
  offense.push(mk("Z", "WR", "OFF", side === "R" ? farR : farL, losY + 2));

  // Defense: 3-5-3.
  const defense = [];
  // Defense sits a touch further off the ball so the pre-snap gap numbers (drawn
  // right at the line of scrimmage) stay visible and aren't covered by the D-line.
  const dlY = losY - 44, lbY = losY - 88, cbY = losY - 132, sY = losY - 166;
  defense.push(mk("E", "DL", "DEF", cx - 2 * SP, dlY));
  defense.push(mk("N", "DL", "DEF", cx, dlY));
  defense.push(mk("E", "DL", "DEF", cx + 2 * SP, dlY));
  defense.push(mk("R", "LB", "DEF", cx - 2.3 * SP, lbY));
  defense.push(mk("S", "LB", "DEF", cx - SP, lbY));
  defense.push(mk("M", "LB", "DEF", cx, lbY));
  defense.push(mk("W", "LB", "DEF", cx + SP, lbY));
  defense.push(mk("B", "LB", "DEF", cx + 2.3 * SP, lbY));
  defense.push(mk("LC", "DB", "DEF", 40, cbY));
  defense.push(mk("RC", "DB", "DEF", W - 40, cbY));
  defense.push(mk("H", "DB", "DEF", cx, sY));

  return { offense, defense, cx, SP };
}

// X center of each running hole, between specific linemen (or just outside the
// tackle on an edge hole). Returns the x in canvas pixels.
export function holeX(offense, hole, side) {
  const at = (lbl) => { const p = offense.find((o) => o.label === lbl); return p ? p.hx : null; };
  const LT = at("LT"), LG = at("LG"), C = at("C"), RG = at("RG"), RT = at("RT"), Y = at("Y");
  const sp = Math.abs(LG - LT) || 34;
  switch (hole) {
    case 1: return (LG + C) / 2;
    case 2: return (C + RG) / 2;
    case 3: return (LT + LG) / 2;
    case 4: return (RG + RT) / 2;
    case 5: return side === "L" ? (Y + LT) / 2 : LT - sp; // off-tackle left
    case 6: return side === "R" ? (RT + Y) / 2 : RT + sp; // off-tackle right
    default: return C;
  }
}
