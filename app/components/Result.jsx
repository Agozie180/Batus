'use client';

import { useState } from 'react';
import Avatar from './Avatar';
import Breathe from './Breathe';
import ParkIt from './ParkIt';
import SongRow from './SongRow';
import { KIND, LINK_LABEL, SOURCE_LABEL, THEMES } from '../config';

const pctOf = (a) => (typeof a === 'number' ? Math.round(Math.min(1, Math.max(0, a)) * 100) : null);

function matchLabel(p) {
  const pct = pctOf(p.affinity);
  if (pct === null) return null;
  return pct >= 99 ? 'Top match' : `${pct}% match`;
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
        {p.tags?.length > 0 && <p className="meta">{p.tags.slice(0, 3).join(' · ')}</p>}
      </div>
      {isArtist && onSave ? (
        <button type="button" className="heart" aria-pressed={saved} aria-label={saved ? `${p.name} is in your sound` : `Add ${p.name} to your sound`} disabled={saved} onClick={() => onSave(p)}>
          {saved ? '♥' : '♡'}
        </button>
      ) : <span />}
      {pct !== null && <div className="matchrow"><span className="matchpill">{matchLabel(p)}</span><div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div></div>}
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
        {p.tags?.length > 0 && <p className="meta">{p.tags.slice(0, 3).join(' · ')}</p>}
        {matchLabel(p) && <span className="matchpill">{matchLabel(p)} for your taste</span>}
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

export default function Result({ data, theme, mode, savedNames, songsState, onRetrySongs, player, playlist, onAddSong, onSave, onRestart }) {
  const [breathing, setBreathing] = useState(false);
  const [showMore, setShowMore] = useState(false);
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

      {data.unmatched?.length > 0 && (
        <p className="notice" role="status">
          Qloo doesn&apos;t know {data.unmatched.map((n) => `“${n}”`).join(', ')}, so {data.unmatched.length > 1 ? 'they were' : 'it was'} left out
          {' '}and these matches are based on {music.length && savedNames.size > data.unmatched.length ? 'your other artists and your mood' : 'your mood alone'}.
          Check the spelling in <b>Your sound</b>.
        </p>
      )}

      {!data.set && songsState === 'loading' && (
        <div role="status" aria-live="polite">
          <p className="sr">Finding your music</p>
          <div className="skel row-skel" aria-hidden="true" /><div className="skel row-skel" aria-hidden="true" /><div className="skel row-skel" aria-hidden="true" />
        </div>
      )}
      {!data.set && songsState === 'error' && (
        <p className="notice" role="alert">Your artists are below, but the songs did not load. <button type="button" className="chip" onClick={onRetrySongs}>Try again</button></p>
      )}

      {data.set?.length > 0 && (
        <section className="set" aria-label="A set for you">
          <h2 className="section-title">{data.setBy === 'claude' ? 'Songs for what you are going through' : 'Songs matched to your mood'}</h2>
          <p className="hint">
            {data.setBy === 'claude'
              ? 'Real songs by your Qloo matches, picked and ordered for you. Listen top to bottom.'
              : `Real songs by your Qloo matches${data.moodTags?.length ? `, chosen for Qloo's “${data.moodTags[0]}” mood` : ''}. Listen top to bottom.`}
          </p>
          <div className="songs">
            {data.set.map((song, i) => (
              <div key={song.id} className="setrow">
                <span className="num" aria-hidden="true">{i + 1}</span>
                <div className="setbody">
                  <SongRow song={song} player={player} inList={inList(song)} onAdd={onAddSong} />
                  {data.setBy === 'claude' && song.why && <p className="why">{song.why}</p>}
                </div>
              </div>
            ))}
          </div>
          {showMore && data.more?.length > 0 && (
            <div className="songs more">
              {data.more.map((song) => (
                <div key={song.id} className="setbody">
                  <SongRow song={song} player={player} inList={inList(song)} onAdd={onAddSong} />
                </div>
              ))}
            </div>
          )}
          <div className="pactions">
            <button type="button" className="chip" onClick={() => data.set.filter((x) => !inList(x)).forEach(onAddSong)}>Add the whole set to my playlist</button>
            {data.more?.length > 0 && (
              <button type="button" className="chip ghost" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
                {showMore ? 'Show fewer songs' : `Show ${data.more.length} more songs`}
              </button>
            )}
          </div>
        </section>
      )}

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

      <h2 className="section-title">{hero ? 'More artists that match your taste' : 'Matched to your taste'}</h2>
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
