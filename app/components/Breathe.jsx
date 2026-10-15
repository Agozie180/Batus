'use client';

import { useEffect, useState } from 'react';

// Four slow breaths: in for 4s, out for 6s.
export default function Breathe({ onDone }) {
  const [phase, setPhase] = useState('rest');
  const [count, setCount] = useState(1);

  useEffect(() => {
    const ms = phase === 'rest' ? 80 : phase === 'in' ? 4000 : 6000;
    const t = setTimeout(() => {
      if (phase === 'rest') setPhase('in');
      else if (phase === 'in') setPhase('out');
      else if (count >= 4) onDone();
      else { setCount((c) => c + 1); setPhase('in'); }
    }, ms);
    return () => clearTimeout(t);
  }, [phase, count, onDone]);

  return (
    <div className="breathe" role="status" aria-live="polite">
      <div className={`orb ${phase}`} />
      <div className="cue">{phase === 'out' ? 'Slowly out...' : 'Breathe in...'} ({count}/4)</div>
      <button type="button" className="chip ghost" onClick={onDone}>Skip</button>
    </div>
  );
}
