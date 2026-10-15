'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// One shared audio element: starting a new preview stops the previous one.
export default function usePlayer() {
  const audio = useRef(null);
  const current = useRef(null);
  const [nowId, setNowId] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.onended = () => setPlaying(false);
    audio.current = a;
    return () => { a.pause(); a.src = ''; };
  }, []);

  const toggle = useCallback((song) => {
    const a = audio.current;
    if (!a || !song?.preview) return;
    if (current.current === song.id && !a.paused) { a.pause(); return; }
    if (current.current !== song.id) {
      a.src = song.preview;
      current.current = song.id;
      setNowId(song.id);
    }
    a.play().catch(() => setPlaying(false));
  }, []);

  const stop = useCallback(() => { audio.current?.pause(); }, []);

  return { nowId, playing, toggle, stop };
}
