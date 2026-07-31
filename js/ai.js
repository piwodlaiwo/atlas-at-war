// Greedy AI. Exposed as aiStep(g) — performs ONE action and returns true, or false
// when its turn is done — so the UI can animate each move. aiTurn(g) runs it to completion.

import { currentPlayer, ownedIds, deployMany, attack, fortify, cutOffSet } from "./game.js";

const enemies = (g, me, id) => [...g.board.graph.get(id)].filter((n) => g.state.get(n).owner !== me);

function bestAttack(g, me) {
  const cut = cutOffSet(g);
  let best = null;
  for (const id of ownedIds(g, me)) {
    if (cut.has(id)) continue;   // cut-off lands can't attack
    const s = g.state.get(id);
    if (s.armies < 2) continue;
    for (const n of g.board.graph.get(id)) {
      const t = g.state.get(n);
      if (t.owner === me) continue;
      const edge = s.armies - t.armies;
      if (edge >= 1 && (!best || edge > best.edge)) best = { src: id, tgt: n, edge };
    }
  }
  return best;
}

function bestFortify(g, me) {
  const owned = ownedIds(g, me);
  const isBorder = (id) => enemies(g, me, id).length > 0;
  const interior = owned.filter((id) => !isBorder(id) && g.state.get(id).armies > 1)
    .sort((a, b) => g.state.get(b).armies - g.state.get(a).armies);
  if (!interior.length) return null;
  const src = interior[0];
  const seen = new Set([src]), q = [src];
  while (q.length) {
    const x = q.shift();
    if (x !== src && isBorder(x)) return { src, dst: x };
    for (const n of g.board.graph.get(x)) if (!seen.has(n) && g.state.get(n).owner === me) { seen.add(n); q.push(n); }
  }
  return null;
}

export function aiStep(g) {
  const me = currentPlayer(g).id;

  if (g.phase === "deploy") {
    const cut = cutOffSet(g);
    const owned = ownedIds(g, me).filter((id) => !cut.has(id));   // only supplied lands
    const supplied = owned.length ? owned : ownedIds(g, me);
    const border = supplied.filter((id) => enemies(g, me, id).length > 0);
    const pool = border.length ? border : supplied;
    const pressure = (id) => enemies(g, me, id).reduce((s, n) => s + g.state.get(n).armies, 0);
    let target = pool[0];
    for (const id of pool) if (pressure(id) > pressure(target)) target = id;
    if (g.toDeploy > 0) deployMany(g, target, g.toDeploy);
    return true;
  }

  if (g.phase === "attack") {
    const a = bestAttack(g, me);
    if (a) { attack(g, a.src, a.tgt); return true; }
    if (!g.fortified) { const f = bestFortify(g, me); if (f) { fortify(g, f.src, f.dst); return true; } }
    return false;
  }
  return false;
}

export function aiTurn(g) {
  let n = 0;
  while (aiStep(g) && n++ < 1000) { /* run to completion (used by tests) */ }
}
