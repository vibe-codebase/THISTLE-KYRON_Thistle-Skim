type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A flat skimming stone. */
export const Stone = ({ size = 22, spent }: P & { spent?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <ellipse cx="12" cy="13" rx="9" ry="4.6" fill={spent ? 'none' : '#c9c5bb'} stroke={spent ? 'rgba(255,255,255,.35)' : '#5f5b52'} strokeWidth="1.2" />
    {!spent && <path d="M6.5 11.5c2-1.4 6.5-2 10-.6" stroke="rgba(255,255,255,.7)" strokeWidth="1" strokeLinecap="round" fill="none" />}
  </svg>
);
/** Stars are paper lanterns. */
export const Lantern = ({ size = 22, on }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {on && <circle cx="12" cy="12" r="10.5" fill="rgba(255,190,90,.28)" />}
    <ellipse cx="12" cy="12" rx="6" ry="7.4" fill={on ? '#ffc76b' : 'none'} stroke={on ? '#b4472b' : 'rgba(255,255,255,.45)'} strokeWidth="1.1" />
    <path d="M9 4.6h6M9 19.4h6" stroke={on ? '#b4472b' : 'rgba(255,255,255,.45)'} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 2v2.4M12 19.6V22" stroke={on ? '#7a3a20' : 'rgba(255,255,255,.35)'} strokeWidth="1" />
    {on && <path d="M9.6 12a2.4 4.2 0 0 0 4.8 0" stroke="rgba(180,71,43,.5)" strokeWidth=".8" fill="none" />}
  </svg>
);
export const Lake = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M3 15c2 1 4 1 6 0s4-1 6 0 4 1 6 0M3 19c2 1 4 1 6 0s4-1 6 0 4 1 6 0" /><path d="M5 11l4-5 3 3 3-4 4 6" /></svg>;
