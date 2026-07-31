// Milestone 4: board + engine + AI + economy (cards & bounties), wired to the HUD.
// AI turns are stepped with delays so you can watch each move happen.

import { loadBoard } from "./board.js";
import { drawMap } from "./render.js";
import { createGame, currentPlayer, ownedIds, reinforceOne, attack, canAttack, fortify, canFortify, endTurn } from "./game.js";
import { aiStep } from "./ai.js";
import { predict } from "./predict.js";

const el = (id) => document.getElementById(id);
const els = {
  turn: el("turn"), endturn: el("endturn"), fortify: el("fortify"), blitz: el("blitz"),
  counts: el("counts"), bounty: el("bounty"), odds: el("odds"),
  battle: el("battle"), log: el("log"), banner: el("banner"), newgame: el("newgame"), status: el("status"),
};

const AI_STEP_MS = 820;
let board, g, busy = false, mode = "attack", blitz = false;
let odds = null, oddsKey = "";

board = await loadBoard();
newGame();

els.endturn.addEventListener("click", () => {
  if (busy || g.phase !== "attack" || !currentPlayer(g).human) return;
  endTurn(g); draw(); runAI();
});
els.fortify.addEventListener("click", () => {
  if (busy || g.phase !== "attack" || !currentPlayer(g).human || g.fortified) return;
  mode = mode === "fortify" ? "attack" : "fortify"; g.selected = null; draw();
});
els.blitz.addEventListener("click", () => {
  if (busy || g.phase !== "attack" || !currentPlayer(g).human) return;
  blitz = !blitz; draw();
});
els.newgame.addEventListener("click", () => newGame());
els.odds.addEventListener("click", () => { oddsKey = "manual" + Date.now(); computeOdds(); });

function newGame() { g = createGame(board); busy = false; mode = "attack"; odds = null; oddsKey = ""; draw(); }

function draw() {
  if (!(currentPlayer(g).human && g.phase === "attack")) mode = "attack";
  drawMap(board, g, { onClick, mode });
  drawHUD();
  maybeOdds();
}

// Recompute win odds once per turn (only on your turn, so it never runs mid-AI-animation),
// asynchronously so the ~140 simulated playouts don't block the paint.
function computeOdds() {
  odds = null; drawHUD();
  setTimeout(() => { odds = predict(g, 140); drawHUD(); }, 0);
}
function maybeOdds() {
  if (g.phase === "over") { if (oddsKey !== "over") { oddsKey = "over"; computeOdds(); } return; }
  if (!(currentPlayer(g).human && g.phase === "deploy")) return;
  const key = `${g.round}:${g.curIdx}`;
  if (key === oddsKey) return;
  oddsKey = key; computeOdds();
}

function onClick(terr) {
  if (busy || g.phase === "over" || !currentPlayer(g).human || !terr) return;
  const me = currentPlayer(g).id;
  const c = g.state.get(terr);

  if (g.phase === "deploy") { if (reinforceOne(g, terr)) draw(); return; }

  if (mode === "fortify") {
    if (!g.selected) { if (c.owner === me && c.armies >= 2) { g.selected = terr; draw(); } return; }
    if (terr === g.selected) { g.selected = null; draw(); return; }
    if (canFortify(g, g.selected, terr)) { fortify(g, g.selected, terr); mode = "attack"; g.selected = null; draw(); return; }
    if (c.owner === me && c.armies >= 2) { g.selected = terr; draw(); }
    return;
  }
  if (!g.selected) { if (c.owner === me && c.armies >= 2) { g.selected = terr; draw(); } return; }
  if (terr === g.selected) { g.selected = null; draw(); return; }
  if (c.owner === me) { g.selected = c.armies >= 2 ? terr : null; draw(); return; }
  if (canAttack(g, g.selected, terr)) {
    if (blitz) humanAssault(g.selected, terr);
    else { attack(g, g.selected, terr); draw(); }
  }
}

// Blitz: auto-roll a full assault on one target (animated), until captured or stalled.
function humanAssault(src, tgt) {
  busy = true; draw();
  const tick = () => {
    if (g.phase === "over" || !canAttack(g, src, tgt)) { busy = false; draw(); return; }
    attack(g, src, tgt); draw();
    setTimeout(tick, 430);
  };
  setTimeout(tick, 120);
}

function runAI() {
  if (g.phase === "over") { busy = false; draw(); return; }
  if (currentPlayer(g).human) { busy = false; draw(); return; }
  busy = true; draw();
  const tick = () => {
    const acted = aiStep(g); draw();
    if (acted) setTimeout(tick, AI_STEP_MS);
    else setTimeout(() => { endTurn(g); draw(); runAI(); }, 550);
  };
  setTimeout(tick, 450);
}

