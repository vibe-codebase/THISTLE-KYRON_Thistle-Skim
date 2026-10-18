// Store icon, adaptive-icon layers and splash: lantern night on the lake, a stone mid-skip.
import * as A from '../src/game/art';

const NIGHT = A.MOODS[2], MORN = A.MOODS[0];
function scene(g: CanvasRenderingContext2D, W: number, H: number, m: A.Mood, wy: number, k: number, title?: string) {
  g.drawImage(A.skyTexture(m, W / k, H / k, wy / k, k, 4), 0, 0, W, H);
  const hills = [0, 1, 2].map((i) => A.hillsTexture(m, i, 720, 80, k, 11 + i * 7 + 2));
  hills.forEach((h) => g.drawImage(h, 0, wy - 80 * k, 720 * k, 80 * k));
  g.drawImage(A.waterTexture(m, W / k, (H - wy) / k, k, 5), 0, wy, W, H - wy);
  // moon or sun path
  const ox = m.moon ? W * 0.72 : W * 0.25;
  for (let i = 0; i < 30; i++) { const y = wy + 6 + Math.pow(i / 30, 1.3) * (H - wy - 20), w = (30 + i * 2.4) * k * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7))); g.fillStyle = `rgba(255,245,220,${0.3 - i * 0.008})`; g.fillRect(ox - w / 2 + Math.sin(i * 2.3) * 4 * k, y, w, (1.4 + i * 0.05) * k); }
  if (title) {
    g.textAlign = 'center'; g.font = `italic 400 ${200}px "DM Serif Display", serif`;
    g.save(); g.shadowColor = 'rgba(14,24,36,0.6)'; g.shadowBlur = 30; g.fillStyle = '#f6efe2'; g.fillText(title, W / 2, H * 0.22); g.restore();
  }
}
function lantern(g: CanvasRenderingContext2D, m: A.Mood, x: number, y: number, s: number, lit: boolean, floating: boolean, wy: number) {
  const t = A.lanternTexture(m, lit, floating, 4);
  const w = 40 * s, h = 52 * s;
  g.drawImage(t, x - w / 2, y - h * (floating ? 0.73 : 0.42), w, h);
  g.save(); g.globalAlpha = lit ? 0.4 : 0.15; g.translate(0, wy * 2); g.scale(1, -1);
  g.drawImage(t, x - w / 2, y - h * (floating ? 0.73 : 0.42) + h * 0.1, w, h); g.restore();
}
function ripples(g: CanvasRenderingContext2D, x: number, wy: number, s: number, n: number) {
  for (let k = 0; k < n; k++) { g.strokeStyle = `rgba(255,255,255,${0.6 - k * 0.15})`; g.lineWidth = 1.6 * s; g.beginPath(); g.ellipse(x, wy + 2 * s, (14 + k * 14) * s, (2.6 + k * 2.6) * s, 0, 0, Math.PI * 2); g.stroke(); }
}
function stone(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const t = A.stoneTexture(4);
  g.save(); g.translate(x, y); g.rotate(-0.12); g.drawImage(t, -6 * s, -3 * s, 12 * s, 6 * s); g.restore();
}
function arcs(g: CanvasRenderingContext2D, x0: number, wy: number, s: number) {
  g.setLineDash([3 * s, 4 * s]); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.4 * s;
  let x = x0, span = 120 * s, h = 26 * s;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x, wy); g.quadraticCurveTo(x + span / 2, wy - h * 2, x + span, wy); g.stroke(); x += span; span *= 0.62; h *= 0.6; }
  g.setLineDash([]);
}
export function icon() {
  const W = 1024, H = 1024, wy = 600;
  const { c, g } = A.canvas(W, H);
  scene(g, W, H, NIGHT, wy, 3);
  lantern(g, NIGHT, 300, wy - 10, 5.2, true, true, wy);
  lantern(g, NIGHT, 720, wy - 220, 4.2, true, false, wy);
  ripples(g, 470, wy, 4, 3); arcs(g, 470, wy, 3.2);
  stone(g, 640, wy - 80, 7);
  return c;
}
export function adaptive() {
  const W = 1024, H = 1024, wy = 600;
  const { c, g } = A.canvas(W, H);
  lantern(g, NIGHT, 360, wy - 10, 4.2, true, true, -9999);
  ripples(g, 520, wy, 3, 3); arcs(g, 520, wy, 2.4); stone(g, 650, wy - 60, 5.5);
  return c;
}
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); scene(g, 1024, 1024, NIGHT, 600, 3); return c; }
export function splash() {
  const W = 1284, H = 2778, wy = 1560;
  const { c, g } = A.canvas(W, H);
  scene(g, W, H, MORN, wy, 3.6, 'Skim');
  g.textAlign = 'center'; g.font = '600 60px "Nunito Sans", sans-serif'; g.fillStyle = '#a4522a'; try { g.letterSpacing = '36px'; } catch { /* */ } g.fillText('THISTLE', W / 2 + 18, H * 0.22 - 190); try { g.letterSpacing = '0px'; } catch { /* */ }
  lantern(g, MORN, 320, wy - 8, 5, true, true, wy);
  lantern(g, MORN, 920, wy - 8, 5, false, true, wy);
  ripples(g, 560, wy, 4, 3); arcs(g, 560, wy, 3.4);
  stone(g, 760, wy - 70, 7);
  return c;
}
/** The Play Store feature graphic: lantern night on the lake, a stone mid-skip on the right, the name on the left. */
export function feature() {
  const W = 1024, H = 500, wy = 330;
  const { c, g } = A.canvas(W, H);
  scene(g, W, H, NIGHT, wy, 1.6);
  lantern(g, NIGHT, 640, wy - 6, 2.4, true, true, wy);
  lantern(g, NIGHT, 900, wy - 96, 2, true, false, wy);
  lantern(g, NIGHT, 790, wy - 4, 1.8, false, true, wy);
  ripples(g, 560, wy, 1.6, 3); arcs(g, 560, wy, 1.5);
  stone(g, 700, wy - 40, 3.2);
  const shade = g.createLinearGradient(0, 0, 560, 0); shade.addColorStop(0, 'rgba(14,22,34,0.92)'); shade.addColorStop(0.7, 'rgba(14,22,34,0.6)'); shade.addColorStop(1, 'rgba(14,22,34,0)');
  g.fillStyle = shade; g.fillRect(0, 0, 560, H);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = '600 22px "Nunito Sans", sans-serif'; g.fillStyle = '#ffc76b'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('THISTLE', 58, 112); try { g.letterSpacing = '0px'; } catch { /* */ }
  g.fillStyle = '#f6efe2'; g.shadowColor = 'rgba(246,199,122,0.45)'; g.shadowBlur = 24;
  g.font = 'italic 400 128px "DM Serif Display", serif'; g.fillText('Skim', 50, 228); g.shadowBlur = 0;
  g.fillStyle = '#ffc76b'; g.fillRect(58, 258, 52, 3);
  g.font = '600 26px "Nunito Sans", sans-serif'; g.fillStyle = 'rgba(246,239,226,0.95)'; g.fillText('One flat throw. Every lantern lit.', 58, 306);
  g.font = '400 18px "Nunito Sans", sans-serif'; g.fillStyle = 'rgba(246,239,226,0.82)'; g.fillText('24 lakes · mist, lily pads and lantern night', 58, 342);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
