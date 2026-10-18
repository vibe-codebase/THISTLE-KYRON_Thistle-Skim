import { LEVELS } from '../src/game/levels';
import { simulate, solve, MAX_SPEED } from '../src/game/sim';
// par, plus how forgiving each lantern is: the share of a fine aim grid that lights it at all
for (const l of LEVELS) {
  const t0 = Date.now();
  const so = solve(l, 72, 72);
  const hits = l.lanterns.map(() => 0);
  const N = 48;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const r = simulate({ ...l, ducks: [] }, -10 + (i / (N - 1)) * 55, 120 + (j / (N - 1)) * (MAX_SPEED - 120));
    r.lit.forEach((k) => hits[k]++);
  }
  console.log(l.id.padEnd(3), 'par', so.par, 'sets', so.distinct, 'lanterns', hits.map((h) => (h / (N * N) * 100).toFixed(1) + '%').join(' '), `${Date.now() - t0}ms`);
}
