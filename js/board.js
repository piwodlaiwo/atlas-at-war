// Loads geometry from the MapJSON API and builds the merged-territory board:
//   - territories group one or more countries (see TERRITORIES in config)
//   - member geometries are dissolved into one outline per territory (topojson.merge)
//   - adjacency graph between territories from member `borders` + sea routes
//   - non-member land still renders as neutral context

import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";
import { API_URL, TERRITORIES, SEA_ROUTES } from "./config.js";

export async function loadBoard() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`MapJSON fetch failed: ${res.status}`);
  const topo = await res.json();
  const objName = Object.keys(topo.objects)[0];
  const geoms = topo.objects[objName].geometries; // raw geometry objects (carry .properties)
  const fc = topojson.feature(topo, topo.objects[objName]);

  const feats = fc.features.filter(
    (f) => f.properties && f.properties.iso2 && f.properties.name !== "Antarctica"
  );

  // Raw geometry objects grouped by iso2 (for topojson.merge).
  const geomsByIso = new Map();
  for (const gm of geoms) {
    const iso = gm.properties && gm.properties.iso2;
    if (!iso) continue;
    if (!geomsByIso.has(iso)) geomsByIso.set(iso, []);
    geomsByIso.get(iso).push(gm);
  }

  const isoToTerr = new Map();
  const nameById = new Map(), regionById = new Map(), mergedById = new Map();
  for (const t of TERRITORIES) {
    nameById.set(t.id, t.name);
    regionById.set(t.id, t.region);
    for (const iso of t.members) isoToTerr.set(iso, t.id);
    const memberGeoms = t.members.flatMap((iso) => geomsByIso.get(iso) || []);
    const geometry = topojson.merge(topo, memberGeoms); // dissolved MultiPolygon
    mergedById.set(t.id, { type: "Feature", properties: { territory: t.id }, geometry });
  }

  const ids = TERRITORIES.map((t) => t.id);
  const graph = new Map(ids.map((id) => [id, new Set()]));
  for (const t of TERRITORIES) {
    for (const iso of t.members) {
      for (const b of geomsByIso.get(iso)?.[0]?.properties.borders || []) {
        const other = isoToTerr.get(b);
        if (other && other !== t.id) { graph.get(t.id).add(other); graph.get(other).add(t.id); }
      }
    }
  }

  const seaRoutes = [];
  for (const [a, b] of SEA_ROUTES) {
    const ta = isoToTerr.get(a), tb = isoToTerr.get(b);
    if (ta && tb && ta !== tb) { graph.get(ta).add(tb); graph.get(tb).add(ta); seaRoutes.push([ta, tb]); }
  }

  const playable = new Set(ids);
  const neutralFeats = feats.filter((f) => !isoToTerr.has(f.properties.iso2));
  const fitCollection = { type: "FeatureCollection", features: ids.map((id) => mergedById.get(id)) };

  return {
    playable, graph, seaRoutes, fitCollection, neutralFeats, mergedById,
    territoryOfIso: (iso) => isoToTerr.get(iso),
    nameOf: (id) => nameById.get(id) || id,
    regionOf: (id) => regionById.get(id),
  };
}
