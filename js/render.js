// Draws the board from live game state: one dissolved outline per territory coloured
// by owner, army badges, sea routes, selection/target highlights, a spotlight ring on
// the latest battle, and click wiring.

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { PLAYERS, COLORS } from "./config.js";
import { currentPlayer, canAttack, canFortify, cutOffSet } from "./game.js";

const colorOf = Object.fromEntries(PLAYERS.map((p) => [p.id, p.color]));
const W = 960, H = 700;

let svg, path, centroidCache, currentBoard = null, zoomBehavior, lastEventId = null;

// Zoom controls (used by the on-map buttons); pinch/drag/wheel work via d3.zoom.
export function zoomIn() { if (svg) svg.transition().duration(200).call(zoomBehavior.scaleBy, 1.6); }
export function zoomOut() { if (svg) svg.transition().duration(200).call(zoomBehavior.scaleBy, 1 / 1.6); }
export function resetZoom() { if (svg) svg.transition().duration(250).call(zoomBehavior.transform, d3.zoomIdentity); }

export function drawMap(board, g, ctx) {
  if (currentBoard !== board) initMap(board);

  const sel = g.selected;
  const cut = cutOffSet(g);
  const isTarget = (terr) => sel && (ctx.mode === "fortify" ? canFortify(g, sel, terr) : canAttack(g, sel, terr));

  // Territories (one dissolved path each). Cut-off lands are faded with a red dashed edge.
  svg.select("g.terr").selectAll("path").data([...board.playable], (id) => id).join("path")
    .attr("d", (id) => path(board.mergedById.get(id)))
    .attr("fill", (id) => d3.color(colorOf[g.state.get(id).owner]).brighter(0.45).formatHex())
    .attr("fill-opacity", (id) => (cut.has(id) ? 0.4 : 1))
    .attr("stroke", (id) => (id === sel ? "#f5c542" : isTarget(id) ? "#1a1a1a" : cut.has(id) ? "#b03030" : COLORS.stroke))
    .attr("stroke-width", (id) => (id === sel ? 1.8 : isTarget(id) ? 1.3 : cut.has(id) ? 1.3 : 0.7))
    .attr("stroke-dasharray", (id) => (cut.has(id) && id !== sel && !isTarget(id) ? "4 3" : null))
    .attr("vector-effect", "non-scaling-stroke")
    .style("cursor", "pointer")
    .on("click", (_e, id) => ctx.onClick(id));

  // "cut off" warning markers.
  const warn = svg.select("g.warn"); warn.selectAll("*").remove();
  for (const id of cut) {
    if (!board.playable.has(id)) continue;
    const [x, y] = centroidCache.get(id);
    if (!Number.isFinite(x)) continue;
    warn.append("text").attr("x", x).attr("y", y - 15).attr("text-anchor", "middle")
      .attr("font-size", 13).style("pointer-events", "none").text("⚠");
  }

  // Army badges.
  const badge = svg.select("g.badges").selectAll("g.b").data([...board.playable], (id) => id)
    .join((enter) => {
      const gg = enter.append("g").attr("class", "b").style("pointer-events", "none");
      gg.append("circle").attr("r", 11).attr("stroke", "#fff").attr("stroke-width", 1.5);
      gg.append("text").attr("text-anchor", "middle").attr("dy", "0.34em")
        .attr("fill", "#fff").attr("font-family", "ui-monospace, monospace")
        .attr("font-size", 11.5).attr("font-weight", 600);
      return gg;
    });
  badge.attr("transform", (id) => { const [x, y] = centroidCache.get(id); return `translate(${x},${y})`; });
  badge.select("circle").attr("fill", (id) => colorOf[g.state.get(id).owner]);
  badge.select("text").text((id) => g.state.get(id).armies);

  drawAction(g);

  // When a world event hits one territory (Mustering / Unrest / Plague), flash it once so
  // you can see WHERE it happened — the toast names a place you may not be able to find.
  if (g.event && g.event.id !== lastEventId) {
    lastEventId = g.event.id;
    if (g.event.focus) flashEvent(g.event.focus);
  }
}

// A one-shot flash on an event-struck territory: expanding rings + a floating +N / −N that
// rises and fades. Lives in the self-removing "fx" layer, so normal redraws don't wipe it.
function flashEvent(focus) {
  const p = centroidCache.get(focus.id);
  if (!p || !p.every(Number.isFinite)) return;
  const [x, y] = p;
  const up = focus.delta > 0;
  const color = up ? "#2f8a4c" : "#b03030";
  const fx = svg.select("g.fx");

  for (let k = 0; k < 3; k++) {
    fx.append("circle").attr("cx", x).attr("cy", y).attr("r", 11)
      .attr("fill", "none").attr("stroke", color).attr("stroke-width", 3).attr("opacity", 0.9)
      .style("pointer-events", "none")
      .transition().delay(k * 480).duration(1200).ease(d3.easeCubicOut)
      .attr("r", 48).attr("stroke-width", 0.5).attr("opacity", 0)
      .on("end", function () { this.remove(); });
  }

  fx.append("text").attr("x", x).attr("y", y - 12).attr("text-anchor", "middle")
    .attr("font-family", "ui-monospace, monospace").attr("font-weight", 700).attr("font-size", 20)
    .attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 3.5).attr("paint-order", "stroke")
    .attr("opacity", 0).style("pointer-events", "none")
    .text((up ? "+" : "−") + Math.abs(focus.delta))
    .transition().duration(220).attr("opacity", 1)
    .transition().delay(1800).duration(800).ease(d3.easeCubicIn).attr("y", y - 46).attr("opacity", 0)
    .on("end", function () { this.remove(); });
}

