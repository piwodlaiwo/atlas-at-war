# Atlas at War

A turn-based world-conquest strategy game (RISK-flavored) played on real geography,
powered by the [MapJSON](https://mapjson.com) API. Buildless static site — plain
HTML + ES modules, `d3` and `topojson-client` loaded from a CDN.

## Run locally

```
python3 -m http.server 8080
# open http://localhost:8080
```

## How the board is built

`js/board.js` fetches world countries from the MapJSON API and:

- keeps **large mainland countries** as playable territories (area ≥ `AREA_THRESHOLD`,
  has land borders, not an island),
- folds aliased slivers into a parent (Western Sahara → Morocco),
- builds an adjacency graph from the `borders` property plus curated `SEA_ROUTES`,
- keeps only the **largest connected component** so the board is always winnable;
  everything else still renders as neutral land.

All tunable in `js/config.js` (`AREA_THRESHOLD`, `ISLAND_BLOCK`, `SEA_ROUTES`,
`CONTINENT_BONUS`, `PLAYERS`).

## Status

- **Milestone 1 — board & render (current).** Loads the board, draws the world with
  a random placeholder game state (owners + army badges) and the sea routes.
- Next: dealing, reinforce/attack turn loop, dice combat, AI, economy (continent
  bonuses / cards / bounties), supply lines, alliances, world events.

Design spec lives outside the repo (planning doc).
