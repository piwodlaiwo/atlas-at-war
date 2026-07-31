// Game engine: state, dealing, reinforcements, dice attacks, turn advance, win check.

import { PLAYERS, REGION_BONUS } from "./config.js";
import { resolveBattle } from "./combat.js";
import { assignBounty, bountyDone } from "./economy.js";

export function createGame(board) {
  const state = new Map();

  // RISK-style deal: hand every territory out round-robin over a shuffled order,
  // 1 army each, then scatter a few random extras.
  const ids = [...board.playable];
  shuffle(ids);
  ids.forEach((id, i) => state.set(id, { owner: PLAYERS[i % PLAYERS.length].id, armies: 1 }));
  // Fair start: every player gets the SAME total armies; only the scatter differs.
  const perPlayer = Math.round((board.playable.size * 2.5) / PLAYERS.length);
  for (const p of PLAYERS) {
    const mine = ids.filter((id) => state.get(id).owner === p.id);
    let extra = Math.max(0, perPlayer - mine.length); // 1 already placed on each
    while (extra-- > 0) state.get(mine[Math.floor(Math.random() * mine.length)]).armies++;
  }

  const g = {
    board, state,
    players: PLAYERS.map((p) => ({ ...p, alive: true, bounty: null, pendingBonus: 0 })),
    curIdx: 0,
    round: 1,
    phase: "deploy",     // "deploy" | "attack" | "over"
    toDeploy: 0,
    selected: null,      // attack/fortify source territory
    fortified: false,    // one fortify move allowed per turn
    lastBattle: null,
    lastAction: null,    // {type:"attack"|"fortify"|"deploy", by, ...} for animation/narration
    reinforceInfo: null, // breakdown of this turn's reinforcements (for the HUD)
    winner: null,
    log: [],
  };
  for (const p of g.players) p.bounty = assignBounty(g.players, p.id, board.playable.size);
  startTurn(g);
  return g;
}

export const currentPlayer = (g) => g.players[g.curIdx];

// A deep copy of the mutable game state (board is shared, it's read-only), so
// simulations can be played out without touching the real game.
export function cloneState(g) {
  const state = new Map();
  for (const [id, c] of g.state) state.set(id, { owner: c.owner, armies: c.armies });
  return {
    board: g.board,
    state,
    players: g.players.map((p) => ({ ...p, bounty: p.bounty ? { ...p.bounty } : null })),
    curIdx: g.curIdx, round: g.round, phase: g.phase, toDeploy: g.toDeploy,
    selected: null, fortified: g.fortified,
    lastBattle: null, lastAction: null, reinforceInfo: null,
    winner: g.winner, log: [],
  };
}

export function ownedIds(g, pid) {
  const out = [];
  for (const [id, c] of g.state) if (c.owner === pid) out.push(id);
  return out;
}

// Supply lines: a *lone single* territory severed from a larger force is cut off.
// Any connected group of 2+ is always supplied, so which lands are usable never
// "swaps" as groups grow or shrink. If a player holds no group of 2+ (all scattered
// singles), nothing is cut off — there's no main force to be severed from.
export function cutOffSet(g) {
  const cut = new Set();
  for (const p of g.players) {
    const owned = ownedIds(g, p.id);
    if (owned.length <= 1) continue;
    const seen = new Set(), comps = [];
    for (const id of owned) {
      if (seen.has(id)) continue;
      const stack = [id], comp = [];
      seen.add(id);
      while (stack.length) {
        const x = stack.pop();
        comp.push(x);
        for (const n of g.board.graph.get(x)) if (!seen.has(n) && g.state.get(n).owner === p.id) { seen.add(n); stack.push(n); }
      }
      comps.push(comp);
    }
    if (!comps.some((c) => c.length >= 2)) continue; // no main force -> nothing cut off
    for (const c of comps) if (c.length === 1) cut.add(c[0]);
  }
  return cut;
}

// Breakdown of a player's per-turn reinforcements (for the HUD): base = 1 per 3
// territories (min 3), plus a bonus for each fully-held region.
export function reinforcementBreakdown(g, pid) {
  const owned = ownedIds(g, pid);
  const base = Math.max(3, Math.floor(owned.length / 3));
  const ownedSet = new Set(owned);
  const members = {};
  for (const id of g.board.playable) {
    const r = g.board.regionOf(id);
    (members[r] = members[r] || []).push(id);
  }
  const regions = [];
  for (const [r, list] of Object.entries(members)) {
    if (list.every((id) => ownedSet.has(id))) regions.push({ region: r, bonus: REGION_BONUS[r] || 0 });
  }
  const regionTotal = regions.reduce((s, x) => s + x.bonus, 0);
  return { base, regions, total: base + regionTotal };
}

export const calcReinforcements = (g, pid) => reinforcementBreakdown(g, pid).total;

