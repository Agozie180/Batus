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


// What Qloo contributed, computed only from what Qloo actually returned for this check-in.
function QlooReport({ data, music, beyond, recognised }) {
  const tops = music.map((m) => ({ m, pct: pctOf(m.affinity) })).filter((x) => x.pct !== null).sort((a, b) => b.pct - a.pct);
  const top = tops[0];
  const tags = data.signature?.length || 0;
  const podcast = beyond.find((b) => b.type === 'podcast');
  const show = beyond.find((b) => b.type === 'tv_show');
  const moodTag = data.moodTags?.[0];
  if (data.source !== 'qloo' || music.length === 0) return null;
  const stats = [
    [music.length, 'artists from the taste graph'],
    top ? [`${top.pct}%`, 'best measured match'] : null,
    tags ? [tags, 'taste tags attached'] : null,
    beyond.length ? [beyond.length, 'podcast & show matches'] : null,
  ].filter(Boolean);
  const rows = [
    ['Where the artists come from',
      'Its memory of text it was trained on. Often the same famous names, and it can invent one.',
      `Qloo's taste graph, by ID. ${recognised ? `${recognised === 1 ? 'Your artist was' : `${recognised} of your artists were`} recognised. ` : ''}Anything Qloo did not return is thrown away.`],
    ['How well each one fits you',
      'A guess in words, or a made-up number.',
      top ? `A measured score: ${top.m.name} is a ${top.pct}% match for your taste.` : 'A measured affinity score for each artist.'],
    ['What it feels like',
      'Its own idea of what “sad” or “calming” means.',
      moodTag ? `Qloo's own music tag, “${moodTag}”, steered the match.` : 'Qloo mood tags steer the match.'],
    ['Beyond music',
      'Usually stays with music.',
      podcast || show ? `From the same taste: ${[podcast && `the podcast ${podcast.name}`, show && `the show ${show.name}`].filter(Boolean).join(' and ')}.` : 'Podcasts and TV from the same taste.'],
  ];
  return (
    <section className="qreport" aria-labelledby="qr-h">
      <div className="qr-head">
        <span className="qr-badge">Qloo</span>
        <div>
          <h2 id="qr-h">What Qloo added</h2>
          <p>A chatbot can describe music. Qloo measures taste.</p>
        </div>
      </div>
      <ul className="qr-stats">
        {stats.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}
      </ul>
      <div className="qr-table" role="table" aria-label="A chatbot alone compared with Qloo in Batus">
        <div className="qr-row qr-h" role="row"><span role="columnheader" /><span role="columnheader">A chatbot alone</span><span role="columnheader" className="q">Qloo, in Batus</span></div>
        {rows.map(([k, a, b]) => (
          <div className="qr-row" role="row" key={k}>
            <span role="rowheader" className="k">{k}</span>
            <span role="cell" className="a">{a}</span>
            <span role="cell" className="q">{b}</span>
          </div>
        ))}
      </div>
      <p className="qr-legend"><span className="prov q">Qloo</span> artists, match %, tags, podcast, show <span className="prov a">Apple catalogue</span> songs and previews <span className="prov y">You</span> your own artists</p>
    </section>
  );
}

function Prov({ song }) {
  if (song.source === 'yours') return <p className="prov-line"><span className="prov y">You</span> an artist you love</p>;
  const pct = pctOf(song.affinity);
  return <p className="prov-line"><span className="prov q">Qloo</span> {pct !== null ? `${pct}% taste match` : 'taste match'} · {song.artist}</p>;
}

export default function Result({ data, theme, mode, savedNames, songsState, onRetrySongs, onReroll, player, playlist, onAddSong, onSave, onRestart }) {
  const [breathing, setBreathing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const music = data.picks.filter((p) => p.type === 'artist');
  const [hero, ...rest] = music;
  const beyond = data.extras || [];
  const saved = (p) => savedNames.has(p.name.toLowerCase());
  const inList = (song) => playlist.some((x) => x.id === song.id);
  const song = { player, inList, onAddSong };
  const recognised = Math.max(0, savedNames.size - (data.unmatched?.length || 0));

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

      <QlooReport data={data} music={music} beyond={beyond} recognised={recognised} />

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
                  <Prov song={song} />
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
            {onReroll && (
              <button type="button" className="chip" disabled={songsState === 'loading'} onClick={onReroll}>
                {songsState === 'loading' ? 'Finding more...' : 'Different songs'}
              </button>
            )}
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


      <button type="button" className="chip again" onClick={onRestart}>Start a new check-in</button>
    </section>
  );
}
