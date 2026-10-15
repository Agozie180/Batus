'use client';

import { useState } from 'react';

// "Write it, do not send it." Held in component state only: never sent, never stored.
export default function ParkIt({ copy }) {
  const [text, setText] = useState('');
  const [released, setReleased] = useState(false);

  if (released) {
    return (
      <section className="card park done" aria-live="polite">
        <p>{copy.done}</p>
        <button type="button" className="chip ghost" onClick={() => { setReleased(false); setText(''); }}>Write another</button>
      </section>
    );
  }
  return (
    <section className="card park" aria-labelledby="h-park">
      <h2 id="h-park">{copy.title}</h2>
      <p className="hint">{copy.hint}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} placeholder={copy.placeholder} aria-label={copy.title} />
      <button type="button" className="chip" disabled={!text.trim()} onClick={() => { setText(''); setReleased(true); }}>{copy.cta}</button>
    </section>
  );
}
