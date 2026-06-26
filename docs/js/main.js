import { Game } from "./game.js";

// Boot once the DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Game.init());
} else {
  Game.init();
}
