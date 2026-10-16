'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Avatar from './Avatar';

// Artist search with live Qloo suggestions. Enter or a click both add the artist,
// which appears as a chip straight away. If search is down, Enter still adds the
// typed name so the person is never blocked.
export default function ArtistSearch({ onPick, added, full }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [problem, setProblem] = useState('');
  const [source, setSource] = useState('');
  const cache = useRef(new Map());
  const inputRef = useRef(null);
  const listId = useId();
  const isAdded = (it) => added?.has(it.name.toLowerCase());

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); setState('idle'); setOpen(false); return undefined; }
    const key = term.toLowerCase();
    setOpen(true);
    if (cache.current.has(key)) {
      const hit = cache.current.get(key);
      setItems(hit.items); setSource(hit.source); setState('done'); setActive(-1);
      return undefined;
    }
    const ctrl = new AbortController();
    setState('loading');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (data.source === 'error' || data.source === 'limited') {
          setItems([]); setProblem(data.message || 'Search is busy. You can still press Enter to add the name.'); setState('error');
        } else {
          cache.current.set(key, { items: data.results || [], source: data.source || '' });
          setItems(data.results || []); setSource(data.source || ''); setState('done');
        }
        setActive(-1);
      } catch (err) {
        if (err.name !== 'AbortError') { setItems([]); setProblem('Search is unavailable. You can still press Enter to add the name.'); setState('error'); }
      }
    }, 160);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  function reset() { setQ(''); setItems([]); setOpen(false); setActive(-1); setState('idle'); inputRef.current?.focus(); }

  function choose(it) {
    if (!it || isAdded(it)) return;
    onPick({ name: it.name, id: it.id?.startsWith('sample:') ? undefined : it.id, image: it.image || undefined });
    reset();
  }

  function addTyped() {
    const v = q.replace(/\s+/g, ' ').trim();
    if (!v) return;
    onPick({ name: v });
    reset();
  }

  function move(dir) {
    if (!items.length) return;
    setOpen(true);
    let i = active;
    for (let n = 0; n < items.length; n += 1) {
      i = (i + dir + items.length) % items.length;
      if (!isAdded(items[i])) { setActive(i); return; }
    }
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) choose(items[active]);
      else {
        const first = items.find((it) => !isAdded(it));
        const exact = items.find((it) => it.name.toLowerCase() === q.trim().toLowerCase() && !isAdded(it));
        if (exact || (first && state === 'done')) choose(exact || first);
        else addTyped();
      }
    } else if (e.key === 'Escape') setOpen(false);
  }

  const term = q.trim();
  const showList = open && term.length >= 2;

  return (
    <div className="combo">
      <label className="field-label" htmlFor="artist-in">Add an artist</label>
      <div className="searchbox">
        <input
          id="artist-in" ref={inputRef} type="text" role="combobox" aria-expanded={showList} aria-controls={listId}
          aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={q} maxLength={80} autoComplete="off" disabled={full}
          placeholder={full ? 'Remove one to add another' : 'Type a name, e.g. an artist you play when you need comfort'}
          onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          onFocus={() => term.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <button type="button" className="addbtn" onClick={() => (items.find((it) => !isAdded(it)) && state === 'done' ? choose(items.find((it) => !isAdded(it))) : addTyped())} disabled={full || term.length < 1}>Add</button>
        {state === 'loading' && <span className="spinner sm inl" aria-label="Searching" />}
      </div>
      {showList && (
        <ul className="suggest" id={listId} role="listbox" aria-label="Artist suggestions">
          {items.map((it, i) => (
            <li
              key={it.id || it.name} id={`${listId}-${i}`} role="option" aria-selected={i === active} aria-disabled={isAdded(it)}
              className={`${i === active ? 'act' : ''}${isAdded(it) ? ' done' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); choose(it); }} onMouseEnter={() => setActive(i)}
            >
              <Avatar src={it.image} name={it.name} className="dot sq" />
              <span><b>{it.name}</b>{it.tags?.length > 0 && <small>{it.tags.slice(0, 3).join(' · ')}</small>}</span>
              {isAdded(it) && <em className="addedtag">Added ✓</em>}
            </li>
          ))}
          {state === 'loading' && items.length === 0 && <li className="note" role="option" aria-selected="false">Searching...</li>}
          {state === 'error' && <li className="note" role="option" aria-selected="false">{problem}</li>}
          {state === 'done' && items.length === 0 && (
            <li className="note" role="option" aria-selected="false">
              {source === 'qloo' ? 'Qloo has no match.' : 'No match.'} Press Enter to add &ldquo;{term}&rdquo; by name anyway.
            </li>
          )}
          {state === 'done' && items.length > 0 && source === 'sample' && <li className="note" role="option" aria-selected="false">Sample matches (no Qloo key set)</li>}
        </ul>
      )}
    </div>
  );
}
