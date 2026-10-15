'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KEY = 'batus.profile.v2';
const MAX_ARTISTS = 6;
const MAX_SONGS = 5;

const STARTERS = {
  ng: ['Minister Prudence', 'Nathaniel Bassey', 'Sinach', 'Mercy Chinwo'],
  intl: ['The Belonging Co', 'Elevation Worship', 'Maverick City Music', 'Hillsong Worship'],
  both: ['Minister Prudence', 'Nathaniel Bassey', 'The Belonging Co', 'Elevation Worship'],
};

const QUICK = [
  ['Results came out', "The results were announced and I didn't win."],
  ['Money & food', "I'm worried about money and what I'll eat."],
  ["Can't sleep", "I can't sleep and my mind won't stop."],
  ['Overthinking', "I'm just overthinking everything."],
];

const CITIES = ['', 'Lagos', 'Abuja', 'Port Harcourt', 'Enugu', 'Ibadan', 'Kano', 'Accra', 'London', 'Houston'];

const LINK_LABEL = { youtube: 'YouTube', spotify: 'Spotify', audiomack: 'Audiomack', web: 'Where to watch' };
const KIND = { artist: 'Music', podcast: 'Listen', tv_show: 'Watch', movie: 'Watch' };

const SOURCE_LABEL = {
  qloo: 'Live Qloo taste graph',
  sample: 'Sample data (no Qloo key set)',
  error: 'Qloo unavailable',
  none: 'Your songs only',
};

