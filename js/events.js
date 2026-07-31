// World events: one fires at the start of each new round (from round 2 on). Some hit
// immediately (armies change), some set a modifier for the round (reinforcements).

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const playableIds = (g) => [...g.board.playable];

// Each event returns { title, impact } and may mutate state / set g.roundMods.
const EVENTS = [
  (g) => { g.roundMods.reinforceDelta = 2; return { title: "Bountiful Harvest", impact: "Everyone gets +2 reinforcements this round." }; },
  (g) => { g.roundMods.reinforceDelta = -2; return { title: "Harsh Winter", impact: "Reinforcements are cut by 2 this round." }; },
  (g) => {
    const region = rand(g.board.regions);
    g.roundMods.doubleRegion = region;
    return { title: "Golden Age", impact: `Holding all of ${region} pays double this round.` };
  },
  (g) => {
    const cands = playableIds(g).filter((id) => g.state.get(id).armies >= 2);
    if (!cands.length) return { title: "Unrest", impact: "Grumbling in the ranks, but the thin garrisons hold." };
    const id = rand(cands); const c = g.state.get(id);
    const lost = Math.min(c.armies - 1, Math.max(1, Math.floor(c.armies / 2)));
    c.armies -= lost;
    return { title: "Unrest", impact: `${g.board.nameOf(id)} loses ${lost} ${lost === 1 ? "army" : "armies"} to revolt.` };
  },
  (g) => { const id = rand(playableIds(g)); g.state.get(id).armies += 3; return { title: "Mustering", impact: `Reinforcements gather in ${g.board.nameOf(id)} (+3).` }; },
  (g) => {
    let big = null;
    for (const id of playableIds(g)) if (!big || g.state.get(id).armies > g.state.get(big).armies) big = id;
    const c = g.state.get(big);
    if (c.armies < 2) return { title: "Plague", impact: "A sickness spreads, but no host is large enough to matter." };
    const lost = Math.min(c.armies - 1, Math.max(1, Math.floor(c.armies / 3)));
    c.armies -= lost;
    return { title: "Plague", impact: `The great host in ${g.board.nameOf(big)} is struck (−${lost}).` };
  },
  () => ({ title: "Uneasy Peace", impact: "The continent holds its breath — nothing happens this round." }),
];

// Resets per-round modifiers, runs a random event, records it on g.event; returns it.
export function fireEvent(g) {
  g.roundMods = { reinforceDelta: 0, doubleRegion: null };
  const { title, impact } = rand(EVENTS)(g);
  g.event = { title, impact, round: g.round, id: Math.random() };
  return g.event;
}
