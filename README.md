# Atlas at War

A turn-based **Europe-conquest** strategy game (RISK-flavored) played on real
geography, powered by the [MapJSON](https://mapjson.com) API. Buildless static
site — plain HTML + ES modules, with `d3` and `topojson-client` from a CDN.

### ▶ Play: https://piwodlaiwo.github.io/atlas-at-war/

You (blue) versus two AI players (Crimson, Verdant) for control of Europe.

## Run locally

```
python3 -m http.server 8080
# open http://localhost:8080
```

## How it plays

- **Deal:** every territory is handed out, and each player starts with the same
  total armies (scattered), so openings are fair.
- **Reinforce:** each turn you get armies based on how much territory you hold
  (~1 per 3 lands, min 3), plus a bonus for controlling an entire region.
- **Attack:** RISK dice — click one of your lands, then an adjacent enemy. Toggle
  **⚡ Blitz** to launch a full assault in one click.
- **Fortify:** once per turn, march a stack across your connected territory.
- **Supply lines:** strand a single enemy land away from their main force and it's
  cut off (⚠) — it can't reinforce and loses a unit each turn.
- **Bounty missions:** a hidden side-objective for a bonus (optional).
- **Win:** last player standing.

## How the board is built

`js/board.js` fetches Europe's countries from the MapJSON API and:

- groups them into ~20 chunky **territories** (see `TERRITORIES` in `js/config.js`
  — e.g. Iberia = Spain + Portugal, Baltics = Estonia + Latvia + Lithuania),
- **dissolves** each group's member outlines into one shape (`topojson.merge`),
- builds the adjacency graph from the `borders` property plus a curated sea route
  (Scandinavia ↔ Denmark, the Øresund),
- groups territories into five regions (using the `subregion` property) for hold
  bonuses.

Everything is tunable in `js/config.js` (`TERRITORIES`, `SEA_ROUTES`,
`REGION_BONUS`, `PLAYERS`).

## Tech

No build step. `index.html` loads ES modules directly; `d3` and `topojson-client`
come from jsDelivr; the map data comes live from `api.mapjson.com`.
