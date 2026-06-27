// Bump VERSION on every deploy. It is shown in the corner of the app AND used as
// a ?v= cache-buster on every module import below (and on the <script> tag in
// index.html), so a normal page reload always pulls the latest code. If the
// number in the corner matches what you just pushed, you're on the latest build.
export const VERSION = "v29 \u00b7 2026-06-27";

import { Game } from "./game.js?v=29";

function showVersion() {
  const el = document.getElementById("verBadge");
  if (el) el.textContent = VERSION;
}

// Boot once the DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { showVersion(); Game.init(); });
} else {
  showVersion();
  Game.init();
}