// Animates the most recent action: an arrow with a travelling pulse for attacks/fortifies,
// a ring for reinforcements — so you can follow exactly who is doing what.
function drawAction(g) {
  const layer = svg.select("g.action");
  layer.selectAll("*").remove();
  const act = g.lastAction;
  if (!act) return;
  const color = colorOf[act.by] || "#333";

  if (act.type === "attack" || act.type === "fortify") {
    const from = centroidCache.get(act.src);
    const to = centroidCache.get(act.type === "attack" ? act.tgt : act.dst);
    if (!from || !to || ![...from, ...to].every(Number.isFinite)) return;

    layer.append("line")
      .attr("x1", from[0]).attr("y1", from[1]).attr("x2", to[0]).attr("y2", to[1])
      .attr("stroke", act.type === "attack" ? color : "#555").attr("stroke-width", 2.5)
      .attr("opacity", 0.65).attr("stroke-dasharray", act.type === "fortify" ? "6 4" : null);

    if (act.type === "attack") {
      layer.append("circle").attr("cx", to[0]).attr("cy", to[1]).attr("r", 17).attr("fill", "none")
        .attr("stroke", act.captured ? "#111" : "#8a2020").attr("stroke-width", 2.5).attr("opacity", 0.9);
    }
    layer.append("circle").attr("r", 5).attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 1.2)
      .attr("cx", from[0]).attr("cy", from[1])
      .transition().duration(520).ease(d3.easeCubicOut).attr("cx", to[0]).attr("cy", to[1]);
  } else if (act.type === "deploy") {
    const p = centroidCache.get(act.id);
    if (!p || !p.every(Number.isFinite)) return;
    layer.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 15).attr("fill", "none")
      .attr("stroke", color).attr("stroke-width", 2.5).attr("opacity", 0.85);
  }
}

function initMap(board) {
  const wrap = document.getElementById("map");
  wrap.innerHTML = "";
  svg = d3.select(wrap).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).style("width", "100%").style("height", "auto")
    .style("touch-action", "none"); // let d3.zoom own touch gestures (pinch/pan)
  svg.append("rect").attr("width", W).attr("height", H).attr("fill", COLORS.ocean);

  // Everything drawable lives in one viewport group so pan/zoom transforms it together.
  const viewport = svg.append("g").attr("class", "viewport");

  const projection = d3.geoNaturalEarth1().rotate(board.rotate).fitExtent([[10, 10], [W - 10, H - 10]], board.fitCollection);
  path = d3.geoPath(projection);

  centroidCache = new Map();
  for (const id of board.playable) centroidCache.set(id, path.centroid(board.mergedById.get(id)));

  // Neutral context land (static).
  viewport.append("g").attr("class", "neutral").selectAll("path").data(board.neutralFeats).join("path")
    .attr("d", path).attr("fill", COLORS.land).attr("stroke", COLORS.stroke)
    .attr("stroke-width", 0.5).attr("vector-effect", "non-scaling-stroke");

  const sea = viewport.append("g").attr("class", "sea");
  viewport.append("g").attr("class", "terr");
  viewport.append("g").attr("class", "warn");
  viewport.append("g").attr("class", "action"); // arrows/pulses
  viewport.append("g").attr("class", "badges"); // army badges on top so counts are never covered
  viewport.append("g").attr("class", "fx");     // one-shot world-event flashes (self-removing)

  // Pan / pinch / wheel zoom. A tap without drag still fires the path click.
  zoomBehavior = d3.zoom().scaleExtent([1, 8])
    .extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]])
    .on("zoom", (e) => viewport.attr("transform", e.transform));
  svg.call(zoomBehavior).on("dblclick.zoom", null);

  for (const [a, b] of board.seaRoutes) {
    const [x1, y1] = centroidCache.get(a), [x2, y2] = centroidCache.get(b);
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * len * 0.18, cy = my + (dx / len) * len * 0.18;
    sea.append("path").attr("d", `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`)
      .attr("fill", "none").attr("stroke", COLORS.sea).attr("stroke-width", 1.4)
      .attr("stroke-dasharray", "5 4").attr("opacity", 0.7);
    for (const [x, y] of [[x1, y1], [x2, y2]])
      sea.append("circle").attr("cx", x).attr("cy", y).attr("r", 2.4).attr("fill", COLORS.sea);
  }
  currentBoard = board;
}
