'use client';

import { useState } from 'react';
import Avatar from './Avatar';
import Breathe from './Breathe';
import ParkIt from './ParkIt';
import SongRow from './SongRow';
import { KIND, LINK_LABEL, SOURCE_LABEL, THEMES } from '../config';

const pctOf = (a) => (typeof a === 'number' ? Math.round(Math.min(1, Math.max(0, a)) * 100) : null);

function whyLine(p) {
  const bits = [];
  if (p.tags?.length) bits.push(p.tags.slice(0, 3).join(' · '));
  const pct = pctOf(p.affinity);
  if (pct !== null) bits.push(`${pct}% taste match`);
  return bits.join(' · ');
}

function Links({ links, primary }) {
  return (
    <div className="play">
      {Object.entries(links).map(([k, href], i) => (
        <a key={k} href={href} target="_blank" rel="noopener noreferrer">
          {i === 0 ? (primary || `Play on ${LINK_LABEL[k]}`) : LINK_LABEL[k]}
        </a>
      ))}
    </div>
  );
}

function Songs({ p, player, inList, onAddSong }) {
  if (!p.songs?.length) return null;
  return (
    <div className="songs">
      {p.songs.map((song) => <SongRow key={song.id} song={song} player={player} inList={inList(song)} onAdd={onAddSong} />)}
    </div>
  );
}

function Card({ p, saved, onSave, player, inList, onAddSong }) {
  const pct = pctOf(p.affinity);
  const isArtist = p.type === 'artist';
  return (
    <div className="item">
      <Avatar src={p.image} name={p.name} />
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
      {isArtist && p.songs?.length > 0
        ? <Songs p={p} player={player} inList={inList} onAddSong={onAddSong} />
        : <Links links={p.links} primary={isArtist ? 'Play on YouTube' : undefined} />}
    </div>
  );
}

function Hero({ p, saved, onSave, player, inList, onAddSong }) {
  return (
    <div className="hero">
      <Avatar src={p.image} name={p.name} className="art big" />
      <div className="hero-body">
        <span className="kind">Start here</span>
        <h3>{p.name}</h3>
        <p className="meta">{whyLine(p) || 'Matched to your taste by Qloo'}</p>
        {!p.songs?.length && <Links links={p.links} primary="Play now" />}
      </div>
      {onSave && (
        <button type="button" className="heart" aria-pressed={saved} aria-label={saved ? `${p.name} is in your sound` : `Add ${p.name} to your sound`} disabled={saved} onClick={() => onSave(p)}>
          {saved ? '♥' : '♡'}
        </button>
      )}
      <Songs p={p} player={player} inList={inList} onAddSong={onAddSong} />
    </div>
  );
}

export default function Result({ data, theme, mode, savedNames, player, playlist, onAddSong, onSave, onRestart }) {
  const [breathing, setBreathing] = useState(false);
  const music = data.picks.filter((p) => p.type === 'artist');
  const [hero, ...rest] = music;
  const beyond = data.extras || [];
  const saved = (p) => savedNames.has(p.name.toLowerCase());
  const inList = (song) => playlist.some((x) => x.id === song.id);
  const song = { player, inList, onAddSong };

  return (
    <section className="out" aria-label="Your matches">
      <div className="msg">
        <span className={`src ${data.source === 'sample' ? 'sample' : ''}`}>{SOURCE_LABEL[data.source] || data.source}</span>
        {data.agent && <span className="src">Claude agent</span>}
        <p className="opener">{data.message.opener}</p>
        {data.message.topic && <p>{data.message.topic}</p>}
        {data.message.after && <p className="after">{data.message.after}</p>}
        {data.signature?.length > 0 && (
          <div className="sig" aria-label="Your taste signature, from Qloo">
            <span className="lbl">Your taste signature</span>
            {data.signature.map((t) => <span className="sig-chip" key={t}>{t}</span>)}
          </div>
        )}
        {(mode === 'calm' || mode === 'release') && !breathing && (
          <button type="button" className="chip" onClick={() => setBreathing(true)}>Take 4 slow breaths first</button>
        )}
        {breathing && <Breathe onDone={() => setBreathing(false)} />}
      </div>

      {hero && <Hero p={hero} saved={saved(hero)} onSave={onSave} {...song} />}

      {data.favourites.length > 0 && (
        <>
          <h2 className="section-title">Start with what you already love</h2>
          <div className="list">
            {data.favourites.map((f) => (
              <div className="item plain" key={f.title}>
                <h3>{f.title}</h3>
                <Links links={f.links} primary="Play now" />
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">{hero ? 'More that match your taste' : 'Matched to your taste'}</h2>
      {music.length === 0 ? (
        <p className="empty">
          {data.source === 'error'
            ? (data.problem?.message || 'Qloo could not be reached right now.')
            : 'Qloo had nothing to match yet. Add a few favourite artists and try again.'}
          {data.source === 'error' && <> <a href="/api/diagnose" target="_blank" rel="noopener noreferrer">Run diagnostics</a> to see exactly what Qloo returned.</>}
        </p>
      ) : rest.length > 0 ? (
        <div className="list">{rest.map((p) => <Card key={p.id || p.name} p={p} saved={saved(p)} onSave={onSave} {...song} />)}</div>
      ) : null}

      {beyond.length > 0 && (
        <>
          <h2 className="section-title">Beyond music, from the same taste</h2>
          <div className="list">{beyond.map((p) => <Card key={p.id || p.name} p={p} />)}</div>
        </>
      )}

      <ParkIt key={theme} copy={THEMES[theme].park} />

      {data.trace?.length > 0 && (
        <details className="trace">
          <summary>How this was chosen</summary>
          <ul>{data.trace.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      <details className="trace why">
        <summary>Why Qloo, and not just an AI chatbot?</summary>
        <ul>
          <li>A chatbot guesses what &quot;calming music&quot; or &quot;a breakup song&quot; means. Qloo knows what people with <i>your</i> taste actually love, across music, shows and podcasts.</li>
          <li>Every artist here is yours or came back from Qloo&apos;s taste graph, and every song is a real track from that artist&apos;s catalogue. The AI can choose and explain, but it cannot add an artist or a song of its own.</li>
          <li>Add songs to a playlist and tap the heart on any artist, and Batus remembers them, so your taste profile grows each time you use it.</li>
        </ul>
      </details>

      <button type="button" className="chip again" onClick={onRestart}>Start a new check-in</button>
    </section>
  );
}
