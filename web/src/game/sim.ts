/**
 * A skimmed stone, in side view. The lake surface is y = 0 and height is up. A stone that meets the water
 * flat enough and fast enough bounces (losing some speed each time); too steep or too slow and it sinks.
 * Lily pads are springy, rocks deflect, reeds and ducks stop it. Lanterns are lit by passing near them.
 * Fixed time step: every throw is exactly repeatable, which lets the solver find par.
 */
export const DT = 1 / 120;
export const G = 640;
export const HAND = { x: 0, y: 34 };
export const MAX_SPEED = 560;
/** steepest entry (degrees below horizontal) that still skips */
export const SKIP_ANGLE = 26;
export const MIN_SKIP_VX = 110;

export type Lantern = { x: number; y: number; r: number };
export type Pad = { x: number; w: number };
export type Rock = { x: number; y: number; r: number };
export type Reeds = { x: number; w: number };
export type Duck = { x: number; range: number; speed: number };
export type Course = {
  length: number;
  lanterns: Lantern[];
  pads: Pad[];
  rocks: Rock[];
  reeds: Reeds[];
  ducks: Duck[];
  wind: number;
};

export type Ev =
  | { k: 'skip'; x: number; n: number; speed: number }
  | { k: 'pad'; x: number }
  | { k: 'rock'; x: number; y: number }
  | { k: 'lit'; i: number }
  | { k: 'sink'; x: number; why: 'steep' | 'slow' | 'reeds' | 'duck' | 'shore' };

export type Throw = { x: number; y: number; vx: number; vy: number; t: number; skips: number; done: boolean; lit: number[]; path: number[] };

export function launch(angleDeg: number, speed: number): Throw {
  const a = (angleDeg * Math.PI) / 180, s = Math.min(MAX_SPEED, Math.max(0, speed));
  return { x: HAND.x, y: HAND.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, skips: 0, done: false, lit: [], path: [HAND.x, HAND.y] };
}
/** Aim from a drag: pulling back and down from the stone throws it forward and up. */
export function aimFromDrag(dx: number, dy: number, scale = 3.1) {
  // dx, dy in screen units (y down), the vector from press to current finger
  const vx = -dx * scale, vy = dy * scale;
  const speed = Math.min(MAX_SPEED, Math.hypot(vx, vy));
  const angle = (Math.atan2(vy, Math.max(1, vx)) * 180) / Math.PI;
  return { angle: Math.max(-35, Math.min(60, angle)), speed };
}

export const duckX = (d: Duck, t: number) => d.x + Math.sin(t * d.speed) * d.range;

export function step(c: Course, s: Throw, clock: number, events: Ev[]) {
  if (s.done) return;
  const dt = DT;
  s.vy -= G * dt;
  s.vx += c.wind * dt;
  const px = s.x, py = s.y;
  s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
  // lanterns: lit by passing within reach (swept, so fast stones never tunnel past)
  c.lanterns.forEach((l, i) => {
    if (s.lit.includes(i)) return;
    if (segDist(px, py, s.x, s.y, l.x, l.y) < l.r) { s.lit.push(i); events.push({ k: 'lit', i }); }
  });
  // rocks: reflect off the surface normal, losing a little
  for (const r of c.rocks) {
    const dx = s.x - r.x, dy = s.y - r.y, d = Math.hypot(dx, dy);
    if (d < r.r + 3 && d > 0) {
      const nx = dx / d, ny = dy / d, vn = s.vx * nx + s.vy * ny;
      if (vn < 0) { s.vx -= 1.75 * vn * nx; s.vy -= 1.75 * vn * ny; s.vx *= 0.85; s.vy *= 0.85; events.push({ k: 'rock', x: s.x, y: s.y }); }
      s.x = r.x + nx * (r.r + 3); s.y = r.y + ny * (r.r + 3);
    }
  }
  // ducks bob on the surface
  for (const d of c.ducks) {
    const dxk = duckX(d, clock);
    if (Math.abs(s.x - dxk) < 11 && s.y < 15 && s.y > -2) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'duck' }); return; }
  }
  if (s.x < -20) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'shore' }); return; }
  if (s.y <= 0 && s.vy < 0) {
    void py;
    // the moment of meeting the water
    s.y = 0;
    if (c.reeds.some((r) => s.x > r.x && s.x < r.x + r.w)) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'reeds' }); return; }
    if (c.pads.some((p) => s.x > p.x && s.x < p.x + p.w)) {
      s.vy = Math.max(Math.abs(s.vy) * 0.92, 190); s.vx *= 0.9;
      events.push({ k: 'pad', x: s.x });
    } else {
      const ang = (Math.atan2(-s.vy, Math.abs(s.vx)) * 180) / Math.PI;
      if (ang > SKIP_ANGLE) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'steep' }); return; }
      if (Math.abs(s.vx) < MIN_SKIP_VX) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'slow' }); return; }
      s.skips++;
      // a flatter, faster touch keeps more of its lift
      const e = 0.6 + 0.24 * (1 - ang / SKIP_ANGLE);
      s.vy = -s.vy * e; s.vx *= 0.86;
      // too little lift left: the stone skitters a moment and goes under
      if (s.vy < 30) { events.push({ k: 'skip', x: s.x, n: s.skips, speed: Math.hypot(s.vx, s.vy) }); s.done = true; events.push({ k: 'sink', x: s.x + 8, why: 'slow' }); return; }
      events.push({ k: 'skip', x: s.x, n: s.skips, speed: Math.hypot(s.vx, s.vy) });
    }
  }
  if (s.x > c.length + 40) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'shore' }); return; }
  if (s.t > 14) { s.done = true; events.push({ k: 'sink', x: s.x, why: 'slow' }); }
  if (s.path.length < 4000 && ((s.path.length / 2) % 2 === 0)) s.path.push(s.x, s.y);
}
function segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

