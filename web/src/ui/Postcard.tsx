import { useEffect, useRef } from 'react';
import { canvas, MOODS, mix } from '../game/art';
import type { Level } from '../game/levels';

const cache = new Map<string, HTMLCanvasElement>();
/** A small postcard of a lake: its sky and water, pads, reeds and rocks, and the lanterns (warm if lit). */
export function Postcard({ level, lit, locked, width }: { level: Level; lit: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.25);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = `${level.id}|${lit}|${locked}|${width}|${dpr}`;
    let src = cache.get(key);
    if (!src) {
      const { c: cv, g } = canvas(width * dpr, height * dpr);
      g.scale(dpr, dpr);
      const m = MOODS[level.chapter], wy = height * 0.58;
      g.save(); g.beginPath(); g.roundRect(0, 0, width, height, 8); g.clip();
      const sky = g.createLinearGradient(0, 0, 0, wy); sky.addColorStop(0, m.skyTop); sky.addColorStop(1, m.skyLow);
      g.fillStyle = sky; g.fillRect(0, 0, width, wy);
      g.fillStyle = m.hills[1]; g.beginPath(); g.moveTo(0, wy); for (let x = 0; x <= width; x += 4) g.lineTo(x, wy - 8 - Math.sin(x * 0.08 + level.id.length) * 4); g.lineTo(width, wy); g.fill();
      const wat = g.createLinearGradient(0, wy, 0, height); wat.addColorStop(0, m.water); wat.addColorStop(1, m.waterDeep);
      g.fillStyle = wat; g.fillRect(0, wy, width, height - wy);
      if (!locked) {
        const k = (width - 8) / (level.length + 40), X = (x: number) => 4 + (x + 20) * k, Y = (y: number) => wy - y * k * 1.6;
        g.fillStyle = m.bank; for (const rd of level.reeds) for (let x = rd.x; x < rd.x + rd.w; x += 6) g.fillRect(X(x), wy - 9, 0.9, 9);
        g.fillStyle = '#4f8f4b'; for (const p of level.pads) { g.beginPath(); g.ellipse(X(p.x + p.w / 2), wy, (p.w * k) / 2, 1.6, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#7d7a72'; for (const r of level.rocks) { g.beginPath(); g.arc(X(r.x), wy, r.r * k, Math.PI, 0); g.fill(); }
        for (const l of level.lanterns) {
          const x = X(l.x), y = Y(l.y);
          if (lit) { g.fillStyle = 'rgba(255,190,90,0.35)'; g.beginPath(); g.arc(x, y - 2, 6, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = lit ? '#ffc76b' : mix('#d9cbb2', m.waterDeep, 0.35); g.beginPath(); g.ellipse(x, y - 2.5, 2.4, 3.2, 0, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore();
      src = cv; cache.set(key, src);
    }
    c.width = src.width; c.height = src.height;
    c.getContext('2d')!.drawImage(src, 0, 0);
  }, [level, lit, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
