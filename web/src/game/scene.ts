import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, stonesFor, type Level } from './levels';
import { aimFromDrag, duckX, starsFor, HAND, launch, preview, step, DT, type Ev, type Throw } from './sim';
import { sound } from '../audio/sound';

export type Result = { throws: number; par: number; stars: number; success: boolean; lit: number; total: number };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type HudState = { lit: number; total: number; stones: number; used: number; phase: string; skips: number; lastSkips: number };


/** Bridge between React and the Phaser scene. */
export const lake = {
  hooks: {} as Hooks,
  scene: null as LakeScene | null,
  reducedMotion: false,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  debug() { return this.scene?.debugState(); },
  /** QA only: throw at this angle and speed. */
  qaThrow(angle: number, speed: number) { this.scene?.throwStone(angle, speed); },
  /** QA only: CSS position of the stone in hand. */
  handScreen() { return this.scene?.handScreen(); },
};
(window as unknown as { __lake: typeof lake }).__lake = lake;

const W = 360;
const LEFT = 18;
const ZOOM = 1.55;
const SHOWCASE = ['m7', 'p7', 'n6', 'p4', 'm8'];
// throws the attract mode makes, found with the solver
const DEMO_AIMS: Record<string, [number, number][]> = {
  m7: [[2.978, 560.00]],
  p7: [[-10.000, 510.56], [40.674, 406.74]],
  n6: [[-3.202, 535.28], [9.157, 550.11]],
  p4: [[16.573, 560.00], [25.225, 500.67]],
  m8: [[9.775, 560.00], [22.753, 560.00]],
};

type Obj = { img: Phaser.GameObjects.Image; refl: Phaser.GameObjects.Image | null; x: number; y: number; kind: 'lantern' | 'pad' | 'rock' | 'reeds' | 'duck'; i: number };