// ── HUD ──────────────────────────────────────────────────────────────
function drawHUD() {
  const cur = currentPlayer(g);
  const you = g.players.find((p) => p.human);

  if (g.phase === "over") {
    els.banner.hidden = false;
    const w = g.players.find((p) => p.id === g.winner);
    els.banner.textContent = w ? `${w.name} win${w.human ? "" : "s"} — Europe conquered` : "Game over";
    els.banner.style.background = w ? w.color : "var(--ink)";
    els.turn.innerHTML = "";
  } else {
    els.banner.hidden = true;
    const who = `<span class="who" style="color:${cur.color}">${cur.name}${cur.human ? "" : " (AI)"}</span>`;
    let instr;
    if (!cur.human) {
      const act = g.lastAction && g.lastAction.by === cur.id ? g.lastAction : null;
      if (!act) instr = "is moving…";
      else if (act.type === "attack") instr = `attacks <strong>${board.nameOf(act.tgt)}</strong> from ${board.nameOf(act.src)} — [${act.a.join(",")}] v [${act.d.join(",")}] ${act.captured ? "✓ took it" : "held"}`;
      else if (act.type === "fortify") instr = `moves armies ${board.nameOf(act.src)} → <strong>${board.nameOf(act.dst)}</strong>`;
      else if (act.type === "deploy") instr = `reinforces <strong>${board.nameOf(act.id)}</strong> (+${act.count})`;
      else instr = "is moving…";
    }
    else if (g.phase === "deploy") {
      const info = g.reinforceInfo || { base: g.toDeploy, regions: [], bounty: 0 };
      const parts = [`${info.base} base`,
        ...info.regions.map((r) => `+${r.bonus} ${r.region}`),
        ...(info.bounty ? [`+${info.bounty} bounty`] : [])];
      instr = `reinforce — place <strong>${g.toDeploy}</strong> ${g.toDeploy === 1 ? "army" : "armies"} <span class="status">(${parts.join(", ")})</span>`;
    }
    else if (mode === "fortify") instr = g.selected ? "click a connected land to send armies" : "pick a land to move armies from";
    else instr = g.selected ? "pick an adjacent enemy to attack" : "select a land to attack from, or end turn";
    els.turn.innerHTML = `${who} — ${instr}<br><span class="status">round ${g.round}</span>`;
  }

  const human = cur && cur.human && g.phase === "attack" && !busy;
  els.endturn.disabled = !human;
  els.fortify.disabled = !(human && !g.fortified);
  els.fortify.textContent = g.fortified ? "Move used" : (mode === "fortify" ? "Moving… (cancel)" : "Move armies");
  els.blitz.disabled = !human;
  els.blitz.textContent = `⚡ Blitz: ${blitz ? "on" : "off"}`;
  els.blitz.classList.toggle("active", blitz);

  // Your bounty — a hidden bonus mission (only yours is shown).
  if (you.bounty) {
    const bn = you.bounty;
    let tag = "";
    if (bn.kind === "eliminate") {
      const t = g.players.find((p) => p.id === bn.target);
      tag = ` <span class="swatch" style="background:${t.color}"></span>`;
    }
    els.bounty.innerHTML =
      `🎯 <strong>Bonus mission:</strong> ${bn.text}${tag} → <strong>+${bn.reward} armies</strong>` +
      `<div class="hint2">Optional reward. You still win by conquering all of Europe.</div>`;
  } else {
    els.bounty.innerHTML = "";
  }

  els.counts.innerHTML = g.players.map((p) => {
    const terr = ownedIds(g, p.id).length;
    let armies = 0; for (const c of g.state.values()) if (c.owner === p.id) armies += c.armies;
    return `<div class="row ${p.alive ? "" : "dead"}">
      <span class="dot" style="background:${p.color}"></span>${p.name}
      <span class="nums">${terr}⬣ ${armies}⚔</span></div>`;
  }).join("");

  if (odds) {
    els.odds.innerHTML = `<span class="lbl">Win chance ↻</span> ` +
      g.players.map((p) => `<span class="oc" style="color:${p.color}">${p.name} ${odds[p.id]}%</span>`).join("");
  } else {
    els.odds.innerHTML = `<span class="lbl">Win chance</span> <span class="dim">estimating…</span>`;
  }

  const b = g.lastBattle;
  els.battle.textContent = b
    ? `${board.nameOf(b.src)} → ${board.nameOf(b.tgt)}\n  atk [${b.a.join(",")}] vs def [${b.d.join(",")}]\n  ${b.captured ? "✓ captured" : `−${b.attLoss} atk / −${b.defLoss} def`}`
    : "No battles yet.";

  els.log.innerHTML = g.log.slice(-30).reverse().map((m) => `<div>${m}</div>`).join("");
  els.status.textContent = `${board.playable.size} territories`;
}
