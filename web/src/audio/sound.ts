/**
 * Skim sound, synthesised with Web Audio: a nylon-string guitar (Karplus–Strong) picking slow arpeggios,
 * the lap of the lake, birdsong by day and crickets at night; the stone's flick, the bright plip of each
 * skip rising in pitch as the stone skips on, a lily pad's soft boing, a rock's clack, the warm chime of a
 * lantern catching, and the glug of a stone going under.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
const PROG = [[0, 7, 12, 16, 19], [-3, 4, 9, 12, 16], [5, 9, 12, 17, 21], [7, 11, 14, 19, 23]];
const ROOTS = [146.83, 130.81, 110];
const SKIPSCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private seed = 21;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private strings = new Map<number, AudioBuffer>();

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.4);
      const wet = ctx.createGain(); wet.gain.value = 0.28;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      // the lake lapping at the bank
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      const g = ctx.createGain(); g.gain.value = 0.02;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.23; const lg = ctx.createGain(); lg.gain.value = 0.014;
      lfo.connect(lg).connect(g.gain); lfo.start();
      src.connect(lp).connect(g).connect(this.music); src.start();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.55 * (this.ducked ? 0.5 : 1), t, 0.25);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  private schedule() {
    const ctx = this.ctx!;
    const step = 60 / 72 / 2;
    const root = ROOTS[this.chapter % 3];
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next;
      const chord = PROG[Math.floor(this.beatN / 16) % PROG.length];
      const pos = this.beatN % 16;
      // travis-ish picking: bass on the beat, the upper strings between
      if (pos % 4 === 0) this.pluck(t, semis(root, chord[0] - (pos === 8 ? 5 : 0)), 0.11, this.music);
      else if (pos % 2 === 0 || this.rnd() < 0.35) this.pluck(t, semis(root, chord[1 + Math.floor(this.rnd() * 4)]), 0.06 + this.rnd() * 0.03, this.music);
      // the world around the lake
      if (this.chapter < 2 && this.rnd() < 0.012) this.bird(t);
      if (this.chapter === 2 && pos % 3 === 0 && this.rnd() < 0.5) this.cricket(t);
      this.next += step; this.beatN++;
    }
  }
  /** Karplus–Strong: a burst of noise through a tuned, damped delay line, cached per pitch. */
  private pluck(t: number, f: number, vol: number, bus: GainNode) {
    const ctx = this.ctx!;
    const key = Math.round(f * 10);
    let buf = this.strings.get(key);
    if (!buf) {
      const sr = ctx.sampleRate, n = Math.floor(sr * 2.2), period = Math.round(sr / f);
      buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < period; i++) d[i] = (Math.random() * 2 - 1) * 0.8;
      for (let i = period; i < n; i++) d[i] = 0.4985 * (d[i - period] + d[i - period + 1]) * (1 - 0.00002);
      this.strings.set(key, buf);
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(lp).connect(g).connect(bus); src.start(t);
  }
  private bird(t: number) {
    const ctx = this.ctx!;
    const f = 2800 + this.rnd() * 1600;
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const s = t + k * 0.11;
      o.type = 'sine'; o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * (k % 2 ? 0.8 : 1.3), s + 0.08);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.012, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
      o.connect(g).connect(this.music); o.start(s); o.stop(s + 0.1);
    }
  }
  private cricket(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain();
    o.frequency.value = 4400; am.frequency.value = 38; ag.gain.value = 0.006;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.006, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.16);
    am.connect(ag).connect(g.gain);
    o.connect(g).connect(this.music); o.start(t); o.stop(t + 0.18); am.start(t); am.stop(t + 0.18);
  }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return bp;
  }
  private plip(t: number, f: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 0.7, t); o.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.15);
  }
  tap() { if (this.ctx) this.pluck(this.ctx.currentTime, 392, 0.08, this.sfx); }
  pick() { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, 0.03, 0.05, 3000, 3); this.hiss(t + 0.03, 0.03, 0.03, 2400, 3); } }
  cancel() { if (this.ctx) this.hiss(this.ctx.currentTime, 0.1, 0.02, 900, 1); }
  throwStone(speed: number) { if (this.ctx) { const t = this.ctx.currentTime; const bp = this.hiss(t, 0.28, 0.05 + speed / 560 * 0.05, 1200, 1); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.25); } }
  /** Each skip a plip, climbing the scale; harder skips ring brighter. */
  skip(n: number, speed: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] * 4;
    this.plip(t, semis(root, SKIPSCALE[Math.min(SKIPSCALE.length - 1, n - 1)]), 0.05 + Math.min(0.05, speed / 8000));
    this.hiss(t, 0.06, 0.03, 5000, 2);
  }
  pad() { if (this.ctx) { const t = this.ctx.currentTime; const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.12); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.3); } }
  rock() { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, 0.05, 0.12, 2200, 4); this.hiss(t + 0.01, 0.08, 0.05, 900, 2); } }
  lantern(n: number, total: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] * 2;
    this.hiss(t, 0.35, 0.03, 700, 0.8);
    [0, 7, 12].forEach((d, k) => this.pluck(t + k * 0.06, semis(root, d + Math.min(12, (n - 1) * 2)), 0.09, this.sfx));
    if (n === total) this.pluck(t + 0.3, semis(root, 24), 0.08, this.sfx);
  }
  sink(why: string) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (why === 'reeds') { this.hiss(t, 0.18, 0.05, 1600, 0.8); return; }
    if (why === 'duck') { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.15); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3; o.connect(bp).connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.2); }
    this.plip(t, 260, 0.08); this.plip(t + 0.08, 180, 0.05); this.hiss(t, 0.25, 0.04, 700, 1);
  }
  finish(stars: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] * 2;
    [0, 4, 7, 12, 16].slice(0, 2 + stars).forEach((d, i) => this.pluck(t + i * 0.12, semis(root, d), 0.11, this.sfx));
  }
  star(i: number) { if (this.ctx) this.pluck(this.ctx.currentTime, [587.33, 739.99, 880][i] ?? 880, 0.1, this.sfx); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
}
export const sound = new Sound();
