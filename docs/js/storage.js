// Lightweight persistence with an in-memory fallback (some browsers block localStorage on file://).
const KEY_BEST = "pb_bestDrive";
const KEY_XP = "pb_xp";
const mem = {};

function get(k) {
  try { const v = localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : null) : v; }
  catch (e) { return k in mem ? mem[k] : null; }
}
function set(k, v) {
  try { localStorage.setItem(k, String(v)); } catch (e) { mem[k] = String(v); }
}

export const Storage = {
  bestDrive() { return parseInt(get(KEY_BEST) || "0", 10) || 0; },
  xp() { return parseInt(get(KEY_XP) || "0", 10) || 0; },
  setBestDrive(v) { set(KEY_BEST, v); },
  addXP(n) { set(KEY_XP, this.xp() + n); },
};
