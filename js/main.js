// Wires the board, engine, AI, and HUD together. AI turns are stepped with a
// selectable delay so you can watch each move happen.

import { loadBoard } from "./board.js";
import { drawMap } from "./render.js";
import { createGame, currentPlayer, ownedIds, reinforceOne, attack, canAttack, fortify, canFortify, endTurn } from "./game.js";
import { aiStep } from "./ai.js";

const el = (id) => document.getElementById(id);
const els = {
  turn: el("turn"), endturn: el("endturn"), fortify: el("fortify"), speed: el("speed"),
  counts: el("counts"), bounty: el("bounty"), eventToast: el("event-toast"),
  battle: el("battle"), log: el("log"), banner: el("banner"), newgame: el("newgame"), status: el("status"),
};

// AI pacing: Slow / Medium / Fast (one button cycles through them).
const SPEEDS = [
  { name: "Slow", ms: 1500 },
  { name: "Medium", ms: 800 },
  { name: "Fast", ms: 250 },
];
let speedIdx = 1;
const stepMs = () => SPEEDS[speedIdx].ms;

let board, g, busy = false, mode = "attack";
let shownEventId = null, eventTimer = null;

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
els.speed.addEventListener("click", () => { speedIdx = (speedIdx + 1) % SPEEDS.length; draw(); });
els.newgame.addEventListener("click", () => newGame());

function newGame() { g = createGame(board); busy = false; mode = "attack"; shownEventId = null; els.eventToast.classList.remove("show"); draw(); }

function draw() {
  if (!(currentPlayer(g).human && g.phase === "attack")) mode = "attack";
  drawMap(board, g, { onClick, mode });
  drawHUD();
  showEventIfNew();
}

// Big card over the map when a new world event fires; auto-hides after a few seconds.
function showEventIfNew() {
  if (!g.event || g.event.id === shownEventId) return;
  shownEventId = g.event.id;
  els.eventToast.innerHTML =
    `<div class="et-tag">🌍 World event · round ${g.event.round}</div>` +
    `<div class="et-title">${g.event.title}</div>` +
    `<div class="et-impact">${g.event.impact}</div>`;
  els.eventToast.classList.add("show");
  clearTimeout(eventTimer);
  eventTimer = setTimeout(() => els.eventToast.classList.remove("show"), 3200);
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
  if (canAttack(g, g.selected, terr)) { attack(g, g.selected, terr); draw(); }
}

function runAI() {
  if (g.phase === "over") { busy = false; draw(); return; }
  if (currentPlayer(g).human) { busy = false; draw(); return; }
  busy = true; draw();
  const tick = () => {
    const acted = aiStep(g); draw();
    if (acted) { setTimeout(tick, stepMs()); return; }
    setTimeout(() => {
      const before = g.event;
      endTurn(g); draw();                                   // may fire a world event
      const delay = g.event !== before ? 3000 : Math.round(stepMs() * 0.7); // pause to read the event
      setTimeout(runAI, delay);
    }, Math.round(stepMs() * 0.7));
  };
  setTimeout(tick, Math.round(stepMs() * 0.6));
}

// ── HUD ──────────────────────────────────────────────────────────────
function drawHUD() {
  const cur = currentPlayer(g);
  const you = g.players.find((p) => p.human);

  if (g.phase === "over") {
    els.banner.hidden = false;
    const w = g.players.find((p) => p.id === g.winner);
    els.banner.textContent = w ? `${w.name} win${w.human ? "" : "s"} — the map is conquered` : "Game over";
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
      const info = g.reinforceInfo || { base: g.toDeploy, lands: 0, regions: [], bounty: 0 };
      const parts = [`<strong>${info.base}</strong> base (${info.lands} lands ÷ 3, min 3)`,
        ...info.regions.map((r) => `<strong>+${r.bonus}</strong> for holding ${r.region}`),
        ...(info.bounty ? [`<strong>+${info.bounty}</strong> bounty`] : []),
        ...(info.event ? [`<strong>${info.event > 0 ? "+" : ""}${info.event}</strong> world event`] : [])];
      instr = `reinforce — place <strong>${g.toDeploy}</strong> ${g.toDeploy === 1 ? "army" : "armies"} on your lands`
        + `<div class="hint2">= ${parts.join(" &nbsp;+&nbsp; ")}</div>`;
    }
    else if (mode === "fortify") instr = g.selected ? "click a connected land to send armies" : "pick a land to move armies from";
    else instr = g.selected ? "pick an adjacent enemy to attack" : "select a land to attack from, or end turn";
    els.turn.innerHTML = `${who} — ${instr}<br><span class="status">round ${g.round}</span>`;
  }

  const human = cur && cur.human && g.phase === "attack" && !busy;
  els.endturn.disabled = !human;
  els.fortify.disabled = !(human && !g.fortified);
  els.fortify.textContent = g.fortified ? "Move used" : (mode === "fortify" ? "Moving… (cancel)" : "Move armies");
  els.speed.textContent = `Speed: ${SPEEDS[speedIdx].name}`;

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
      `<div class="hint2">Optional reward. You still win by conquering the whole map.</div>`;
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

  const b = g.lastBattle;
  els.battle.textContent = b
    ? `${board.nameOf(b.src)} → ${board.nameOf(b.tgt)}\n  atk [${b.a.join(",")}] vs def [${b.d.join(",")}]\n  ${b.captured ? "✓ captured" : `−${b.attLoss} atk / −${b.defLoss} def`}`
    : "No battles yet.";

  els.log.innerHTML = g.log.slice(-30).reverse().map((m) => `<div>${m}</div>`).join("");
  els.status.textContent = `${board.playable.size} territories`;
}
