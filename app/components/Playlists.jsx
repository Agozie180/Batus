'use client';

import { useEffect, useState } from 'react';
import SongRow from './SongRow';
import { THEMES } from '../config';

function asText(name, songs) {
  return `${name}\n${songs.map((s, i) => `${i + 1}. ${s.artist} - ${s.title}`).join('\n')}\n`;
}

// Playlists the person builds from what Qloo surfaced. One per mood, saved in this browser only.
export default function Playlists({ playlists, onRemove, onClear, player, activeMode, flash }) {
  const entries = Object.values(THEMES).flatMap((t) => t.modes.map(([key, label]) => ({ key, label: `${t.short} · ${label}` })));
  const [tab, setTab] = useState(activeMode);
  useEffect(() => { setTab(activeMode); }, [activeMode]);
  const key = entries.some((e) => e.key === tab) ? tab : entries[0].key;
  const cur = entries.find((e) => e.key === key);
  const songs = playlists[key] || [];
  const total = Object.values(playlists).reduce((n, l) => n + l.length, 0);

  async function copy() {
    try { await navigator.clipboard.writeText(asText(cur.label, songs)); flash('Playlist copied.'); } catch { flash('Could not copy. Use Download instead.'); }
  }
  function download() {
    const blob = new Blob([asText(cur.label, songs)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `batus-${cur.label.toLowerCase().replace(/\W+/g, '-')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <details className="card playlists" id="playlists" open={total > 0}>
      <summary>
        <span className="sum-title">My playlists</span>
        <span className="sum-sub">{total === 0 ? 'Add songs you like from your matches' : `${total} song${total > 1 ? 's' : ''} saved on this device`}</span>
        <span className="sum-edit">Open</span>
      </summary>
      <div className="ptabs" role="tablist" aria-label="Playlists">
        {entries.map((e) => (
          <button key={e.key} type="button" role="tab" aria-selected={key === e.key} className={`ptab${key === e.key ? ' on' : ''}`} onClick={() => setTab(e.key)}>
            {e.label} <span className="cnt">{(playlists[e.key] || []).length}</span>
          </button>
        ))}
      </div>
      {songs.length === 0 ? (
        <p className="empty">Nothing here yet. Tap <b>+ Playlist</b> on any song in your matches and it will be saved under <b>{cur.label}</b>.</p>
      ) : (
        <>
          <div className="songs">
            {songs.map((s) => <SongRow key={s.id} song={s} player={player} onRemove={(x) => onRemove(key, x)} />)}
          </div>
          <div className="pactions">
            <button type="button" className="chip" onClick={copy}>Copy list</button>
            <button type="button" className="chip" onClick={download}>Download .txt</button>
            <button type="button" className="chip ghost" onClick={() => onClear(key)}>Clear playlist</button>
          </div>
          <p className="hint">Previews are 30 seconds. Use YouTube or Spotify on a song to hear all of it, or paste the list into a playlist app.</p>
        </>
      )}
    </details>
  );
}
