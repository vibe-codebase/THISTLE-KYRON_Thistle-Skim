import { describe, expect, it } from 'vitest';
import { CHAPTERS, LEVELS, stonesFor } from '../game/levels';
import { aimFromDrag, launch, simulate, solve, starsFor, step, MAX_SPEED, type Course, type Ev } from '../game/sim';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

const lake = (o: Partial<Course> = {}): Course => ({ length: 760, lanterns: [], pads: [], rocks: [], reeds: [], ducks: [], wind: 0, ...o });

describe('a skimmed stone', () => {
  it('skips when thrown flat and fast, each skip shorter than the last, then sinks', () => {
    const r = simulate(lake(), 4, 520);
    const xs = r.events.filter((e): e is Extract<Ev, { k: 'skip' }> => e.k === 'skip').map((e) => e.x);
    expect(xs.length).toBeGreaterThanOrEqual(4);
    for (let i = 2; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeLessThan(xs[i - 1] - xs[i - 2] + 1);
    expect(r.events.at(-1)!.k).toBe('sink');
  });
  it('sinks at once when it meets the water too steeply or too slowly', () => {
    expect(simulate(lake(), 30, 420).skips).toBe(0);
    expect(simulate(lake(), 0, 130).skips).toBe(0);
  });
  it('is exactly repeatable', () => {
    const c = LEVELS[15];
    expect(simulate(c, 7.5, 501)).toEqual(simulate(c, 7.5, 501));
  });
  it('lily pads spring it high; reeds and ducks stop it; rocks turn it', () => {
    const pads = simulate(lake({ pads: [{ x: 0, w: 2000 }] }), 0, 400);
    expect(pads.events.filter((e) => e.k === 'pad').length).toBeGreaterThan(1);
    expect(simulate(lake({ reeds: [{ x: 0, w: 2000 }] }), 0, 500).events.at(-1)).toEqual(expect.objectContaining({ why: 'reeds' }));
    const duck = simulate(lake({ ducks: [{ x: 150, range: 0, speed: 0 }] }), -2, 500);
    expect(duck.events.some((e) => e.k === 'sink' && e.why === 'duck')).toBe(true);
    const rock = simulate(lake({ rocks: [{ x: 120, y: 0, r: 30 }] }), 0, 500);
    expect(rock.events.some((e) => e.k === 'rock')).toBe(true);
  });
  it('lights a lantern it passes, once', () => {
    const s = launch(0, 400), ev: Ev[] = [];
    const c = lake({ lanterns: [{ x: 30, y: 30, r: 14 }] });
    for (let i = 0; i < 200; i++) step(c, s, 0, ev);
    expect(s.lit).toEqual([0]);
    expect(ev.filter((e) => e.k === 'lit')).toHaveLength(1);
  });
  it('aims from a drag: pulling back throws forward, and speed is capped', () => {
    const a = aimFromDrag(-100, 10);
    expect(a.speed).toBeGreaterThan(300); expect(a.angle).toBeGreaterThan(0);
    expect(aimFromDrag(-1000, 0).speed).toBe(MAX_SPEED);
  });
});

describe('lakes', () => {
  it('has 24 lakes, 8 per chapter, with hazards arriving chapter by chapter', () => {
    expect(LEVELS).toHaveLength(24);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    CHAPTERS.forEach((_, c) => expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8));
    for (const l of LEVELS.filter((x) => x.chapter === 0)) expect(l.pads.length + l.rocks.length + l.reeds.length + l.ducks.length).toBe(0);
    expect(LEVELS.filter((l) => l.chapter === 2).every((l) => l.ducks.length > 0 || l.wind !== 0 || l.lanterns.some((x) => x.y > 50))).toBe(true);
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s: par throws really light every lantern', (_id, l) => {
    const s = solve(l, 72, 72);
    expect(s.par).toBe(l.par);
    const lit = new Set<number>();
    for (const t of s.throws) simulate({ ...l, ducks: [] }, t.angle, t.speed).lit.forEach((i) => lit.add(i));
    expect(lit.size).toBe(l.lanterns.length);
    expect(stonesFor(l)).toBe(l.par + 2);
  });
  it('stars: par for three, one over for two', () => { expect(starsFor(2, 2)).toBe(3); expect(starsFor(3, 2)).toBe(2); expect(starsFor(4, 2)).toBe(1); });
});

describe('save', () => {
  it('survives garbage, raises stars, keeps the fewest throws, unlocks in order', () => {
    for (const raw of [null, '', '{', 'null', '[]', '{"v":9}', '{"v":1,"stars":{"m1":"x"}}']) expect(parseSave(raw)).toEqual(expect.objectContaining({ v: 1 }));
    let s = freshSave();
    expect(isUnlocked(s, 1)).toBe(false);
    s = recordResult(s, 'm1', 2, 3); s = recordResult(s, 'm1', 1, 1);
    expect(s.stars.m1).toBe(2); expect(s.best.m1).toBe(1);
    expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(2);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
});