/** Simulate a whole throw (ducks start where the clock is) and return what it lit. */
export function simulate(c: Course, angle: number, speed: number, clock0 = 0) {
  const s = launch(angle, speed), ev: Ev[] = [];
  let clock = clock0;
  while (!s.done) { step(c, s, clock, ev); clock += DT; }
  return { lit: s.lit, skips: s.skips, x: s.x, events: ev, path: s.path };
}

/** The first arc only, for the aiming guide (until it first meets the water or a rock). */
export function preview(c: Course, angle: number, speed: number, maxT = 3) {
  const s = launch(angle, speed), pts: number[] = [];
  const ev: Ev[] = [];
  for (let t = 0; t < maxT && !s.done; t += DT) {
    const sk = s.skips;
    step({ ...c, ducks: [] }, s, 0, ev);
    if ((Math.round(t / DT) % 6) === 0) pts.push(s.x, s.y);
    if (s.skips > sk || ev.some((e) => e.k === 'rock' || e.k === 'pad')) break;
  }
  pts.push(s.x, s.y);
  return pts;
}

/**
 * Fewest throws that light every lantern: simulate a fine grid of angles and speeds, collect the distinct
 * sets of lanterns each lights, and search for the smallest union that covers all of them.
 */
export function solve(c: Course, angles = 72, speeds = 72) {
  const sets = new Map<number, { angle: number; speed: number }>();
  for (let i = 0; i < angles; i++) for (let j = 0; j < speeds; j++) {
    const angle = -10 + (i / (angles - 1)) * 55, speed = 120 + (j / (speeds - 1)) * (MAX_SPEED - 120);
    const r = simulate({ ...c, ducks: [] }, angle, speed);
    let m = 0; for (const k of r.lit) m |= 1 << k;
    if (m && !sets.has(m)) sets.set(m, { angle, speed });
  }
  const all = (1 << c.lanterns.length) - 1;
  const masks = [...sets.keys()].filter((m) => ![...sets.keys()].some((o) => o !== m && (o & m) === m));
  for (let k = 1; k <= c.lanterns.length; k++) {
    const pick = (start: number, left: number, cover: number, chosen: number[]): number[] | null => {
      if (cover === all) return chosen;
      if (left === 0) return null;
      for (let i = start; i < masks.length; i++) { const r = pick(i + 1, left - 1, cover | masks[i], [...chosen, masks[i]]); if (r) return r; }
      return null;
    };
    const r = pick(0, k, 0, []);
    if (r) return { par: k, throws: r.map((m) => ({ mask: m, ...sets.get(m)! })), distinct: sets.size };
  }
  return { par: Infinity, throws: [], distinct: sets.size };
}

/** Three lanterns for par throws, two for one over, one for any finish within the stones in hand. */
export const starsFor = (throws: number, par: number) => (throws <= par ? 3 : throws <= par + 1 ? 2 : 1);