export default function Batus() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('calm');
  const [artists, setArtists] = useState(STARTERS.both.map((name) => ({ name })));
  const [songs, setSongs] = useState([]);
  const [location, setLocation] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [health, setHealth] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');
  const outRef = useRef(null);

  // ---- load saved profile + service status ----
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) {
        if (Array.isArray(saved.artists) && saved.artists.length) setArtists(saved.artists.slice(0, MAX_ARTISTS));
        if (Array.isArray(saved.songs)) setSongs(saved.songs.slice(0, MAX_SONGS));
        if (typeof saved.location === 'string') setLocation(saved.location);
        if (saved.mode === 'dance' || saved.mode === 'calm') setMode(saved.mode);
      }
    } catch { /* storage unavailable: fine */ }
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return; }
    try { localStorage.setItem(KEY, JSON.stringify({ artists, songs, location, mode })); } catch { /* ignore */ }
  }, [artists, songs, location, mode]);

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }, []);

  const addArtist = useCallback((a) => {
    setArtists((cur) => {
      if (cur.some((x) => x.name.toLowerCase() === a.name.toLowerCase())) return cur;
      if (cur.length >= MAX_ARTISTS) { flash(`Up to ${MAX_ARTISTS} artists. Remove one to add another.`); return cur; }
      return [...cur, a];
    });
  }, [flash]);

  const removeArtist = (name) => setArtists((cur) => cur.filter((x) => x.name !== name));

  async function go() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/praise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mode,
          location,
          ai: useAi,
          artists: artists.map(({ name, id }) => ({ name, id })),
          songs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
      requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const savedNames = useMemo(() => new Set(artists.map((a) => a.name.toLowerCase())), [artists]);

  return (
    <>
      <div className="glow" aria-hidden="true" />
      <main className="wrap">
        <header className="top">
          <h1 className="brand">Batus</h1>
          <p className="tag">When your mind won&apos;t stop, let your own praise music answer first.</p>
          {health && (
            <div className="status-pills" aria-label="Service status">
              <span className={`pill ${health.qloo ? 'on' : 'warn'}`}>{health.qloo ? 'Qloo live' : 'Sample mode'}</span>
              {health.agent && <span className="pill on">Claude agent on</span>}
            </div>
          )}
        </header>

        <section className="card" aria-labelledby="h-checkin">
          <h2 id="h-checkin">What&apos;s on your mind?</h2>
          <p className="hint">Optional. Never saved, never logged.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Results came out and I can't stop worrying about money and food..."
            aria-label="What's on your mind"
          />
          <div className="chips" role="group" aria-label="Quick starts">
            {QUICK.map(([label, value]) => (
              <button key={label} type="button" className="chip" onClick={() => setText(value)}>{label}</button>
            ))}
          </div>
          <div className="mode" role="radiogroup" aria-label="How do you want to feel?">
            <label className="mode-opt">
              <input type="radio" name="mode" value="calm" checked={mode === 'calm'} onChange={() => setMode('calm')} />
              <span><b>Calm me</b><small>Slow worship, breathe</small></span>
            </label>
            <label className="mode-opt">
              <input type="radio" name="mode" value="dance" checked={mode === 'dance'} onChange={() => setMode('dance')} />
              <span><b>Lift me up</b><small>Praise, stand and dance</small></span>
            </label>
          </div>
        </section>

        <section className="card" aria-labelledby="h-sound">
          <h2 id="h-sound">Your sound</h2>
          <p className="hint">Artists you reach for when you need peace. Batus uses Qloo&apos;s taste graph to find more like them.</p>

          <div className="presets">
            <span className="lbl">Try a starter:</span>
            <button type="button" className="chip ghost" onClick={() => { setArtists(STARTERS.ng.map((name) => ({ name }))); setLocation('Lagos'); }}>Nigerian gospel</button>
            <button type="button" className="chip ghost" onClick={() => setArtists(STARTERS.intl.map((name) => ({ name })))}>Worship (international)</button>
            <button type="button" className="chip ghost" onClick={() => setArtists(STARTERS.both.map((name) => ({ name })))}>Both</button>
          </div>

          <label className="field-label" htmlFor="artist-in">Favourite artists</label>
          <div className="tags">
            {artists.map((a) => (
              <span className="tag-pill" key={a.name}>
                {a.image && <span className="dot" style={{ backgroundImage: `url(${a.image})` }} />}
                <span className="nm">{a.name}</span>
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => removeArtist(a.name)}>×</button>
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
        </section>

        <button className="go" type="button" onClick={go} disabled={loading}>
          {loading ? 'Finding your music...' : 'Start my praise break'}
        </button>
        <p className="status" role="status" aria-live="polite">{error}</p>
        <p className="toast" role="status" aria-live="polite">{toast}</p>

        <div ref={outRef}>
          {result && (result.crisis ? <Crisis data={result} /> : (
            <Result data={result} mode={mode} savedNames={savedNames} onSave={(p) => { addArtist({ name: p.name, id: p.id, image: p.image || undefined }); flash(`${p.name} added to your sound.`); }} />
          ))}
        </div>

        <footer className="foot">
          <p>Batus is a comfort companion, not therapy or medical advice. If you are in crisis, please contact someone you trust or a local helpline (<a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>).</p>
          <p>Your check-in text is never stored by Batus. Your artist list stays in this browser only. Music suggestions come from <a href="https://www.qloo.com" target="_blank" rel="noopener noreferrer">Qloo</a>&apos;s taste graph.</p>
        </footer>
      </main>
    </>
  );
}

/* ---------- Artist typeahead (live Qloo search) ---------- */

function ArtistSearch({ onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); setBusy(false); return undefined; }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setItems(data.results || []);
        setSource(data.source || '');
        setActive(-1);
        setOpen(true);
      } catch { /* aborted or offline */ } finally { setBusy(false); }
    }, 260);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  function choose(item) {
    onPick({ name: item.name, id: item.id?.startsWith('sample:') ? undefined : item.id, image: item.image || undefined });
    setQ(''); setItems([]); setOpen(false);
  }

  function addTyped() {
    const v = q.replace(/\s+/g, ' ').trim();
    if (!v) return;
    onPick({ name: v });
    setQ(''); setItems([]); setOpen(false);
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); active >= 0 && items[active] ? choose(items[active]) : addTyped(); }
    else if (e.key === 'Escape') setOpen(false);
  }

  const showNote = open && q.trim().length >= 2 && !busy && items.length === 0;

  return (
    <div className="combo">
      <input
        id="artist-in"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="artist-list"
        aria-autocomplete="list"
        value={q}
        maxLength={80}
        autoComplete="off"
        placeholder="Search an artist, press Enter to add"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (items.length > 0 || showNote) && (
        <ul className="suggest" id="artist-list" role="listbox">
          {items.map((it, i) => (
            <li key={it.id || it.name} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); choose(it); }}>
              <span className="dot" style={it.image ? { backgroundImage: `url(${it.image})` } : undefined} />
              <span><b>{it.name}</b>{it.tags?.length > 0 && <small>{it.tags.join(' · ')}</small>}</span>
            </li>
          ))}
          {showNote && (
            <li className="note" role="option" aria-selected="false">
              {source === 'qloo' ? 'Qloo has no match. Press Enter to add it by name anyway.' : 'No match. Press Enter to add it by name.'}
            </li>
          )}
          {items.length > 0 && source === 'sample' && <li className="note" role="option" aria-selected="false">Sample matches (no Qloo key set)</li>}
        </ul>
      )}
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

/* ---------- Results ---------- */

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

