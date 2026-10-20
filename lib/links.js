// Qloo returns taste, not audio. We hand playback to the platforms people
// already use, via search deep-links. No scraping, no API keys, nothing stored.

import { MODE_INFO } from './themes.js';

export const MODES = MODE_INFO;

const enc = encodeURIComponent;

export function playLinks(query) {
  const q = enc(query.trim());
  return {
    youtube: `https://www.youtube.com/results?search_query=${q}`,
    spotify: `https://open.spotify.com/search/${q}`,
    audiomack: `https://audiomack.com/search?q=${q}`,
  };
}

export function artistLinks(artistName, mode) {
  const suffix = (MODES[mode] || MODES.calm).suffix;
  return playLinks(`${artistName} ${suffix}`);
}

export function songLinks(title) {
  return playLinks(title);
}

export function watchLinks(title) {
  const q = enc(title.trim());
  return {
    youtube: `https://www.youtube.com/results?search_query=${q}%20trailer`,
    web: `https://www.google.com/search?q=${q}%20where%20to%20watch`,
  };
}

export function listenLinks(title) {
  const q = enc(title.trim());
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    youtube: `https://www.youtube.com/results?search_query=${q}%20podcast`,
  };
}

export function readLinks(title) {
  const q = enc(title.trim());
  return {
    web: `https://www.google.com/search?q=${q}%20book`,
    youtube: `https://www.youtube.com/results?search_query=${q}%20book%20summary`,
  };
}
