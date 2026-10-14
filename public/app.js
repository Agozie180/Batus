(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'batus.profile.v1';

  const PRESETS = {
    ng: { artists: ['Minister Prudence', 'Nathaniel Bassey', 'Sinach', 'Mercy Chinwo'] },
    intl: { artists: ['The Belonging Co', 'Elevation Worship', 'Maverick City Music', 'Hillsong Worship'] },
    both: {
      artists: ['Minister Prudence', 'Nathaniel Bassey', 'The Belonging Co', 'Elevation Worship'],
    },
  };

  const state = { artists: [], songs: [] };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && Array.isArray(saved.artists) && Array.isArray(saved.songs)) {
        state.artists = saved.artists.slice(0, 6);
        state.songs = saved.songs.slice(0, 5);
      }
    } catch { /* storage unavailable: fine */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  function renderTags(kind, max) {
    const box = $(kind);
    box.textContent = '';
    state[kind].forEach((name, i) => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.append(document.createTextNode(name));
      const x = document.createElement('button');
      x.type = 'button';
      x.setAttribute('aria-label', `Remove ${name}`);
      x.textContent = '×';
      x.addEventListener('click', () => { state[kind].splice(i, 1); save(); renderTags(kind, max); });
      pill.append(x);
      box.append(pill);
    });
  }

  function bindInput(kind, inputId, max) {
    const input = $(inputId);
    const add = () => {
      const v = input.value.replace(/\s+/g, ' ').trim();
      if (!v) return;
      const exists = state[kind].some((s) => s.toLowerCase() === v.toLowerCase());
      if (!exists && state[kind].length < max) state[kind].push(v);
      input.value = '';
      save();
      renderTags(kind, max);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
    });
    input.addEventListener('blur', add);
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function playRow(links, labelFirst) {
    const row = el('div', 'play');
    [['youtube', labelFirst || 'Play on YouTube'], ['spotify', 'Spotify'], ['audiomack', 'Audiomack']].forEach(([k, label]) => {
      const a = el('a', null, label);
      a.href = links[k];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      row.append(a);
    });
    return row;
  }

  function renderCrisis(data) {
    const out = $('out');
    out.textContent = '';
    const box = el('div', 'crisis');
    box.append(el('h2', null, data.title));
    data.body.forEach((p) => box.append(el('p', null, p)));
    const ul = el('p');
    data.resources.forEach((r, i) => {
      const a = el('a', null, r.label);
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      if (i) ul.append(document.createTextNode('  ·  '));
      ul.append(a);
    });
    box.append(ul);
    out.append(box);
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderResult(data) {
    const out = $('out');
    out.textContent = '';

    const msg = el('div', 'msg');
    const label = { qloo: 'Live Qloo taste graph', sample: 'Sample data (no Qloo key set)', error: 'Qloo unavailable', none: 'Your songs only' }[data.source] || data.source;
    msg.append(el('span', `src ${data.source === 'sample' ? 'sample' : ''}`, label));
    msg.append(el('p', 'opener', data.message.opener));
    if (data.message.topic) msg.append(el('p', null, data.message.topic));
    msg.append(el('p', 'after', data.message.after));
    out.append(msg);

    if (data.favourites.length) {
      out.append(el('h2', 'section-title', 'Start with what you already love'));
      const list = el('div', 'list');
      data.favourites.forEach((f) => {
        const item = el('div', 'item');
        item.append(el('h3', null, f.title));
        item.append(playRow(f.links, 'Play now'));
        list.append(item);
      });
      out.append(list);
    }

    out.append(el('h2', 'section-title', 'More that match your taste'));
    if (!data.picks.length) {
      const why = data.source === 'error'
        ? 'Qloo could not be reached right now. Your own songs above still work.'
        : 'Add a few favourite artists above and Batus will find more like them.';
      out.append(el('p', 'empty', why));
    } else {
      const list = el('div', 'list');
      data.picks.forEach((p) => {
        const item = el('div', 'item');
        item.append(el('h3', null, p.name));
        if (p.tags && p.tags.length) item.append(el('p', 'meta', p.tags.join(' · ')));
        if (typeof p.affinity === 'number') {
          const bar = el('div', 'bar');
          const fill = document.createElement('i');
          fill.style.width = `${Math.round(Math.min(1, Math.max(0, p.affinity)) * 100)}%`;
          bar.append(fill);
          bar.title = `Taste match ${Math.round(p.affinity * 100)}%`;
          item.append(bar);
        }
        item.append(playRow(p.links));
        list.append(item);
      });
      out.append(list);
    }

    if (data.trace && data.trace.length) {
      const d = el('details', 'trace');
      d.append(el('summary', null, 'How this was chosen'));
      const ul = el('ul');
      data.trace.forEach((t) => ul.append(el('li', null, t)));
      d.append(ul);
      out.append(d);
    }

    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function go() {
    const btn = $('go');
    const status = $('status');
    const mode = document.querySelector('input[name="mode"]:checked').value;
    btn.disabled = true;
    status.textContent = 'Finding your music...';
    try {
      const res = await fetch('/api/praise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: $('text').value, mode, artists: state.artists, songs: state.songs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      status.textContent = '';
      data.crisis ? renderCrisis(data) : renderResult(data);
    } catch (err) {
      status.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
      btn.disabled = false;
    }
  }

  function init() {
    load();
    renderTags('artists', 6);
    renderTags('songs', 5);
    bindInput('artists', 'artist-in', 6);
    bindInput('songs', 'song-in', 5);

    document.querySelectorAll('#quick .chip').forEach((c) =>
      c.addEventListener('click', () => { $('text').value = c.dataset.text; }));
    document.querySelectorAll('[data-preset]').forEach((c) =>
      c.addEventListener('click', () => {
        state.artists = PRESETS[c.dataset.preset].artists.slice();
        save();
        renderTags('artists', 6);
      }));
    $('go').addEventListener('click', go);
  }

  init();
})();
