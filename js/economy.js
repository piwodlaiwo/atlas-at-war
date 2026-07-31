// Bounty cards: hidden side-objectives that grant a one-off army reward when completed.
// (Reinforcement/trade cards were removed for now.)

// Assigned to a player; completing grants `reward` armies, then a new bounty is drawn.
export function assignBounty(players, playerId, territoryCount, regions) {
  const opponents = players.filter((p) => p.id !== playerId);
  const r = Math.random();
  if (r < 0.34) {
    const n = Math.min(territoryCount, Math.round(territoryCount * 0.55));
    return { kind: "own", n, reward: 5, text: `Hold ${n} of ${territoryCount} territories` };
  }
  if (r < 0.67 && regions && regions.length) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    return { kind: "region", region, reward: 4, text: `Own every territory in ${region}` };
  }
  const opp = opponents[Math.floor(Math.random() * opponents.length)];
  return { kind: "eliminate", target: opp.id, reward: 6, text: `Wipe ${opp.name} off the map` };
}

// board: { playable:Set, regionOf }, state: Map id->{owner}, players: [{id,alive}]
export function bountyDone(bounty, playerId, board, state, players) {
  if (bounty.kind === "own") {
    let n = 0; for (const c of state.values()) if (c.owner === playerId) n++;
    return n >= bounty.n;
  }
  if (bounty.kind === "region") {
    return [...board.playable].filter((id) => board.regionOf(id) === bounty.region)
      .every((id) => state.get(id).owner === playerId);
  }
  if (bounty.kind === "eliminate") {
    const t = players.find((p) => p.id === bounty.target);
    return t && !t.alive;
  }
  return false;
}
