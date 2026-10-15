'use client';

import { useState } from 'react';

// Image from Qloo when it has one (https only, enforced server-side), else an initial.
export default function Avatar({ src, name, className = 'art' }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return <div className={`${className} fallback`} aria-hidden="true">{name.slice(0, 1)}</div>;
}
