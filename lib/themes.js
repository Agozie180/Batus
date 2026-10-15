// What the person is going through (theme) and how they want to feel (mode).
// Each mode carries the Qloo taste-tag keywords that nudge results and the
// search suffix used for the play links.

export const MODE_INFO = {
  // theme: worry
  calm:    { theme: 'worry',      label: 'Calm me',     hint: 'Slow worship, breathe',            tags: ['gospel', 'worship'],      suffix: 'worship songs' },
  dance:   { theme: 'worry',      label: 'Lift me up',  hint: 'Praise, stand and dance',          tags: ['gospel', 'praise'],       suffix: 'praise dance songs' },
  // theme: heartbreak
  release: { theme: 'heartbreak', label: 'Let it out',  hint: 'Sad songs you can feel and cry to', tags: ['heartbreak', 'sad'],      suffix: 'heartbreak songs' },
  heal:    { theme: 'heartbreak', label: 'Move on',     hint: 'Songs that lift you, own your worth', tags: ['uplifting', 'empowering'], suffix: 'healing and moving on songs' },
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
