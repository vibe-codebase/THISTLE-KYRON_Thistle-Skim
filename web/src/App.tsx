import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, LEVELS, levelIndex, type Level } from './game/levels';
import { lake, startGame, type Finish, type HudState } from './game/scene';
import { sound } from './audio/sound';
import { haptic, onNative, toNative } from './bridge';
import { freshSave, isUnlocked, loadSave, recordResult, totalStars, writeSave, type Save } from './state/save';
import { Postcard } from './ui/Postcard';
import * as I from './ui/icons';

type Screen = 'home' | 'lakes' | 'play' | 'settings';

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const [save, setSave] = useState<Save>(() => loadSave());
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [paused, setPaused] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [coach, setCoach] = useState(false);
  const [settingsFrom, setSettingsFrom] = useState<Screen>('home');
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!host.current) return;
    lake.reducedMotion = save.settings.reducedMotion;
    return startGame(host.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeSave(save); }, [save]);
  useEffect(() => {
    sound.setVolumes(save.settings.music, save.settings.sfx);
    lake.reducedMotion = save.settings.reducedMotion;
    document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduced' : 'full';
  }, [save.settings]);

  const buzz = useCallback((s: 'light' | 'medium' | 'success' | 'warning') => haptic(s, saveRef.current.settings.haptics), []);
  useEffect(() => {
    const unlock = () => { sound.unlock(); sound.startMusic(chapter); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [chapter]);

  const startLevel = useCallback((l: Level) => {
    sound.unlock(); sound.startMusic(l.chapter); sound.duck(true);
    setLevel(l); setChapter(l.chapter); setFinish(null); setPaused(false);
    setCoach(Boolean(l.hint) && !saveRef.current.seenHints.includes(l.id));
    setScreen('play');
    lake.show('play', l);
  }, []);

  useEffect(() => {
    lake.hooks = {
      onFinish: (f) => {
        setFinish(f);
        if (f.result.success) setSave((s) => recordResult(s, f.level.id, f.result.stars, f.result.throws));
      },
      onFirstAction: () => { setCoach(false); setSave((s) => (s.seenHints.includes(level.id) ? s : { ...s, seenHints: [...s.seenHints, level.id] })); },
      onHaptic: buzz,
    };
  }, [buzz, level.id]);

  const showMenu = useCallback(() => { if (!lake.scene?.isMenu()) lake.show('menu', LEVELS.find((l) => l.id === 'm7')!); }, []);
  const goHome = useCallback(() => { setScreen('home'); setFinish(null); setPaused(false); sound.duck(false); showMenu(); }, [showMenu]);
  const goLakes = useCallback(() => { setScreen('lakes'); setFinish(null); setPaused(false); sound.duck(false); showMenu(); }, [showMenu]);
  const pause = useCallback((p: boolean) => { setPaused(p); lake.setPaused(p); }, []);

  useEffect(() => onNative((e) => {
    if (e.type === 'native.lifecycle') {
      if (e.state === 'background') { sound.suspend(); if (screen === 'play' && !finish) pause(true); }
      else sound.resume();
      return;
    }
    if (screen === 'play') { if (finish) goLakes(); else if (!paused) pause(true); else goLakes(); }
    else if (screen === 'lakes') goHome();
    else if (screen === 'settings') setScreen(settingsFrom);
    else toNative({ type: 'exit' });
  }), [screen, paused, finish, pause, goHome, goLakes, settingsFrom]);

  useEffect(() => {
    const vis = () => { if (document.hidden) { sound.suspend(); if (screen === 'play' && !finish) pause(true); } else sound.resume(); };
    document.addEventListener('visibilitychange', vis);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && screen === 'play' && !finish) pause(!paused);
    };
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('keydown', key); };
  }, [screen, paused, finish, pause]);

  const nextLevel = useMemo(() => { const i = levelIndex(level.id); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null; }, [level]);
  const firstOpen = useMemo(() => { const i = LEVELS.findIndex((l, idx) => isUnlocked(save, idx) && !save.stars[l.id]); return LEVELS[i >= 0 ? i : 0]; }, [save]);

  return (
    <div className={`app ch-${chapter}`}>
      <div className="stage" ref={host} />
      {screen === 'home' && (
        <Home lanterns={totalStars(save)} done={Object.keys(save.stars).length} resume={save.stars[LEVELS[0].id] ? firstOpen : null} onPlay={() => startLevel(firstOpen)}
          onLakes={() => { setChapter(firstOpen.chapter); setScreen('lakes'); }}
          onSettings={() => { setSettingsFrom('home'); setScreen('settings'); }} />
      )}
      {screen === 'lakes' && <Lakes save={save} chapter={chapter} onChapter={(c) => { setChapter(c); sound.startMusic(c); }} onPick={startLevel} onBack={goHome} />}
      {screen === 'play' && <Hud level={level} coach={coach} dim={paused || !!finish} onPause={() => pause(true)} />}
      {screen === 'play' && paused && !finish && (
        <PauseCard level={level} onResume={() => pause(false)} onRestart={() => startLevel(level)} onLakes={goLakes}
          onSettings={() => { setSettingsFrom('play'); setScreen('settings'); }} />
      )}
      {screen === 'play' && finish && (
        <ResultCard finish={finish} next={nextLevel && isUnlocked(save, levelIndex(nextLevel.id)) ? nextLevel : null}
          onNext={startLevel} onRetry={() => startLevel(level)} onLakes={goLakes} />
      )}
      {screen === 'settings' && (
        <Settings save={save} onChange={(st) => setSave((s) => ({ ...s, settings: st }))} onReset={() => setSave((s) => ({ ...freshSave(), settings: s.settings }))}
          onBack={() => { setScreen(settingsFrom); if (settingsFrom === 'play') pause(true); }} />
      )}
    </div>
  );
}

