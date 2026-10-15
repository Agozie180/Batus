'use client';

import { useEffect, useState } from 'react';
import Avatar from './Avatar';

// Artist typeahead. With a Qloo key this is live Qloo search, so the person sees
// at once whether Qloo knows the artists they love.
export default function ArtistSearch({ onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

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
        setProblem(data.source === 'error' ? (data.message || 'Qloo search failed.') : '');
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
    else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && items[active]) choose(items[active]); else addTyped(); }
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
              <Avatar src={it.image} name={it.name} className="dot sq" />
              <span><b>{it.name}</b>{it.tags?.length > 0 && <small>{it.tags.join(' · ')}</small>}</span>
            </li>
          ))}
          {showNote && (
            <li className="note" role="option" aria-selected="false">
              {source === 'error'
                ? `${problem} Press Enter to add it by name anyway.`
                : source === 'qloo' ? 'Qloo has no match. Press Enter to add it by name anyway.' : 'No match. Press Enter to add it by name.'}
            </li>
          )}
          {items.length > 0 && source === 'sample' && <li className="note" role="option" aria-selected="false">Sample matches (no Qloo key set)</li>}
        </ul>
      )}
    </div>
  );
}