function Result({ data, mode, savedNames, onSave }) {
  const [breathing, setBreathing] = useState(false);
  const music = data.picks.filter((p) => p.type === 'artist');
  const beyond = data.extras || [];

  return (
    <section className="out" aria-label="Your praise break">
      <div className="msg">
        <span className={`src ${data.source === 'sample' ? 'sample' : ''}`}>{SOURCE_LABEL[data.source] || data.source}</span>
        {data.agent && <span className="src">Claude agent</span>}
        <p className="opener">{data.message.opener}</p>
        {data.message.topic && <p>{data.message.topic}</p>}
        {data.message.after && <p className="after">{data.message.after}</p>}
        {mode === 'calm' && !breathing && (
          <button type="button" className="chip" onClick={() => setBreathing(true)}>Take 4 slow breaths first</button>
        )}
        {breathing && <Breathe onDone={() => setBreathing(false)} />}
      </div>

      {data.favourites.length > 0 && (
        <>
          <h2 className="section-title">Start with what you already love</h2>
          <div className="list">
            {data.favourites.map((f) => (
              <div className="item" key={f.title}>
                <div><h3>{f.title}</h3></div>
                <span />
                <Links links={f.links} primary="Play now" />
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Matched to your taste</h2>
      {music.length === 0 ? (
        <p className="empty">
          {data.source === 'error'
            ? 'Qloo could not be reached right now. Your own songs above still work.'
            : 'Add a few favourite artists above and Batus will find more like them.'}
        </p>
      ) : (
        <div className="list">
          {music.map((p) => <Card key={p.id || p.name} p={p} saved={savedNames.has(p.name.toLowerCase())} onSave={onSave} />)}
        </div>
      )}

      {beyond.length > 0 && (
        <>
          <h2 className="section-title">Beyond music, from the same taste</h2>
          <div className="list">
            {beyond.map((p) => <Card key={p.id || p.name} p={p} />)}
          </div>
        </>
      )}

      {data.trace?.length > 0 && (
        <details className="trace">
          <summary>How this was chosen</summary>
          <ul>{data.trace.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      <details className="trace why">
        <summary>Why Qloo, and not just an AI chatbot?</summary>
        <ul>
          <li>A chatbot guesses what &quot;calming music&quot; means. Qloo knows what people with <i>your</i> taste actually love, across music, shows and podcasts.</li>
          <li>Every artist here is yours or came back from Qloo&apos;s taste graph. The AI can choose and explain, but it cannot add an artist of its own.</li>
          <li>Tap the heart on any match and Batus remembers it, so your taste profile grows each time you use it.</li>
        </ul>
      </details>
    </section>
  );
}

function Links({ links, primary }) {
  const entries = Object.entries(links);
  return (
    <div className="play">
      {entries.map(([k, href], i) => (
        <a key={k} href={href} target="_blank" rel="noopener noreferrer">
          {i === 0 ? (primary || `Play on ${LINK_LABEL[k]}`) : LINK_LABEL[k]}
        </a>
      ))}
    </div>
  );
}

function Card({ p, saved, onSave }) {
  const pct = typeof p.affinity === 'number' ? Math.round(Math.min(1, Math.max(0, p.affinity)) * 100) : null;
  const isArtist = p.type === 'artist';
  return (
    <div className="item">
      {p.image
        ? <div className="art" style={{ backgroundImage: `url(${p.image})` }} role="img" aria-label={p.name} />
        : <div className="art" aria-hidden="true">{p.name.slice(0, 1)}</div>}
      <div>
        <span className="kind">{KIND[p.type] || 'Pick'}</span>
        <h3>{p.name}</h3>
        {p.tags?.length > 0 && <p className="meta">{p.tags.join(' · ')}</p>}
      </div>
      {isArtist && onSave ? (
        <button type="button" className="heart" aria-pressed={saved} aria-label={saved ? `${p.name} is in your sound` : `Add ${p.name} to your sound`} disabled={saved} onClick={() => onSave(p)}>
          {saved ? '♥' : '♡'}
        </button>
      ) : <span />}
      {pct !== null && <div className="bar" title={`Taste match ${pct}%`}><i style={{ width: `${pct}%` }} /></div>}
      <Links links={p.links} primary={isArtist ? 'Play on YouTube' : undefined} />
    </div>
  );
}

function Breathe({ onDone }) {
  const [phase, setPhase] = useState('rest');
  const [count, setCount] = useState(1);

  useEffect(() => {
    const ms = phase === 'rest' ? 80 : phase === 'in' ? 4000 : 6000;
    const t = setTimeout(() => {
      if (phase === 'rest') setPhase('in');
      else if (phase === 'in') setPhase('out');
      else if (count >= 4) onDone();
      else { setCount((c) => c + 1); setPhase('in'); }
    }, ms);
    return () => clearTimeout(t);
  }, [phase, count, onDone]);

  return (
    <div className="breathe" role="status" aria-live="polite">
      <div className={`orb ${phase}`} />
      <div className="cue">{phase === 'out' ? 'Slowly out...' : 'Breathe in...'} ({count}/4)</div>
      <button type="button" className="chip ghost" onClick={onDone}>Skip</button>
    </div>
  );
}