function Home({ lanterns, done, resume, onPlay, onLakes, onSettings }: { lanterns: number; done: number; resume: Level | null; onPlay: () => void; onLakes: () => void; onSettings: () => void }) {
  return (
    <div className="screen home">
      <header className="title">
        <h1><small>Thistle</small>Skim</h1>
        <p>Pull back, let fly, and skip a flat stone across the lake. Every lantern it passes catches light.</p>
      </header>
      <div className="home-actions">
        <button className="warm-btn" onClick={() => { sound.tap(); onPlay(); }} data-testid="play">
          <I.Stone size={24} /> {resume ? <>Continue <small>{resume.name}</small></> : 'Down to the water'}
        </button>
        <div className="row">
          <button className="mist-btn" onClick={() => { sound.tap(); onLakes(); }}><I.Lake /> Lakes</button>
          <button className="mist-btn round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
        <div className="tally"><I.Lantern size={17} on /> {lanterns} / {LEVELS.length * 3} · {done} lakes lit</div>
      </div>
    </div>
  );
}

function Lakes({ save, chapter, onChapter, onPick, onBack }: { save: Save; chapter: number; onChapter: (c: number) => void; onPick: (l: Level) => void; onBack: () => void }) {
  const levels = LEVELS.filter((l) => l.chapter === chapter);
  const got = levels.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0);
  const chapterOpen = (c: number) => isUnlocked(save, LEVELS.findIndex((l) => l.chapter === c));
  const w = Math.floor(Math.max(56, Math.min(80, (Math.min(window.innerWidth, 460) - 36 - 3 * 10) / 4)));
  return (
    <div className="screen lakes">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="eyebrow">lakes · {got}/24</span><h2>{CHAPTERS[chapter].name}</h2></div>
        <span />
      </div>
      <div className="tabs" role="tablist">
        {CHAPTERS.map((c, i) => (
          <button key={c.name} role="tab" aria-selected={i === chapter} disabled={!chapterOpen(i)} className={`tab t${i} ${i === chapter ? 'on' : ''}`}
            aria-label={`${c.name}${chapterOpen(i) ? '' : ' (locked)'}`} onClick={() => { sound.tap(); onChapter(i); }}><i />{c.name}</button>
        ))}
      </div>
      <p className="blurb">{CHAPTERS[chapter].blurb}</p>
      <div className="cards">
        {levels.map((l) => {
          const idx = levelIndex(l.id), open = isUnlocked(save, idx), st = save.stars[l.id] ?? 0;
          return (
            <button key={l.id} className={`card-btn ${open ? '' : 'locked'}`} disabled={!open} onClick={() => { sound.tap(); onPick(l); }}
              aria-label={`${l.name}${open ? '' : ' (locked)'}`} data-testid={`level-${idx + 1}`}>
              <Postcard level={l} lit={st > 0} locked={!open} width={w} />
              <span className="card-name">{l.name}</span>
              <span className="marks">{[0, 1, 2].map((k) => <I.Lantern key={k} size={14} on={k < st} />)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Hud({ level, coach, dim, onPause }: { level: Level; coach: boolean; dim: boolean; onPause: () => void }) {
  const [st, setSt] = useState<HudState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let sig = '', last = -1;
    const poll = window.setInterval(() => {
      const s = lake.state(); const k = JSON.stringify(s); if (k !== sig) { sig = k; setSt(s); }
      if (s && s.phase === 'rest' && s.used !== last) { last = s.used; const n = s.lastSkips; if (n >= 3) { setToast(n >= 8 ? `${n} skips! Magnificent.` : `${n} skips`); window.setTimeout(() => setToast(null), 1400); } }
    }, 60);
    return () => clearInterval(poll);
  }, []);
  const n = LEVELS.filter((l) => l.chapter === level.chapter).indexOf(level) + 1;
  const stones = st?.stones ?? level.par + 2, used = st?.used ?? 0;
  return (
    <div className={`hud ${dim ? 'dim' : ''}`}>
      <div className="hud-top">
        <button className="icon-btn" aria-label="Pause" onClick={(e) => { e.stopPropagation(); sound.tap(); onPause(); }} data-testid="pause"><I.Pause /></button>
        <div className="hud-title"><span>{CHAPTERS[level.chapter].name} · {n} of 8</span><strong>{level.name}</strong></div>
        <div className="lit" aria-label={`${st?.lit ?? 0} of ${level.lanterns.length} lanterns lit`}><I.Lantern size={20} on={(st?.lit ?? 0) > 0} /><b>{st?.lit ?? 0}/{level.lanterns.length}</b></div>
      </div>
      <div className="hud-bottom">
        <div className="stones" aria-label={`${stones - used} stones left`}>{Array.from({ length: stones }, (_, i) => <I.Stone key={i} size={26} spent={i < used} />)}</div>
        <p className="say">{st?.phase === 'aim' ? `Par ${level.par} ${level.par === 1 ? 'throw' : 'throws'} · pull back from the stone` : st?.phase === 'fly' ? `${st.skips} ${st.skips === 1 ? 'skip' : 'skips'}` : ' '}</p>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {coach && level.hint && <div className="coach" role="note"><I.Stone size={22} /><p>{level.hint}</p></div>}
    </div>
  );
}

function PauseCard({ level, onResume, onRestart, onLakes, onSettings }: { level: Level; onResume: () => void; onRestart: () => void; onLakes: () => void; onSettings: () => void }) {
  return (
    <div className="veil">
      <div className="card" role="dialog" aria-label="Paused">
        <span className="eyebrow">{level.name}</span>
        <h2>Sit a while by the water</h2>
        <button className="warm-btn" onClick={() => { sound.tap(); onResume(); }} data-testid="resume">Back to the lake</button>
        <div className="row">
          <button className="mist-btn" onClick={() => { sound.tap(); onRestart(); }}><I.Restart /> Restart</button>
          <button className="mist-btn" onClick={() => { sound.tap(); onLakes(); }}><I.Lake /> Lakes</button>
          <button className="mist-btn round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
      </div>
    </div>
  );
}

const TITLES = ['All alight', 'A fine skimmer', 'One perfect throw'];
function ResultCard({ finish, next, onNext, onRetry, onLakes }: { finish: Finish; next: Level | null; onNext: (l: Level) => void; onRetry: () => void; onLakes: () => void }) {
  const r = finish.result;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const t = [0, 1, 2].filter((i) => i < r.stars).map((i) => window.setTimeout(() => { setLit(i + 1); sound.star(i); }, 420 + i * 330));
    return () => t.forEach(clearTimeout);
  }, [r.stars]);
  const lv = finish.level;
  const title = r.success ? (r.stars === 3 && r.par > 1 ? 'Not a stone wasted' : TITLES[r.stars - 1]) : 'Out of stones';
  return (
    <div className="veil soft">
      <div className={`card result ${r.success ? 'win' : 'lose'}`} role="dialog" aria-label={r.success ? 'Every lantern lit' : 'Out of stones'}>
        <span className="eyebrow">{lv.name}</span>
        <h2>{title}</h2>
        <div className="result-card"><Postcard level={lv} lit={r.success} locked={false} width={150} /></div>
        {r.success && <div className="big-lanterns">{[0, 1, 2].map((i) => <span key={i} className={i < lit ? 'on' : ''}><I.Lantern size={44} on={i < lit} /></span>)}</div>}
        <p className="checks"><span className="on">{r.lit} of {r.total} lit</span><span className={r.success && r.throws <= r.par ? 'on' : ''}>{r.throws} {r.throws === 1 ? 'throw' : 'throws'} · par {r.par}</span></p>
        {r.success && r.stars < 3 && <p className="note-small">{r.par === 1 ? 'Every lantern can be lit with a single throw.' : `It can be done in ${r.par} throws.`}</p>}
        {!r.success && <p className="note-small">Throw flatter for more skips; a lily pad will lift the stone toward the high lanterns.</p>}
        {r.success && next ? (
          <button className="warm-btn" onClick={() => { sound.tap(); onNext(next); }} data-testid="next">Next: {next.name} <I.Next size={18} /></button>
        ) : (
          <button className="warm-btn" onClick={() => { sound.tap(); onRetry(); }} data-testid="retry"><I.Restart size={18} /> {r.success ? 'Throw again' : 'Try again'}</button>
        )}
        <div className="row">
          {r.success && next && <button className="mist-btn" onClick={() => { sound.tap(); onRetry(); }}><I.Restart /> Again</button>}
          <button className="mist-btn" onClick={() => { sound.tap(); onLakes(); }}><I.Lake /> Lakes</button>
        </div>
      </div>
    </div>
  );
}

function Settings({ save, onChange, onReset, onBack }: { save: Save; onChange: (s: Save['settings']) => void; onReset: () => void; onBack: () => void }) {
  const st = save.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen settings">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="eyebrow">settings</span><h2>Boathouse</h2></div>
        <span />
      </div>
      <div className="card flat">
        <label className="slider">Music <input type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => onChange({ ...st, music: +e.target.value })} /><output>{Math.round(st.music * 100)}</output></label>
        <label className="slider">Sounds <input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={(e) => onChange({ ...st, sfx: +e.target.value })} /><output>{Math.round(st.sfx * 100)}</output></label>
        <label className="toggle">Vibration <input type="checkbox" checked={st.haptics} onChange={(e) => onChange({ ...st, haptics: e.target.checked })} /><i /></label>
        <label className="toggle">Reduce motion <input type="checkbox" checked={st.reducedMotion} onChange={(e) => onChange({ ...st, reducedMotion: e.target.checked })} /><i /></label>
        <div className="reset">
          {confirm ? (
            <>
              <span>Put out every lantern?</span>
              <button className="mist-btn danger" onClick={() => { onReset(); setConfirm(false); }}>Reset</button>
              <button className="mist-btn" onClick={() => setConfirm(false)}>Keep</button>
            </>
          ) : <button className="mist-btn" onClick={() => setConfirm(true)}>Reset progress</button>}
        </div>
      </div>
      <p className="small-print">Plays fully offline. No ads, accounts or tracking.</p>
    </div>
  );
}
