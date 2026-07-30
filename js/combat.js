// RISK dice: attacker rolls up to 3 dice, defender up to 2; compare highest pairs,
// ties go to the defender, each lost comparison costs that side one army.

function roll(n) {
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a);
}

export function resolveBattle(attackerArmies, defenderArmies) {
  const ad = Math.min(3, attackerArmies - 1);
  const dd = Math.min(2, defenderArmies);
  const a = roll(ad), d = roll(dd);
  let attLoss = 0, defLoss = 0;
  const pairs = Math.min(a.length, d.length);
  for (let i = 0; i < pairs; i++) {
    if (a[i] > d[i]) defLoss++;   // attacker wins this die
    else attLoss++;               // tie or defender higher -> defender wins
  }
  return { a, d, attLoss, defLoss };
}
