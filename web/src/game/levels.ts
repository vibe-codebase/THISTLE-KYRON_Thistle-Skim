import type { Course, Lantern, Pad, Rock, Reeds, Duck } from './sim';

export type Level = Course & { id: string; name: string; chapter: number; par: number; hint?: string };

export const CHAPTERS = [
  { name: 'Morning Mist', blurb: 'Floating lanterns on a still lake. Throw flat and fast, and land a skip beside each one.' },
  { name: 'Lily Pond', blurb: 'Lily pads spring the stone high, rocks turn it, and reeds swallow it.' },
  { name: 'Lantern Night', blurb: 'Ducks asleep on the water, wind off the hills, and lanterns hung high over the lake.' },
];

const F = (x: number, r = 12): Lantern => ({ x, y: 5, r });
const H = (x: number, y: number, r = 13): Lantern => ({ x, y, r });
const P = (x: number, w = 34): Pad => ({ x, w });
const R = (x: number, r = 14, y = -4): Rock => ({ x, y, r });
const Rd = (x: number, w = 40): Reeds => ({ x, w });
const D = (x: number, range = 30, speed = 0.9): Duck => ({ x, range, speed });

type Draft = Omit<Level, 'chapter' | 'par' | 'pads' | 'rocks' | 'reeds' | 'ducks' | 'wind' | 'length'> & Partial<Pick<Level, 'pads' | 'rocks' | 'reeds' | 'ducks' | 'wind' | 'length'>>;

const MIST: Draft[] = [
  { id: 'm1', name: 'First Stone', lanterns: [F(200)], hint: 'Pull back from the stone and let go. A low, flat throw skips; a steep one sinks.' },
  { id: 'm2', name: 'Two Lights', lanterns: [F(160), F(380)], hint: 'Each skip lands shorter than the last. Light both in one throw if you can.' },
  { id: 'm3', name: 'Far Shore', lanterns: [F(520), F(640)] },
  { id: 'm4', name: 'Near and Far', lanterns: [F(110), F(600)], hint: 'You have a few stones. The fewer you use, the more stars.' },
  { id: 'm5', name: 'Stepping', lanterns: [F(250), F(420), F(500)] },
  { id: 'm6', name: 'Heron', lanterns: [F(140), H(240, 40), F(450)] },
  { id: 'm7', name: 'Ripples', lanterns: [F(200), F(330), F(560), F(690)] },
  { id: 'm8', name: 'Mist Lifts', lanterns: [H(120, 52), F(300), F(470), F(610), H(380, 30)] },
];
const POND: Draft[] = [
  { id: 'p1', name: 'Lily Pad', lanterns: [H(280, 60)], pads: [P(190)], hint: 'Lily pads are springy: whatever hits one bounces high.' },
  { id: 'p2', name: 'Over the Reeds', lanterns: [F(150), F(460)], reeds: [Rd(240, 90)], hint: 'Reeds catch the stone. Skip over them.' },
  { id: 'p3', name: 'Rock', lanterns: [F(130), H(330, 46)], rocks: [R(260, 16)], hint: 'A rock throws the stone off at an angle.' },
  { id: 'p4', name: 'Pad to Pad', lanterns: [H(230, 55), H(430, 50), F(560)], pads: [P(150), P(360)] },
  { id: 'p5', name: 'Narrows', lanterns: [F(300), F(520)], reeds: [Rd(160, 70), Rd(380, 70)] },
  { id: 'p6', name: 'Stone Garden', lanterns: [F(180), H(300, 40), F(470), F(590)], rocks: [R(250, 14), R(400, 13, -6)] },
  { id: 'p7', name: 'Water Lilies', lanterns: [H(200, 64), H(360, 70), F(500), F(640)], pads: [P(130), P(290), P(440, 28)], reeds: [Rd(560, 40)] },
  { id: 'p8', name: 'The Pond', lanterns: [F(120), H(250, 50), F(400), H(520, 46), F(680)], pads: [P(190)], rocks: [R(450, 15)], reeds: [Rd(300, 50), Rd(590, 50)] },
];
const NIGHT: Draft[] = [
  { id: 'n1', name: 'Sleeping Duck', lanterns: [F(200), F(420)], ducks: [D(300, 26, 0.6)], hint: 'Ducks drift on the water. Time your throw so the stone misses them.' },
  { id: 'n2', name: 'Night Breeze', lanterns: [F(380), F(560)], wind: -40, hint: 'Wind off the hills slows the stone. Throw harder.' },
  { id: 'n3', name: 'High Lantern', lanterns: [H(180, 80), F(420)], pads: [P(110, 40)] },
  { id: 'n4', name: 'Two Ducks', lanterns: [F(160), F(360), F(560)], ducks: [D(250, 28, 0.8), D(470, 22, 1.1)] },
  { id: 'n5', name: 'Tailwind', lanterns: [F(300), F(620), F(760)], wind: 35, length: 900 },
  { id: 'n6', name: 'Moon Path', lanterns: [H(150, 46), F(330), H(470, 40), F(620)], pads: [P(400)], rocks: [R(210, 14)], wind: -20 },
  { id: 'n7', name: 'Reed Bed', lanterns: [F(140), F(330), F(520), F(700)], reeds: [Rd(200, 60), Rd(400, 60), Rd(590, 50)], ducks: [D(460, 20, 0.7)], length: 820 },
  { id: 'n8', name: 'Festival', lanterns: [H(120, 70), F(260), H(380, 55), F(500), H(620, 60), F(720)], pads: [P(60, 30), P(330, 30), P(570, 30)], rocks: [R(430, 14)], reeds: [Rd(660, 30)], ducks: [D(200, 24, 0.9)], wind: 15, length: 840 },
];

/** Par, from solve() in sim.ts (tools/par.ts): the fewest throws that light every lantern. */
const PAR: Record<string, number> = { m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 2, m7: 1, m8: 2, p1: 1, p2: 1, p3: 1, p4: 2, p5: 1, p6: 2, p7: 2, p8: 3, n1: 1, n2: 1, n3: 1, n4: 1, n5: 1, n6: 2, n7: 2, n8: 2 };

const fin = (d: Draft[], chapter: number): Level[] => d.map((x) => ({ pads: [], rocks: [], reeds: [], ducks: [], wind: 0, length: 760, ...x, chapter, par: PAR[x.id] ?? 3 }));
export const LEVELS: Level[] = [...fin(MIST, 0), ...fin(POND, 1), ...fin(NIGHT, 2)];
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
/** Stones in hand: par plus two. */
export const stonesFor = (l: Level) => l.par + 2;
