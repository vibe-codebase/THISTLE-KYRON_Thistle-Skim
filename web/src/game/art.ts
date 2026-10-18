export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return { c, g: c.getContext('2d')! };
}
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function mix(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export type Mood = { skyTop: string; skyLow: string; hills: [string, string, string]; water: string; waterDeep: string; mist: number; sun: string | null; moon: boolean; glow: string; bank: string; fog: string };
/** Three times of day: a pale misty morning, a green summer afternoon, and lantern night. */
export const MOODS: Mood[] = [
  { skyTop: '#9fb3c9', skyLow: '#f2d9c4', hills: ['#a7b3bf', '#8796a6', '#5f6f7f'], water: '#a9bccb', waterDeep: '#56708a', mist: 0.55, sun: '#fff1d6', moon: false, glow: '#ffcf7a', bank: '#3e4b3a', fog: '#e9e3dc' },
  { skyTop: '#6fb2d6', skyLow: '#e5f1df', hills: ['#8fb79a', '#5f9a72', '#3f7a55'], water: '#7fb5b7', waterDeep: '#2f6a74', mist: 0.18, sun: '#fffbe8', moon: false, glow: '#ffb84f', bank: '#2f4a2c', fog: '#eef6ea' },
  { skyTop: '#0e1630', skyLow: '#2f3a68', hills: ['#273055', '#1c2444', '#121a33'], water: '#24305a', waterDeep: '#0b1124', mist: 0.12, sun: null, moon: true, glow: '#ffb347', bank: '#0d1322', fog: '#3a4473' },
];

/** The sky, fixed to the screen: gradient, sun or moon and stars, and a band of haze at the horizon. */
export function skyTexture(m: Mood, W: number, H: number, waterY: number, r: number, seed: number) {
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  const gr = g.createLinearGradient(0, 0, 0, waterY);
  gr.addColorStop(0, m.skyTop); gr.addColorStop(1, m.skyLow);
  g.fillStyle = gr; g.fillRect(0, 0, W, waterY + 2);
  const rand = rng(seed);
  if (m.moon) {
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,240,${0.2 + rand() * 0.7})`; const s = rand() < 0.1 ? 1.4 : 0.8; g.fillRect(rand() * W, rand() * waterY * 0.8, s, s); }
    const mx = W * 0.72, my = waterY * 0.28;
    const halo = g.createRadialGradient(mx, my, 6, mx, my, 90); halo.addColorStop(0, 'rgba(255,248,220,0.35)'); halo.addColorStop(1, 'rgba(255,248,220,0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, waterY);
    g.fillStyle = '#fbf3da'; g.beginPath(); g.arc(mx, my, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(200,190,160,0.25)'; g.beginPath(); g.arc(mx - 4, my - 3, 3.5, 0, Math.PI * 2); g.arc(mx + 5, my + 4, 2.5, 0, Math.PI * 2); g.fill();
  } else if (m.sun) {
    const sx = W * 0.25, sy = waterY * 0.42;
    const halo = g.createRadialGradient(sx, sy, 6, sx, sy, 160); halo.addColorStop(0, hexA(m.sun, 0.8)); halo.addColorStop(0.15, hexA(m.sun, 0.25)); halo.addColorStop(1, hexA(m.sun, 0));
    g.fillStyle = halo; g.fillRect(0, 0, W, waterY);
    g.fillStyle = hexA(m.sun, 0.95); g.beginPath(); g.arc(sx, sy, 16, 0, Math.PI * 2); g.fill();
  }
  // soft clouds
  for (let i = 0; i < 7; i++) {
    const x = rand() * W, y = 20 + rand() * waterY * 0.5, w = 50 + rand() * 90;
    g.save(); g.filter = 'blur(6px)'; g.fillStyle = m.moon ? 'rgba(80,90,140,0.25)' : 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(x, y, w, 8 + rand() * 6, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  return c;
}

/** A strip of hills (tileable), lighter and hazier the further away. */
export function hillsTexture(m: Mood, layer: number, w: number, h: number, r: number, seed: number) {
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const rand = rng(seed);
  const col = m.hills[layer];
  const base = h, amp = [18, 24, 16][layer], k1 = [2, 3, 5][layer], k2 = [5, 7, 11][layer];
  const ph = rand() * 6, ph2 = rand() * 6;
  // integer frequencies around the strip, so it tiles seamlessly
  const ridge = (x: number) => { const t = (x / w) * Math.PI * 2; return base - amp - Math.sin(k1 * t + ph) * amp * 0.6 - Math.sin(k2 * t + ph2) * amp * 0.25; };
  g.fillStyle = col;
  g.beginPath(); g.moveTo(0, base);
  for (let x = 0; x <= w; x += 3) g.lineTo(x, ridge(x));
  g.lineTo(w, base); g.closePath(); g.fill();
  if (layer === 2) {
    // a line of trees along the nearest hills
    for (let x = 0; x < w; x += 3 + rand() * 5) {
      const y = ridge(x), th = 6 + rand() * 12;
      g.beginPath(); g.moveTo(x - 3, y + 2); g.lineTo(x, y - th); g.lineTo(x + 3, y + 2); g.closePath(); g.fill();
    }
  }
  const fog = g.createLinearGradient(0, base - amp * 2.2, 0, base);
  fog.addColorStop(0, hexA(m.fog, 0)); fog.addColorStop(1, hexA(m.fog, m.mist * (1 - layer * 0.25)));
  g.fillStyle = fog; g.fillRect(0, 0, w, h);
  return c;
}

/** The lake below the horizon: deepening colour, a sheen, and fine wavelets. */
export function waterTexture(m: Mood, W: number, h: number, r: number, seed: number) {
  const { c, g } = canvas(W * r, h * r);
  g.scale(r, r);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, mix(m.water, m.skyLow, 0.35)); gr.addColorStop(0.15, m.water); gr.addColorStop(1, m.waterDeep);
  g.fillStyle = gr; g.fillRect(0, 0, W, h);
  const rand = rng(seed);
  for (let i = 0; i < 220; i++) {
    const y = Math.pow(rand(), 1.6) * h, len = 6 + rand() * 30 * (1 - y / h * 0.5);
    g.strokeStyle = rand() < 0.5 ? `rgba(255,255,255,${0.04 + rand() * 0.08})` : `rgba(0,0,30,${0.04 + rand() * 0.06})`;
    g.lineWidth = 0.7; const x = rand() * W;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
  }
  return c;
}

/** The near bank at the start: grass, a few stones, and the end of a little wooden jetty. */
export function bankTexture(m: Mood, r: number) {
  const w = 90, h = 70;
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const rand = rng(9);
  g.fillStyle = m.bank;
  g.beginPath(); g.moveTo(0, 18); g.quadraticCurveTo(40, 14, 62, 30); g.quadraticCurveTo(72, 38, 74, 46); g.lineTo(0, 46); g.closePath(); g.fill();
  for (let i = 0; i < 70; i++) { const x = rand() * 66, y = 22 + rand() * 6; g.strokeStyle = m.bank; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + (rand() - 0.5) * 4, y - 6 - rand() * 8); g.stroke(); }
  // jetty planks on posts
  g.fillStyle = mix(m.bank, '#8a6a48', 0.6);
  g.fillRect(30, 36, 50, 4);
  for (const x of [36, 56, 76]) g.fillRect(x, 38, 2.4, 14);
  // reflection
  g.fillStyle = hexA(m.bank, 0.4); g.fillRect(0, 46, 76, 6); g.fillRect(30, 52, 50, 2);
  return c;
}

/** A paper lantern: lit (warm, with a glow) or dark. Floating ones sit on a little float. */
export function lanternTexture(m: Mood, lit: boolean, floating: boolean, r: number) {
  const w = 40, h = 52;
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const cx = w / 2, cy = 22;
  if (lit) {
    const glow = g.createRadialGradient(cx, cy, 2, cx, cy, 20);
    glow.addColorStop(0, hexA(m.glow, 0.7)); glow.addColorStop(1, hexA(m.glow, 0));
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
  }
  // body: a rounded paper box with ribs
  const body = lit ? mix(m.glow, '#fff5df', 0.35) : mix('#d9cbb2', m.waterDeep, m.moon ? 0.55 : 0.15);
  g.fillStyle = body;
  g.beginPath(); g.ellipse(cx, cy, 8.5, 10.5, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = lit ? 'rgba(170,80,20,0.45)' : 'rgba(60,50,40,0.35)'; g.lineWidth = 0.7;
  for (const dx of [-4.5, 0, 4.5]) { g.beginPath(); g.ellipse(cx + dx * 0.2, cy, Math.abs(dx) + 1.2, 10.3, 0, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = lit ? '#b4472b' : '#5a4436';
  g.fillRect(cx - 5, cy - 12, 10, 2.4); g.fillRect(cx - 5, cy + 9.6, 10, 2.4);
  if (floating) { g.fillStyle = mix('#7a5a3e', m.waterDeep, 0.2); g.beginPath(); g.ellipse(cx, cy + 14, 10, 2.6, 0, 0, Math.PI * 2); g.fill(); }
  else { g.strokeStyle = 'rgba(40,30,20,0.45)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(cx, cy + 12); g.lineTo(cx, h); g.stroke(); }
  return c;
}

/** A lily pad with its notch, and sometimes a flower. */
export function padTexture(w: number, r: number, flower: boolean, night: boolean) {
  const h = 16;
  const { c, g } = canvas((w + 4) * r, h * r);
  g.scale(r, r);
  const cx = (w + 4) / 2, cy = 9;
  g.fillStyle = night ? '#1d4a3a' : '#4f8f4b';
  g.beginPath(); g.ellipse(cx, cy, w / 2, 3.6, 0, 0.25, Math.PI * 2 - 0.05); g.lineTo(cx, cy); g.closePath(); g.fill();
  g.strokeStyle = night ? 'rgba(120,200,160,0.25)' : 'rgba(200,240,170,0.5)'; g.lineWidth = 0.6;
  for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w * 0.45, cy + Math.sin(a) * 3); g.stroke(); }
  if (flower) {
    g.fillStyle = night ? '#d8b6d6' : '#f4c3d6';
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(cx + 4 + (k - 2.5) * 1.6, cy - 4, 1.6, 4, (k - 2.5) * 0.25, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f6d36a'; g.beginPath(); g.arc(cx + 4, cy - 3, 1.4, 0, Math.PI * 2); g.fill();
  }
  return c;
}

/** A boulder breaking the surface, wet and dark at the waterline. */
export function rockTexture(rad: number, r: number, night: boolean) {
  const s = rad * 2 + 6;
  const { c, g } = canvas(s * r, s * r);
  g.scale(r, r);
  const cx = s / 2, cy = s / 2;
  const gr = g.createRadialGradient(cx - rad * 0.4, cy - rad * 0.5, 1, cx, cy, rad * 1.1);
  gr.addColorStop(0, night ? '#5b6378' : '#a7a49a'); gr.addColorStop(1, night ? '#222838' : '#5a5850');
  g.fillStyle = gr;
  g.beginPath();
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = rad * (0.88 + Math.sin(i * 2.3) * 0.08); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92); }
  g.closePath(); g.fill();
  return c;
}

/** A clump of reeds and bulrushes, w wide. */
export function reedsTexture(w: number, r: number, color: string, seed: number) {
  const h = 60;
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const rand = rng(seed);
  g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round';
  for (let i = 0; i < w * 0.9; i++) {
    const x = rand() * w, hh = 18 + rand() * 38, lean = (rand() - 0.5) * 10;
    g.lineWidth = 0.7 + rand() * 0.9;
    g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * 0.2, h - hh * 0.6, x + lean, h - hh); g.stroke();
    if (rand() < 0.22) { g.beginPath(); g.ellipse(x + lean, h - hh - 3, 1.5, 4.5, lean * 0.03, 0, Math.PI * 2); g.fill(); }
  }
  return c;
}

/** A mallard drifting, asleep, head tucked. */
export function duckTexture(r: number, night: boolean) {
  const w = 28, h = 18;
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  g.fillStyle = night ? '#4a4f62' : '#8a7660';
  g.beginPath(); g.ellipse(13, 12, 10, 4.6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(22, 11); g.quadraticCurveTo(26, 6, 23, 9); g.closePath(); g.fill();
  g.fillStyle = night ? '#2b5b4a' : '#2f7a4f';
  g.beginPath(); g.arc(6.5, 8.5, 3.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e0a83a'; g.beginPath(); g.ellipse(3.6, 9.4, 1.8, 0.9, 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2efe6'; g.fillRect(9.2, 10, 1.4, 1.2);
  return c;
}

/** The skimming stone: a flat, smooth pebble seen edge-on. */
export function stoneTexture(r: number) {
  const w = 12, h = 6;
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#c8c6c0'); gr.addColorStop(1, '#5f5d58');
  g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h / 2, 5.4, 2.2, 0, 0, Math.PI * 2); g.fill();
  return c;
}