function startTurn(g) {
  updateAlive(g);
  const alive = g.players.filter((p) => p.alive);
  if (alive.length <= 1) { g.phase = "over"; g.winner = alive[0]?.id ?? null; return; }
  g.phase = "deploy";
  g.selected = null;
  g.fortified = false;
  g.lastBattle = null;
  g.lastAction = null;
  const p = currentPlayer(g);
  // Supply attrition: cut-off territories lose a unit at the owner's turn start.
  // Skipped in round 1 so the random opening scatter doesn't punish anyone.
  const cut = cutOffSet(g);
  let starved = 0;
  if (g.round > 1) {
    for (const id of ownedIds(g, p.id)) if (cut.has(id)) { const c = g.state.get(id); if (c.armies > 1) { c.armies--; starved++; } }
    if (starved) log(g, `${p.name}: ${starved} cut-off ${starved === 1 ? "territory" : "territories"} lost a unit`);
  }
  const bd = reinforcementBreakdown(g, p.id);
  g.reinforceInfo = { base: bd.base, regions: bd.regions, bounty: p.pendingBonus || 0 };
  g.toDeploy = bd.total + (p.pendingBonus || 0);
  p.pendingBonus = 0;
  log(g, `${p.name}: reinforce ${g.toDeploy}`);
}

// Human places one army at a time.
export function reinforceOne(g, id) {
  if (g.phase !== "deploy" || g.toDeploy <= 0) return false;
  const c = g.state.get(id);
  if (!c || c.owner !== currentPlayer(g).id) return false;
  if (cutOffSet(g).has(id)) return false;   // cut-off lands can't be reinforced
  c.armies++; g.toDeploy--;
  if (g.toDeploy === 0) g.phase = "attack";
  return true;
}

// AI places many at once.
export function deployMany(g, id, count) {
  const c = g.state.get(id);
  if (!c || c.owner !== currentPlayer(g).id) return;
  c.armies += count; g.toDeploy -= count;
  g.lastAction = { type: "deploy", by: c.owner, id, count };
  if (g.toDeploy <= 0) { g.toDeploy = 0; g.phase = "attack"; }
}

export function canAttack(g, src, tgt) {
  if (g.phase !== "attack") return false;
  const me = currentPlayer(g).id;
  const s = g.state.get(src), t = g.state.get(tgt);
  if (!s || !t || s.owner !== me || t.owner === me || s.armies < 2) return false;
  if (!g.board.graph.get(src)?.has(tgt)) return false;
  if (cutOffSet(g).has(src)) return false;   // cut-off (isolated) lands can't attack
  return true;
}

export function attack(g, src, tgt) {
  if (!canAttack(g, src, tgt)) return null;
  const me = currentPlayer(g).id;
  const s = g.state.get(src), t = g.state.get(tgt);
  const r = resolveBattle(s.armies, t.armies);
  s.armies -= r.attLoss;
  t.armies -= r.defLoss;

  let captured = false;
  if (t.armies <= 0) {
    captured = true;
    const move = s.armies - 1;         // all but one advance into the captured land
    t.owner = me; t.armies = move; s.armies = 1;
    g.selected = t.armies >= 2 ? tgt : null; // auto-continue the breakthrough (blitz)
    log(g, `${g.board.nameOf(src)} took ${g.board.nameOf(tgt)}`);
  }
  g.lastBattle = { src, tgt, ...r, captured };
  g.lastAction = { type: "attack", by: me, src, tgt, a: r.a, d: r.d, captured };
  updateAlive(g);
  const alive = g.players.filter((p) => p.alive);
  if (alive.length <= 1) { g.phase = "over"; g.winner = alive[0]?.id ?? null; }
  return g.lastBattle;
}

// One fortify move per turn: send all-but-one army from `src` to any friendly
// territory reachable through your own territories (fixes stranded interior stacks).
export function canFortify(g, src, dst) {
  if (g.phase !== "attack" || g.fortified) return false;
  const me = currentPlayer(g).id;
  const s = g.state.get(src), d = g.state.get(dst);
  if (!s || !d || src === dst || s.owner !== me || d.owner !== me || s.armies < 2) return false;
  const seen = new Set([src]), stack = [src];
  while (stack.length) {
    const x = stack.pop();
    if (x === dst) return true;
    for (const n of g.board.graph.get(x)) if (!seen.has(n) && g.state.get(n).owner === me) { seen.add(n); stack.push(n); }
  }
  return false;
}

export function fortify(g, src, dst) {
  if (!canFortify(g, src, dst)) return false;
  const s = g.state.get(src), d = g.state.get(dst);
  const move = s.armies - 1;
  d.armies += move; s.armies = 1; g.fortified = true;
  g.lastAction = { type: "fortify", by: currentPlayer(g).id, src, dst, count: move };
  log(g, `moved ${move}: ${g.board.nameOf(src)} → ${g.board.nameOf(dst)}`);
  return true;
}

export function endTurn(g) {
  if (g.phase === "over") return;
  const p = currentPlayer(g);
  if (p.bounty && bountyDone(p.bounty, p.id, g.board, g.state, g.players)) {
    p.pendingBonus += p.bounty.reward;
    log(g, `${p.name} completed a bounty: ${p.bounty.text} (+${p.bounty.reward})`);
    p.bounty = assignBounty(g.players, p.id, g.board.playable.size);
  }
  updateAlive(g);
  const alive = g.players.filter((q) => q.alive);
  if (alive.length <= 1) { g.phase = "over"; g.winner = alive[0]?.id ?? null; return; }
  const prev = g.curIdx;
  do { g.curIdx = (g.curIdx + 1) % g.players.length; } while (!g.players[g.curIdx].alive);
  if (g.curIdx <= prev) g.round++;
  startTurn(g);
}

function updateAlive(g) {
  for (const p of g.players) {
    if (p.alive && ownedIds(g, p.id).length === 0) { p.alive = false; log(g, `${p.name} eliminated`); }
  }
}

function log(g, msg) {
  g.log.push(msg);
  if (g.log.length > 40) g.log.shift();
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
