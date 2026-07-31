// Monte Carlo win prediction: from the current position, play the rest of the game
// out K times with every player on greedy autopilot, and tally who wins. Gives each
// player an estimated win chance. It's an estimate (assumes autopilot from here),
// not a guarantee — but it reflects the real mechanics (dice, supply, regions).

import { cloneState, endTurn } from "./game.js";
import { aiTurn } from "./ai.js";

export function predict(g, K = 120) {
  if (g.phase === "over") {
    const out = {};
    for (const p of g.players) out[p.id] = p.id === g.winner ? 100 : 0;
    return out;
  }
  const wins = {};
  for (const p of g.players) wins[p.id] = 0;
  for (let i = 0; i < K; i++) {
    const c = cloneState(g);
    let guard = 0;
    while (c.phase !== "over" && guard++ < 4000) { aiTurn(c); endTurn(c); }
    if (c.winner) wins[c.winner]++;
  }
  const out = {};
  for (const p of g.players) out[p.id] = Math.round((100 * wins[p.id]) / K);
  return out;
}
