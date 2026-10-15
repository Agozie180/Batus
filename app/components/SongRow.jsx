'use client';

import Avatar from './Avatar';
import { playLinks } from '../../lib/links';

// One real song: artwork, title, a 30-second preview, and add/remove for a playlist.
export default function SongRow({ song, player, inList, onAdd, onRemove }) {
  const isNow = player.nowId === song.id;
  const playing = isNow && player.playing;
  const links = playLinks(`${song.artist} ${song.title}`);
  return (
    <div className={`song${isNow ? ' now' : ''}`}>
      {song.preview ? (
        <button type="button" className="pbtn" onClick={() => player.toggle(song)} aria-label={`${playing ? 'Pause' : 'Play preview of'} ${song.title} by ${song.artist}`}>
          {song.art ? <img src={song.art} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Avatar name={song.artist} className="art" />}
          <span className="ico" aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
        </button>
      ) : (
        <a className="pbtn" href={links.youtube} target="_blank" rel="noopener noreferrer" aria-label={`Play ${song.title} on YouTube`}>
          {song.art ? <img src={song.art} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Avatar name={song.artist} className="art" />}
          <span className="ico" aria-hidden="true">▶</span>
        </a>
      )}
      <div className="sinfo">
        <b>{song.title}</b>
        <small>{song.artist}{song.album ? ` · ${song.album}` : ''}</small>
      </div>
      <div className="sact">
        <a className="mini" href={links.youtube} target="_blank" rel="noopener noreferrer" title="Open full song on YouTube">YouTube</a>
        <a className="mini" href={links.spotify} target="_blank" rel="noopener noreferrer" title="Open on Spotify">Spotify</a>
        {onRemove ? (
          <button type="button" className="mini danger" onClick={() => onRemove(song)} aria-label={`Remove ${song.title} from playlist`}>Remove</button>
        ) : (
          <button type="button" className={`add${inList ? ' on' : ''}`} disabled={inList} onClick={() => onAdd(song)} aria-label={inList ? `${song.title} is in your playlist` : `Add ${song.title} to your playlist`}>
            {inList ? '✓ Added' : '+ Playlist'}
          </button>
        )}
      </div>
    </div>
  );
}
