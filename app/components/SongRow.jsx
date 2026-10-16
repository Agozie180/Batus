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
          <span className="ico" aria-hidden="true">{playing ? '❚❚' : '▶'}</span><span className="sr">{playing ? 'Pause' : '30 second preview'}</span>
        </button>
      ) : (
        <a className="pbtn" href={links.youtube} target="_blank" rel="noopener noreferrer" aria-label={`Play ${song.title} on YouTube`}>
          {song.art ? <img src={song.art} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Avatar name={song.artist} className="art" />}
          <span className="ico" aria-hidden="true">▶</span>
        </a>
      )}
      <div className="sinfo">
        <b title={song.title}>{song.title}</b>
        <small>{song.artist}{song.album ? ` · ${song.album}` : ''}</small>
        <div className="hear" aria-label="Hear the full song">
          <span className="lbl">Full song</span>
          {song.url && <a href={song.url} target="_blank" rel="noopener noreferrer" title="Opens this exact track on Apple Music">Apple Music</a>}
          <a href={links.youtube} target="_blank" rel="noopener noreferrer" title="Searches YouTube for this song">YouTube</a>
          <a href={links.spotify} target="_blank" rel="noopener noreferrer" title="Searches Spotify for this song">Spotify</a>
        </div>
      </div>
      <div className="sact">
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
