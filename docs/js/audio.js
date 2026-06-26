// Tiny WebAudio sound effects (no files needed).
let AC = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  return AC;
}
function beep(f, d, type, v) {
  const c = ac(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = f; g.gain.value = v || 0.06;
    o.connect(g); g.connect(c.destination);
    const x = c.currentTime; o.start(x);
    g.gain.exponentialRampToValueAtTime(0.0001, x + (d || 0.12)); o.stop(x + (d || 0.12));
  } catch (e) {}
}

export const SFX = {
  resume() { ac(); },
  tap() { beep(420, 0.05, "square", 0.04); },
  big() { beep(523, 0.1, "square", 0.07); setTimeout(() => beep(659, 0.1, "square", 0.07), 90); setTimeout(() => beep(784, 0.18, "square", 0.07), 180); },
  td() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, "square", 0.07), i * 130)); },
  block() { beep(200, 0.16, "square", 0.09); setTimeout(() => beep(120, 0.12, "sawtooth", 0.06), 70); },
  bad() { beep(150, 0.26, "sawtooth", 0.08); },
  hut() { beep(300, 0.1, "square", 0.06); },
  snap() { beep(160, 0.12, "square", 0.06); },
};
