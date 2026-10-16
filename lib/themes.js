// What the person is going through (theme) and how they want to feel (mode).
// Each mode carries the Qloo taste-tag keywords that nudge results and the
// search suffix used for the play links.

export const MODE_INFO = {
  // theme: worry
  calm:    { theme: 'worry',      label: 'Calm me',     hint: 'Slow and steady, breathe',            tags: ['acoustic', 'ambient', 'folk', 'worship'], suffix: 'calm songs' },
  dance:   { theme: 'worry',      label: 'Lift me up',  hint: 'Upbeat, stand and move',          tags: ['dance', 'afrobeats', 'pop'],         suffix: 'uplifting dance songs' },
  // theme: heartbreak
  release: { theme: 'heartbreak', label: 'Calm me',     hint: 'Gentle songs to feel it and settle', tags: ['sad', 'soul', 'r&b', 'ballad'],  suffix: 'heartbreak songs' },
  heal:    { theme: 'heartbreak', label: 'Lift me up',  hint: 'Songs that own your worth and lift you', tags: ['empowering', 'uplifting', 'pop', 'r&b'],       suffix: 'moving on songs' },
};

export const THEMES = {
  worry:      { label: 'Worry & overthinking', modes: ['calm', 'dance'],     defaultMode: 'calm' },
  heartbreak: { label: 'Heartbreak',           modes: ['release', 'heal'],   defaultMode: 'release' },
};

export const themeOf = (mode) => MODE_INFO[mode]?.theme || 'worry';

// Never trust the client: pick a valid (theme, mode) pair.
export function resolvePair(theme, mode) {
  const t = THEMES[theme] ? theme : MODE_INFO[mode] ? themeOf(mode) : 'worry';
  const m = THEMES[t].modes.includes(mode) ? mode : THEMES[t].defaultMode;
  return { theme: t, mode: m };
}

export const moodTags = (mode) => (MODE_INFO[mode] || MODE_INFO.calm).tags;
