// ===========================================================================
// Position assignments for the June Install (AJRF 6th 2026 Offensive Guide).
// Every play lists the exact job for all 11 positions. Where the assignment
// differs by formation strength (only the tight end Y does), the value is an
// object { R: "...", L: "..." } keyed by the side the TE is on.
// ===========================================================================

export const POSITIONS = ["QB", "FB", "TB", "LT", "LG", "C", "RG", "RT", "Y", "X", "Z"];

// Which assignment "pool" each position draws from (used to build read-step choices).
export function groupOf(label) {
  if (label === "QB") return "QB";
  if (label === "FB") return "FB";
  if (label === "TB") return "TB";
  if (label === "X" || label === "Z") return "WR";
  return "OL";
}

export const ASSIGN_POOL = {
  OL: [
    "Drive block", "Drive block, create movement", "Down block",
    "Pull and kick out edge defender", "Seal edge", "Cut off backside pursuit",
    "Block nose guard", "Block defender in front", "Protect backside",
  ],
  QB: [
    "Open left, hand to FB, carry boot fake",
    "Open right, hand to FB, carry boot fake",
    "Reverse pivot, hand to TB, carry boot fake",
  ],
  FB: ["Take handoff, hit the hole downhill", "Lead through the hole, block first LB"],
  TB: [
    "Jab and carry the fake, secure backside",
    "Follow the FB through the hole, one cut vertical",
    "Follow the puller through the hole, one cut vertical",
  ],
  WR: ["Stalk block CB", "Stalk block DB"],
};

export const PLAYS = [
  {
    call: "21 Dive", num: "21", carrier: "FB", hole: 1, type: "DIVE",
    coach: "Quick-hitting fullback run through the 1 Hole. Hit downhill immediately and fall forward.",
    assign: {
      QB: "Open left, hand to FB, carry boot fake",
      FB: "Take handoff, hit 1 hole downhill",
      TB: "Jab right, carry fake, secure backside",
      LT: "Drive block", LG: "Drive block, create movement", C: "Block nose / 1 hole threat",
      RG: "Protect backside 2 hole", RT: "Cut off backside pursuit", Y: "Drive block",
      X: "Stalk block CB", Z: "Stalk block DB",
    },
  },
  {
    call: "22 Dive", num: "22", carrier: "FB", hole: 2, type: "DIVE",
    coach: "Quick-hitting fullback run through the 2 Hole. Hit downhill immediately and fall forward.",
    assign: {
      QB: "Open right, hand to FB, carry boot fake",
      FB: "Take handoff, hit 2 hole downhill",
      TB: "Jab left, carry fake, secure backside",
      LT: "Cut off backside pursuit", LG: "Protect backside 1 hole", C: "Block nose / 2 hole threat",
      RG: "Drive block, create movement", RT: "Drive block", Y: "Drive block",
      X: "Stalk block CB", Z: "Stalk block DB",
    },
  },
  {
    call: "33 Lead", num: "33", carrier: "TB", hole: 3, type: "LEAD",
    coach: "Tailback follows the fullback through the 3 Hole. Press the hole, stay tight to the lead block, and get vertical.",
    assign: {
      QB: "Reverse pivot, hand to TB, carry boot fake",
      FB: "Lead through the 3 Hole, block first LB",
      TB: "Follow FB through the 3 Hole, one cut vertical",
      LT: "Drive block", LG: "Drive block, create movement", C: "Block nose guard",
      RG: "Block defender in front", RT: "Cut off backside pursuit",
      Y: { R: "Drive block", L: "Seal edge" },
      X: "Stalk block CB", Z: "Stalk block DB",
    },
  },
  {
    call: "34 Lead", num: "34", carrier: "TB", hole: 4, type: "LEAD",
    coach: "Tailback follows the fullback through the 4 Hole. Press the hole, stay tight to the lead block, and get vertical.",
    assign: {
      QB: "Reverse pivot, hand to TB, carry boot fake",
      FB: "Lead through the 4 hole, block first LB",
      TB: "Follow FB through the 4 hole, one cut vertical",
      LT: "Cut off backside pursuit", LG: "Block defender in front", C: "Block nose guard",
      RG: "Drive block, create movement", RT: "Drive block",
      Y: { R: "Seal edge", L: "Drive block" },
      X: "Stalk block CB", Z: "Stalk block DB",
    },
  },
  {
    call: "35 Power", num: "35", carrier: "TB", hole: 5, type: "POWER", puller: "RG",
    coach: "Tailback follows the pulling guard through the 5 Hole. Read the kickout block and get vertical.",
    assign: {
      QB: "Reverse pivot, hand to TB, carry boot fake",
      FB: "Lead through the 5 Hole, block first LB",
      TB: "Follow puller through the 5 Hole, one cut vertical",
      LT: "Down block", LG: "Down block", C: "Protect backside",
      RG: "Pull and kick out edge defender", RT: "Cut off backside pursuit",
      Y: { R: "Drive block", L: "Down block" },
      X: "Stalk block CB", Z: "Stalk block DB",
    },
  },
  {
    call: "36 Power", num: "36", carrier: "TB", hole: 6, type: "POWER", puller: "LG",
    coach: "Tailback follows the pulling guard through the 6 Hole. Read the kickout block and get vertical.",
    assign: {
      QB: "Reverse pivot, hand to TB, carry boot fake",
      FB: "Lead through the 6 Hole, block first LB",
      TB: "Follow puller through the 6 Hole, one cut vertical",
      LT: "Cut off backside pursuit", LG: "Pull and kick out edge defender", C: "Protect backside",
      RG: "Down block", RT: "Down block",
      Y: { R: "Down block", L: "Drive block" },
      X: "Stalk block CB", Z: "Stalk block DB",
    },
  },
];

// Resolve a position's assignment text for a given play + strength side ("R"/"L").
export function assignmentFor(play, label, side) {
  const a = play.assign[label];
  if (a && typeof a === "object") return a[side] || a.R;
  return a;
}

// Classify an assignment string into a behavior the simulation understands.
export function actionType(text, label) {
  const t = (text || "").toLowerCase();
  if (label === "QB") return "HANDOFF";
  if (t.includes("pull")) return "PULL";
  if (t.includes("cut off")) return "CUTOFF";
  if (t.includes("seal")) return "SEAL";
  if (t.includes("stalk")) return "STALK";
  if (t.includes("lead through")) return "LEAD";
  if (t.includes("follow")) return "CARRY";
  if (t.includes("take handoff") || (t.includes("hit") && t.includes("hole"))) return "CARRY";
  if (t.includes("jab") || t.includes("carry fake") || t.includes("secure backside")) return "FAKE";
  return "BLOCK"; // drive / down / block nose / block defender / protect backside
}

// Build a small multiple-choice set: the correct assignment plus distractors.
export function choicesFor(play, label, side) {
  const correct = assignmentFor(play, label, side);
  const pool = ASSIGN_POOL[groupOf(label)].filter((x) => x !== correct);
  // shuffle pool, take 2 distractors
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const opts = [correct, ...pool.slice(0, 2)];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { correct, options: opts };
}