export class LakeScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private paused = false;
  private finished = false;
  private acted = false;
  private runId = 0;
  private texSeq = 0;
  private r = 2;
  private H = 700;
  private waterY = 430;
  private cam = { x: -30, z: 0.5 };
  private camT = { x: -30, z: 0.5 };
  private phase: 'aim' | 'fly' | 'rest' | 'done' = 'aim';
  private lit = new Set<number>();
  private used = 0;
  private stone: Throw | null = null;
  private lastSkips = 0;
  private aim: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private clock = 0;
  private acc = 0;
  private restT = 0;
  private ripples: { x: number; t: number; s: number }[] = [];
  private drops: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  private sparks: { x: number; y: number; t: number }[] = [];
  private objs: Obj[] = [];
  private litKey = ''; private darkKey = ''; private litFloatKey = ''; private darkFloatKey = '';
  private hills: Phaser.GameObjects.TileSprite[] = [];
  private bank!: Phaser.GameObjects.Image;
  private shore!: Phaser.GameObjects.Image;
  private stoneImg!: Phaser.GameObjects.Image;
  private g!: Phaser.GameObjects.Graphics;
  private under!: Phaser.GameObjects.Graphics;
  private demoQ: [number, number][] = [];
  private demoIdx = 0;

  constructor() { super('lake'); }

  create() {
    lake.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', () => this.up());
    this.input.on('pointerupoutside', () => this.up());
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0])!);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; this.aim = null; }
  hudState(): HudState { return { lit: this.lit.size, total: this.level.lanterns.length, stones: stonesFor(this.level), used: this.used, phase: this.phase, skips: this.stone?.skips ?? 0, lastSkips: this.lastSkips }; }
  debugState() { return { ...this.hudState(), mode: this.mode, finished: this.finished }; }
  handScreen() { const [x, y] = this.toScreen(HAND.x, HAND.y); const k = (this.game.canvas.clientWidth || W) / W; return { x: x * k, y: y * k }; }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode;
    this.level = level;
    this.paused = false; this.finished = false; this.acted = false;
    this.runId++;
    this.lit = new Set(); this.used = 0; this.stone = null; this.aim = null; this.lastSkips = 0;
    this.phase = 'aim'; this.ripples = []; this.drops = []; this.sparks = [];
    this.demoQ = mode === 'menu' ? [...(DEMO_AIMS[level.id] ?? [])] : [];
    this.restT = mode === 'menu' ? 1.2 : 0;
    this.rebuild();
    this.overview(true);
  }

  // ── view ───────────────────────────────────────────────────────────────
  /** world (x along the lake, y height above water) → screen. */
  private toScreen(x: number, y: number): [number, number] { return [LEFT + (x - this.cam.x) * this.cam.z, this.waterY - y * this.cam.z]; }
  /** Back to the stone in hand. On arrival the camera starts at the far shore and pans home, showing the lake. */
  private overview(snap = false) {
    this.camT = { x: -34, z: ZOOM };
    if (snap) this.cam = { x: Math.max(-34, this.level.length - 170), z: ZOOM };
  }

  private tex(prefix: string, c: HTMLCanvasElement) { const k = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(k, c); return k; }

  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    const pw = this.scale.width, ph = this.scale.height;
    const zoom = pw / W;
    this.r = Math.min(2, Math.max(1, zoom));
    this.H = Math.max(560, ph / zoom);
    this.waterY = Math.round(this.H * 0.56);
    this.cameras.main.setZoom(zoom).centerOn(W / 2, this.H / 2);
    const m = A.MOODS[this.level.chapter], r = this.r, l = this.level;
    this.cameras.main.setBackgroundColor(m.skyTop);
    this.add.image(0, 0, this.tex('sky', A.skyTexture(m, W, this.H, this.waterY, r, 3 + l.chapter))).setOrigin(0, 0).setScale(1 / r);
    this.hills = [0, 1, 2].map((k) => {
      const key = this.tex('hill', A.hillsTexture(m, k, 720, 80, r, 11 + k * 7 + l.chapter));
      return this.add.tileSprite(0, this.waterY + 1, W * r, 80 * r, key).setOrigin(0, 1).setScale(1 / r);
    });
    this.shore = this.add.image(0, 0, this.tex('shore', A.hillsTexture(m, 2, 240, 50, r, 99))).setOrigin(0, 1).setScale(1 / r);
    this.add.image(0, this.waterY, this.tex('water', A.waterTexture(m, W, this.H - this.waterY, r, 5))).setOrigin(0, 0).setScale(1 / r);
    this.under = this.add.graphics();
    const night = l.chapter === 2;
    this.litKey = this.tex('lantern', A.lanternTexture(m, true, false, r)); this.darkKey = this.tex('lantern', A.lanternTexture(m, false, false, r));
    this.litFloatKey = this.tex('lantern', A.lanternTexture(m, true, true, r)); this.darkFloatKey = this.tex('lantern', A.lanternTexture(m, false, true, r));
    this.objs = [];
    const add = (key: string, x: number, y: number, kind: Obj['kind'], i: number, ox = 0.5, oy = 1, refl = true) => {
      const img = this.add.image(0, 0, key).setOrigin(ox, oy);
      const rf = refl ? this.add.image(0, 0, key).setOrigin(ox, oy).setFlipY(true).setAlpha(0.28) : null;
      this.objs.push({ img, refl: rf, x, y, kind, i });
    };
    l.reeds.forEach((rd, i) => add(this.tex('reeds', A.reedsTexture(rd.w, r, m.bank, 30 + i)), rd.x, 0, 'reeds', i, 0, 1));
    l.rocks.forEach((rk, i) => add(this.tex('rock', A.rockTexture(rk.r, r, night)), rk.x, rk.y, 'rock', i, 0.5, 0.5, false));
    l.pads.forEach((pd, i) => add(this.tex('pad', A.padTexture(pd.w, r, i % 2 === 0, night)), pd.x + pd.w / 2, 0, 'pad', i, 0.5, 0.56, false));
    l.ducks.forEach((_, i) => add(this.tex('duck', A.duckTexture(r, night)), 0, 0, 'duck', i, 0.5, 0.8));
    l.lanterns.forEach((ln, i) => add(ln.y < 10 ? this.darkFloatKey : this.darkKey, ln.x, ln.y, 'lantern', i, 0.5, ln.y < 10 ? 0.73 : 0.42));
    this.objs.filter((o) => o.kind === 'lantern').forEach((o) => this.setLantern(o, this.lit.has(o.i)));
    this.bank = this.add.image(0, 0, this.tex('bank', A.bankTexture(m, r))).setOrigin(0.82, 46 / 70);
    this.g = this.add.graphics();
    this.stoneImg = this.add.image(0, 0, this.tex('stone', A.stoneTexture(r)));
  }
  private setLantern(o: Obj, on: boolean) {
    const floating = this.level.lanterns[o.i].y < 10;
    const key = on ? (floating ? this.litFloatKey : this.litKey) : floating ? this.darkFloatKey : this.darkKey;
    o.img.setTexture(key); o.refl?.setTexture(key).setAlpha(on ? 0.45 : 0.2);
  }

  // ── input ──────────────────────────────────────────────────────────────
  private screenPoint(p: Phaser.Input.Pointer) { return this.cameras.main.getWorldPoint(p.x, p.y); }
  private down(p: Phaser.Input.Pointer) {
    if (this.mode !== 'play' || this.paused || this.finished || this.phase !== 'aim') return;
    if (this.used >= stonesFor(this.level)) return;
    const q = this.screenPoint(p);
    this.aim = { x0: q.x, y0: q.y, x1: q.x, y1: q.y };
    sound.pick();
    if (!this.acted) { this.acted = true; lake.hooks.onFirstAction?.(); }
  }
  private move(p: Phaser.Input.Pointer) {
    if (!this.aim || !p.isDown) return;
    const q = this.screenPoint(p);
    this.aim.x1 = q.x; this.aim.y1 = q.y;
  }
  private up() {
    if (!this.aim) return;
    const a = this.aim; this.aim = null;
    const { angle, speed } = aimFromDrag(a.x1 - a.x0, a.y1 - a.y0);
    if (speed < 90 || a.x1 > a.x0 - 6) { sound.cancel(); return; }
    this.throwStone(angle, speed);
  }
  throwStone(angle: number, speed: number) {
    if (this.phase !== 'aim' || this.finished) return;
    this.stone = launch(angle, speed);
    this.used++;
    this.phase = 'fly';
    this.camT = { x: HAND.x - 90, z: ZOOM };
    if (this.mode === 'play') { sound.throwStone(speed); lake.hooks.onHaptic?.('light'); }
  }

  // ── loop ───────────────────────────────────────────────────────────────
  update(_t: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (!this.paused) {
      this.clock += dt;
      if (this.phase === 'fly' && this.stone) {
        this.acc += dt;
        let n = 0;
        const ev: Ev[] = [];
        while (this.acc >= DT && n < 12 && !this.stone.done) { this.acc -= DT; n++; step(this.level, this.stone, this.clock, ev); }
        if (n >= 12) this.acc = 0;
        this.handle(ev);
        if (this.stone.done) { this.phase = 'rest'; this.restT = 1.1; this.lastSkips = this.stone.skips; }
        // follow the stone, ahead of it
        this.camT = { x: Math.max(-34, this.stone.x - 80), z: ZOOM };
      } else if (this.phase === 'rest') {
        this.restT -= dt;
        if (this.restT <= 0) this.afterThrow();
      } else if (this.phase === 'aim' && this.mode === 'menu') {
        this.restT -= dt;
        if (this.restT <= 0) {
          const a = this.demoQ.shift();
          if (a) this.throwStone(a[0], a[1]);
          else { this.demoIdx = (this.demoIdx + 1) % SHOWCASE.length; this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[this.demoIdx])!); return; }
        }
      }
      // camera eases toward its target
      const k = 1 - Math.pow(this.phase === 'fly' ? 0.002 : 0.12, dt);
      this.cam.x += (this.camT.x - this.cam.x) * k; this.cam.z += (this.camT.z - this.cam.z) * k;
    }
    this.draw(dt);
  }

  private afterThrow() {
    this.stone = null;
    if (this.lit.size === this.level.lanterns.length) { this.finish(true); return; }
    if (this.used >= stonesFor(this.level)) { this.finish(false); return; }
    this.phase = 'aim'; this.overview();
    if (this.mode === 'menu') this.restT = 1.4;
  }

  private handle(ev: Ev[]) {
    const play = this.mode === 'play';
    for (const e of ev) {
      if (e.k === 'skip') { this.ripples.push({ x: e.x, t: 0, s: Math.min(1.4, e.speed / 300) }); if (play) { sound.skip(e.n, e.speed); lake.hooks.onHaptic?.('light'); } }
      else if (e.k === 'pad') { this.ripples.push({ x: e.x, t: 0, s: 0.7 }); if (play) sound.pad(); }
      else if (e.k === 'rock') { if (play) sound.rock(); }
      else if (e.k === 'lit') {
        this.lit.add(e.i);
        const o = this.objs.find((x) => x.kind === 'lantern' && x.i === e.i)!;
        this.setLantern(o, true);
        const ln = this.level.lanterns[e.i];
        for (let k = 0; k < 14; k++) this.sparks.push({ x: ln.x, y: ln.y + 2, t: -k * 0.02 });
        if (play) { sound.lantern(this.lit.size, this.level.lanterns.length); lake.hooks.onHaptic?.('medium'); }
      } else if (e.k === 'sink') {
        this.ripples.push({ x: e.x, t: 0, s: 0.9 });
        if (!this.reduced()) for (let k = 0; k < 12; k++) this.drops.push({ x: e.x, y: 0, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 90, t: 0 });
        if (play) sound.sink(e.why);
      }
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true; this.phase = 'done';
    if (this.mode !== 'play') return;
    const l = this.level;
    const result: Result = { throws: this.used, par: l.par, stars: success ? starsFor(this.used, l.par) : 0, success, lit: this.lit.size, total: l.lanterns.length };
    sound.finish(result.stars);
    lake.hooks.onHaptic?.(success ? 'success' : 'warning');
    const run = this.runId;
    window.setTimeout(() => { if (run === this.runId) lake.hooks.onFinish?.({ level: l, result }); }, 900);
  }
  private reduced() { return lake.reducedMotion; }

  /** A strip map of the whole lake under the title: hazards, lanterns (lit or not), the stone, and the view. */
  private drawMap(g: Phaser.GameObjects.Graphics) {
    const l = this.level, x0 = 40, w = W - 80, y = 66, k = w / (l.length + 60), X = (x: number) => x0 + (x + 30) * k;
    g.fillStyle(0x0d1622, 0.28); g.fillRoundedRect(x0 - 6, y - 9, w + 12, 18, 9);
    g.lineStyle(1, 0xffffff, 0.35); g.lineBetween(x0, y + 3, x0 + w, y + 3);
    g.fillStyle(0x4f8f4b, 0.9); for (const p of l.pads) g.fillRect(X(p.x), y + 2, Math.max(2, p.w * k), 2);
    g.fillStyle(0x2f3a2a, 0.9); for (const r of l.reeds) g.fillRect(X(r.x), y - 1, Math.max(2, r.w * k), 4);
    g.fillStyle(0x8a877e, 1); for (const r of l.rocks) g.fillCircle(X(r.x), y + 3, 2);
    g.fillStyle(0xe8dcc8, 1); for (const d of l.ducks) g.fillCircle(X(duckX(d, this.clock)), y + 2, 1.6);
    const glow = Phaser.Display.Color.HexStringToColor(A.MOODS[l.chapter].glow).color;
    l.lanterns.forEach((ln, i) => {
      const on = this.lit.has(i), lx = X(ln.x), ly = y + 1 - Math.min(6, ln.y * 0.08);
      if (on) { g.fillStyle(glow, 0.35); g.fillCircle(lx, ly, 4.5); }
      g.fillStyle(on ? glow : 0xffffff, on ? 1 : 0.55); g.fillCircle(lx, ly, 2.2);
    });
    // the part of the lake on screen
    const v0 = this.cam.x, v1 = this.cam.x + (W - LEFT) / this.cam.z;
    g.lineStyle(1, 0xffffff, 0.5); g.strokeRoundedRect(X(Math.max(-30, v0)), y - 7, Math.max(6, (Math.min(l.length + 30, v1) - Math.max(-30, v0)) * k), 14, 4);
    if (this.stone) { g.fillStyle(0xffffff, 1); g.fillCircle(X(this.stone.x), y + 1 - Math.min(6, this.stone.y * 0.08), 1.8); }
  }

  // ── drawing ────────────────────────────────────────────────────────────
  private draw(dt: number) {
    const z = this.cam.z, m = A.MOODS[this.level.chapter], l = this.level;
    const S = (x: number, y: number) => this.toScreen(x, y);
    // parallax hills
    this.hills.forEach((h, k) => { h.tilePositionX = this.cam.x * [0.12, 0.22, 0.38][k] * this.r; });
    const [sx0] = S(l.length + 30, 0);
    this.shore.setPosition(sx0, this.waterY + 1).setScale(Math.max(0.6, z) / this.r);
    const [bx, by] = S(HAND.x, 0);
    this.bank.setPosition(bx - 4 * z, by).setScale(z * 1.3 / this.r);
    // objects
    const bob = this.reduced() ? 0 : Math.sin(this.clock * 1.6) * 1.2;
    for (const o of this.objs) {
      let x = o.x, y = o.y;
      if (o.kind === 'duck') { x = duckX(l.ducks[o.i], this.clock); y = 0; o.img.setFlipX(Math.cos(this.clock * l.ducks[o.i].speed) < 0); o.refl?.setFlipX(o.img.flipX); }
      if (o.kind === 'lantern') y = o.y + (o.y < 10 ? bob * 0.6 : bob * 1.4 + Math.sin(this.clock * 0.9 + o.i) * 1.5);
      const [px, py] = S(x, y);
      o.img.setPosition(px, py).setScale(z / this.r);
      if (o.refl) { const [, wy] = S(x, 0); o.refl.setPosition(px, wy + (wy - py) * 0.9 + 1).setScale(z / this.r, (z / this.r) * 0.9); }
    }
    // under-surface layer: lantern glow streaks on the water, stone shadow
    const u = this.under; u.clear();
    const glow = Phaser.Display.Color.HexStringToColor(m.glow).color;
    // the sun's or moon's path across the water, glittering
    const orbX = m.moon ? W * 0.72 : W * 0.25, orbC = Phaser.Display.Color.HexStringToColor(m.moon ? '#fbf3da' : m.sun ?? '#ffffff').color;
    for (let k = 0; k < 34; k++) {
      const yy = this.waterY + 4 + Math.pow(k / 34, 1.3) * (this.H - this.waterY - 30);
      const flick = this.reduced() ? 0.6 : 0.5 + 0.5 * Math.sin(this.clock * (2 + (k % 5)) + k * 1.7);
      const ww = (26 + k * 1.6) * (0.4 + flick * 0.6);
      u.fillStyle(orbC, (0.32 - k * 0.006) * flick); u.fillRect(orbX - ww / 2 + Math.sin(k * 2.3 + this.clock) * 4, yy, ww, 1.4 + k * 0.05);
    }
    for (const i of this.lit) {
      const ln = l.lanterns[i]; const [px] = S(ln.x, 0);
      for (let k = 0; k < 6; k++) { const w = (14 - k * 1.8) * z; u.fillStyle(glow, 0.22 - k * 0.03); u.fillRect(px - w / 2 + Math.sin(this.clock * 2 + k) * 1.5, this.waterY + 3 + k * 4 * z, w, 1.6 * z); }
    }
    const g = this.g; g.clear();
    // ripples: flattened rings that widen and fade
    this.ripples = this.ripples.filter((rp) => (rp.t += dt) < 2.2);
    for (const rp of this.ripples) {
      const [px] = S(rp.x, 0), e = rp.t / 2.2;
      for (let k = 0; k < 3; k++) {
        const rr = (6 + (rp.t - k * 0.25) * 34 * rp.s) * z;
        if (rr <= 0) continue;
        g.lineStyle(1.2, 0xffffff, (1 - e) * 0.55 * (1 - k * 0.25));
        g.strokeEllipse(px, this.waterY + 1, rr * 2, rr * 0.36);
      }
    }
    this.drops = this.drops.filter((d) => (d.t += dt) < 0.9);
    for (const d of this.drops) { d.vy -= 600 * dt; d.x += d.vx * dt; d.y = Math.max(0, d.y + d.vy * dt); const [px, py] = S(d.x, d.y); g.fillStyle(0xffffff, 0.75 * (1 - d.t / 0.9)); g.fillCircle(px, py, 1.4 * z + 0.3); }
    this.sparks = this.sparks.filter((s) => (s.t += dt) < 1);
    for (const s of this.sparks) { if (s.t < 0) continue; const a = s.t * 9 + s.x; const rr = 6 + s.t * 30; const [px, py] = S(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.7 + s.t * 10); g.fillStyle(glow, 1 - s.t); g.fillCircle(px, py, 1.6 * z + 0.4); }
    // the stone, spinning, with its shadow on the water
    const st = this.stone;
    const showHand = this.phase === 'aim' && !this.finished && this.used < stonesFor(l);
    if (st || showHand) {
      const x = st ? st.x : HAND.x, y = st ? st.y : HAND.y;
      const [px, py] = S(x, y);
      this.stoneImg.setVisible(true).setPosition(px, py).setScale(Math.max(0.7, z) / this.r).setRotation(st ? Math.sin(this.clock * 40) * 0.12 + Math.atan2(-st.vy, st.vx) * 0.3 : -0.1);
      if (st && y < 60) { g.fillStyle(0x000000, 0.18 * (1 - y / 60)); g.fillEllipse(px, this.waterY + 1, 12 * z, 2.4 * z); }
      if (st && !st.done && !this.reduced()) { // a faint trail
        const p = st.path, n = p.length;
        g.lineStyle(1, 0xffffff, 0.22);
        g.beginPath();
        for (let i = Math.max(0, n - 40); i < n; i += 2) { const [qx, qy] = S(p[i], p[i + 1]); if (i === Math.max(0, n - 40)) g.moveTo(qx, qy); else g.lineTo(qx, qy); }
        g.strokePath();
      }
    } else this.stoneImg.setVisible(false);
    // aiming: the pull, and the first arc dotted ahead
    if (this.aim && this.phase === 'aim') {
      const a = this.aim, { angle, speed } = aimFromDrag(a.x1 - a.x0, a.y1 - a.y0);
      const [hx, hy] = S(HAND.x, HAND.y);
      g.lineStyle(1.5, 0xffffff, 0.5); g.lineBetween(hx, hy, hx + (a.x1 - a.x0) * 0.5, hy + (a.y1 - a.y0) * 0.5);
      if (speed > 60 && a.x1 < a.x0 - 4) {
        const pts = preview(l, angle, speed, 2.2);
        for (let i = 0; i + 1 < pts.length; i += 2) { const [qx, qy] = S(pts[i], pts[i + 1]); g.fillStyle(0xffffff, 0.75 - (i / pts.length) * 0.5); g.fillCircle(qx, qy, 1.5); }
        // a power ring around the stone
        const f = speed / 560;
        g.lineStyle(2.4, f > 0.92 ? 0xffd27a : 0xffffff, 0.8); g.beginPath(); g.arc(hx, hy, 14, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.strokePath();
        const steep = angle > 14;
        if (steep) { g.fillStyle(0xff8a6a, 0.9); g.fillCircle(hx + 16, hy - 16, 2.6); }
      }
    }
    if (this.mode === 'play') this.drawMap(g);
    if (this.aim) { /* aiming drawn above */ } else if (this.phase === 'aim' && this.mode === 'play' && !this.finished && !this.acted) {
      // a ghost hand showing the pull
      const [hx, hy] = S(HAND.x, HAND.y), e = (this.clock % 2) / 2;
      g.lineStyle(1.4, 0xffffff, 0.5 * (1 - e)); g.lineBetween(hx, hy, hx - 60 * e, hy + 18 * e);
      g.fillStyle(0xffffff, 0.6 * (1 - e)); g.fillCircle(hx - 60 * e, hy + 18 * e, 6);
    }
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#203040',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 1 },
    scene: [LakeScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}

