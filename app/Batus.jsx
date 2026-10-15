'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArtistSearch from './components/ArtistSearch';
import Avatar from './components/Avatar';
import Result from './components/Result';
import Playlists from './components/Playlists';
import usePlayer from './usePlayer';
import {
  CITIES, MAX_ARTISTS, MAX_SONGS, PLAYLIST_KEY, STORAGE_KEY, THEMES, defaultProfile, greeting,
} from './config';

export default function Batus() {
  const [text, setText] = useState('');
  const [theme, setTheme] = useState('worry');
  const [mode, setMode] = useState('calm');
  const [artists, setArtists] = useState(() => defaultProfile('worry').artists);
  const [songs, setSongs] = useState([]);
  const [location, setLocation] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [health, setHealth] = useState(null);
  const [hello, setHello] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');
  const [phase, setPhase] = useState('');
  const [playlists, setPlaylists] = useState({});
  const player = usePlayer();
  const outRef = useRef(null);
  const topRef = useRef(null);
  const profiles = useRef({}); // per-theme sound, so a heartbreak playlist never overwrites a worship one
  const loaded = useRef(false);
  const T = THEMES[theme];

  useEffect(() => {
    setHello(greeting(new Date().getHours()));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.profiles) {
        profiles.current = saved.profiles;
        const t = THEMES[saved.theme] ? saved.theme : 'worry';
        const p = saved.profiles[t] || defaultProfile(t);
        setTheme(t);
        setArtists((p.artists || []).slice(0, MAX_ARTISTS));
        setSongs((p.songs || []).slice(0, MAX_SONGS));
        setLocation(typeof p.location === 'string' ? p.location : '');
        setMode(THEMES[t].modes.some(([m]) => m === saved.mode) ? saved.mode : THEMES[t].modes[0][0]);
      }
    } catch { /* storage unavailable: fine */ }
    try {
      const pl = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || 'null');
      if (pl && typeof pl === 'object') setPlaylists(pl);
    } catch { /* ignore */ }
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  // The theme paints the whole page (accent colour, glow).
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return; }
    profiles.current[theme] = { artists, songs, location };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, mode, profiles: profiles.current })); } catch { /* ignore */ }
  }, [artists, songs, location, mode, theme]);

  const plLoaded = useRef(false);
  useEffect(() => {
    if (!plLoaded.current) { plLoaded.current = true; return; }
    try { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists)); } catch { /* ignore */ }
  }, [playlists]);

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const addArtist = useCallback((a) => {
    setArtists((cur) => {
      if (cur.some((x) => x.name.toLowerCase() === a.name.toLowerCase())) return cur;
      if (cur.length >= MAX_ARTISTS) { flash(`Up to ${MAX_ARTISTS} artists. Remove one to add another.`); return cur; }
      return [...cur, a];
    });
  }, [flash]);

  const addSong = useCallback((song) => {
    setPlaylists((cur) => {
      const list = cur[mode] || [];
      if (list.some((x) => x.id === song.id)) return cur;
      return { ...cur, [mode]: [...list, song].slice(-100) };
    });
    flash(`Added to ${THEMES[theme].modes.find(([m]) => m === mode)?.[1] || 'your playlist'}.`);
  }, [mode, theme, flash]);
  const removeSong = useCallback((key, song) => {
    setPlaylists((cur) => ({ ...cur, [key]: (cur[key] || []).filter((x) => x.id !== song.id) }));
  }, []);
  const clearPlaylist = useCallback((key) => setPlaylists((cur) => ({ ...cur, [key]: [] })), []);

  function switchTheme(next) {
    if (next === theme) return;
    profiles.current[theme] = { artists, songs, location };
    const p = profiles.current[next] || defaultProfile(next);
    setTheme(next);
    setMode(THEMES[next].modes[0][0]);
    setArtists(p.artists);
    setSongs(p.songs || []);
    setLocation(p.location || '');
    setResult(null);
    setError('');
    setText('');
  }

  async function go() {
    setLoading(true);
    setError('');
    setResult(null);
    setPhase('Reading your artists in Qloo...');
    const timers = [
      setTimeout(() => setPhase('Finding the sound that fits how you feel...'), 3500),
      setTimeout(() => setPhase('Choosing songs for what you are going through...'), 8000),
      setTimeout(() => setPhase('Still working. Qloo can be slow sometimes, thank you for waiting.'), 16000),
    ];
    const ctrl = new AbortController();
    const abort = setTimeout(() => ctrl.abort(), 40000);
    requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    try {
      const res = await fetch('/api/praise', {
        signal: ctrl.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text, theme, mode, location, ai: useAi,
          artists: artists.map(({ name, id }) => ({ name, id })),
          songs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
      requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(err.name === 'AbortError'
        ? 'This is taking too long. Qloo may be slow right now.'
        : err instanceof TypeError
          ? 'Could not reach Batus. Check your connection.'
          : (err.message || 'Something went wrong.'));
    } finally {
      timers.forEach(clearTimeout);
      clearTimeout(abort);
      setLoading(false);
    }
  }

  const savedNames = useMemo(() => new Set(artists.map((a) => a.name.toLowerCase())), [artists]);

  return (
    <>
      <div className="glow" aria-hidden="true" />
      <main className="wrap" ref={topRef}>
        <header className="top">
          <div className="logo" aria-hidden="true"><i /></div>
          <h1 className="brand">Batus</h1>
          <p className="tag">When your mind won&apos;t stop or your heart is hurting, let your own music answer first.</p>
          <div className="status-pills" aria-label="Service status">
            <span className="pill">Powered by Qloo&apos;s taste graph</span>
            {health && <span className={`pill ${health.qloo ? 'on' : 'warn'}`}>{health.qloo ? 'Qloo live' : 'Sample mode'}</span>}
            {health?.agent && <span className="pill on">Claude agent on</span>}
          </div>
          {hello && <p className="hello">{hello}</p>}
        </header>

        <section className="card" aria-labelledby="h-theme">
          <h2 id="h-theme">What are you going through?</h2>
          <div className="tiles" role="radiogroup" aria-label="What are you going through?">
            {Object.entries(THEMES).map(([key, t]) => (
              <label className="tile" key={key}>
                <input type="radio" name="theme" value={key} checked={theme === key} onChange={() => switchTheme(key)} />
                <span><b>{t.label}</b><small>{t.sub}</small></span>
              </label>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="h-checkin">
          <h2 id="h-checkin">What&apos;s on your mind?</h2>
          <p className="hint">Optional. Never saved, never logged.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder={T.placeholder} aria-label="What's on your mind" />
          <div className="chips" role="group" aria-label="Quick starts">
            {T.quick.map(([label, value]) => (
              <button key={label} type="button" className={`chip${text === value ? ' on' : ''}`} aria-pressed={text === value} onClick={() => setText(text === value ? '' : value)}>{label}</button>
            ))}
          </div>
          <div className="mode" role="radiogroup" aria-label="How do you want to feel?">
            {T.modes.map(([key, label, hint]) => (
              <label className="mode-opt" key={key}>
                <input type="radio" name="mode" value={key} checked={mode === key} onChange={() => setMode(key)} />
                <span><b>{label}</b><small>{hint}</small></span>
              </label>
            ))}
          </div>
        </section>

        <details className="card sound" open={artists.length === 0}>
          <summary>
            <span className="sum-title">Your sound</span>
            <span className="sum-sub">
              {artists.length > 0 ? artists.map((a) => a.name).join(' · ') : 'Add a few artists'}
              {songs.length > 0 && ` · ${songs.length} song${songs.length > 1 ? 's' : ''}`}
            </span>
            <span className="sum-edit">Edit</span>
          </summary>

          <p className="hint">{T.soundHint}</p>
          {artists.length === 0 && <p className="hint strong">No artists yet? That is fine: Batus can start from the mood alone and ask Qloo what fits.</p>}
          <label className="field-label" htmlFor="artist-in">Favourite artists</label>
          <div className="tags">
            {artists.map((a) => (
              <span className="tag-pill" key={a.name}>
                {a.image && <Avatar src={a.image} name={a.name} className="dot" />}
                <span className="nm">{a.name}</span>
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setArtists((cur) => cur.filter((x) => x.name !== a.name))}>×</button>
              </span>
            ))}
          </div>
          <ArtistSearch onPick={addArtist} />

          <SongInput songs={songs} setSongs={setSongs} />

          <label className="field-label" htmlFor="loc">Near <span className="opt">(optional, nudges results toward what&apos;s popular there)</span></label>
          <select id="loc" value={location} onChange={(e) => setLocation(e.target.value)}>
            {CITIES.map((c) => <option key={c} value={c}>{c || 'Anywhere'}</option>)}
          </select>

          {health?.agent && (
            <label className="switch">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
              <span><b>Let Claude write my reply.</b> It sends your check-in text to Claude to compose a kind message. Turn off to keep it on simple built-in wording.</span>
            </label>
          )}
        </details>

        <button className="go" type="button" onClick={go} disabled={loading}>
          {loading ? 'Asking Qloo for your music...' : 'Find my music'}
        </button>
        <div className="status" role="alert">
          {error && (<><span>{error}</span> <button type="button" className="chip retry" onClick={go}>Try again</button></>)}
        </div>
        <p className="toast" role="status" aria-live="polite">{toast}</p>

        <div ref={outRef} className="out-anchor">
          {loading && <Skeleton phase={phase} />}
          {result && (result.crisis ? <Crisis data={result} /> : (
            <Result
              data={result}
              theme={theme}
              mode={mode}
              savedNames={savedNames}
              player={player}
              playlist={playlists[mode] || []}
              onAddSong={addSong}
              onSave={(p) => { addArtist({ name: p.name, id: p.id, image: p.image || undefined }); flash(`${p.name} added to your sound.`); }}
              onRestart={() => { setResult(null); setText(''); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            />
          ))}
        </div>

        <Playlists playlists={playlists} onRemove={removeSong} onClear={clearPlaylist} player={player} activeMode={mode} flash={flash} />

        <footer className="foot">
          <p>Batus is a comfort companion, not therapy or medical advice. If you are in crisis, please contact someone you trust or a local helpline (<a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>).</p>
          <p>No account. Your check-in text is never stored by Batus, and your artist list stays in this browser. Music suggestions come from <a href="https://www.qloo.com" target="_blank" rel="noopener noreferrer">Qloo</a>&apos;s taste graph. <a href="https://github.com/Agozie180/Batus" target="_blank" rel="noopener noreferrer">Open source (MIT)</a>.</p>
        </footer>
      </main>
    </>
  );
}

function Skeleton({ phase }) {
  return (
    <div className="out" role="status" aria-live="polite">
      <div className="working"><span className="spinner" aria-hidden="true" /><span>{phase}</span></div>
      <div aria-hidden="true">
      <div className="skel msg-skel" />
      <div className="skel hero-skel" />
      <div className="skel row-skel" />
      <div className="skel row-skel" />
      </div>
    </div>
  );
}

function SongInput({ songs, setSongs }) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.replace(/\s+/g, ' ').trim();
    if (t && !songs.some((s) => s.toLowerCase() === t.toLowerCase()) && songs.length < MAX_SONGS) setSongs([...songs, t]);
    setV('');
  };
  return (
    <>
      <label className="field-label" htmlFor="song-in">Songs you already love <span className="opt">(optional)</span></label>
      <div className="tags">
        {songs.map((s) => (
          <span className="tag-pill" key={s}>
            <span className="nm">{s}</span>
            <button type="button" aria-label={`Remove ${s}`} onClick={() => setSongs(songs.filter((x) => x !== s))}>×</button>
          </span>
        ))}
      </div>
      <input
        id="song-in" type="text" value={v} maxLength={80} autoComplete="off"
        placeholder="Type a song, press Enter"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
      />
    </>
  );
}

function Crisis({ data }) {
  return (
    <section className="crisis" aria-live="assertive">
      <h2>{data.title}</h2>
      {data.body.map((p) => <p key={p}>{p}</p>)}
      <p>
        {data.resources.map((r, i) => (
          <span key={r.url}>{i > 0 && '  ·  '}<a href={r.url} target="_blank" rel="noopener noreferrer">{r.label}</a></span>
        ))}
      </p>
    </section>
  );
}
