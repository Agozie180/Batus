// UI configuration: copy and the two situations Batus supports. No artist is
// hard-coded anywhere: every artist comes from the person or from Qloo.

export const MAX_ARTISTS = 6;
export const MAX_SONGS = 5;
export const STORAGE_KEY = 'batus.profile.v3';
export const PLAYLIST_KEY = 'batus.playlists.v1';

export const CITIES = ['', 'Lagos', 'Accra', 'Nairobi', 'Johannesburg', 'London', 'Paris', 'Berlin', 'New York', 'Houston', 'Toronto', 'Sao Paulo', 'Mumbai', 'Sydney'];

export const THEMES = {
  worry: {
    short: 'Worry',
    label: 'Worry & overthinking',
    sub: 'Results, money, the future, a mind that will not switch off',
    placeholder: "I can't stop worrying about money and what's next...",
    quick: [
      ['Results came out', "The results were announced and I didn't win."],
      ['Money & food', "I'm worried about money and what I'll eat."],
      ["Can't sleep", "I can't sleep and my mind won't stop."],
      ['Overthinking', "I'm just overthinking everything."],
    ],
    modes: [
      ['calm', 'Calm me', 'Slow and steady, breathe'],
      ['dance', 'Lift me up', 'Upbeat, stand and move'],
    ],
    soundHint: "Artists you reach for when you need peace, in any genre or language. Batus asks Qloo's taste graph for more like them.",
    park: {
      title: 'Park the loudest worry',
      hint: 'Write it down, then let it rest until tomorrow. It stays on this screen only and is never sent or saved.',
      placeholder: 'The thing that keeps circling...',
      cta: 'Park it until tomorrow',
      done: 'Parked. It will still be there tomorrow, and you will face it with a clearer head.',
    },
  },
  heartbreak: {
    short: 'Heartbreak',
    label: 'Heartbreak',
    sub: 'A breakup, from either side, and the quiet that follows',
    placeholder: 'We broke up and I keep replaying everything...',
    quick: [
      ['She left me', 'She broke up with me and I cannot stop thinking about it.'],
      ['I ended it', 'I ended the relationship, and I still feel terrible.'],
      ['I miss them', 'I still miss them so much.'],
      ['Betrayed', 'I was cheated on and I feel betrayed.'],
    ],
    modes: [
      ['release', 'Calm me', 'Gentle songs to feel it and settle'],
      ['heal', 'Lift me up', 'Songs that own your worth and lift you'],
    ],
    soundHint: 'Artists whose songs you play when your heart hurts, in any genre or language. Batus asks Qloo for more like them.',
    park: {
      title: 'Write it, do not send it',
      hint: 'Say what you wish you could say to them. It stays on this screen only and is never sent or saved.',
      placeholder: 'What I wish I could tell you...',
      cta: 'Release it',
      done: 'Released. You said it, and you did not have to send it.',
    },
  },
};

// One-tap moments for a first-time visitor. The artists are the person's own taste
// (inputs); every recommendation still comes back from Qloo.
export const EXAMPLES = [
  { id: 'results', theme: 'worry', mode: 'calm', title: 'Results came out', sub: 'Worry · Calm me', text: "The results were announced and I didn't win.", artists: ['Sinach', 'Hillsong Worship'] },
  { id: 'breakup', theme: 'heartbreak', mode: 'release', title: 'After the breakup', sub: 'Heartbreak · Calm me', text: 'She broke up with me and I cannot stop thinking about it.', artists: ['Adele', 'SZA'] },
  { id: 'rise', theme: 'heartbreak', mode: 'heal', title: 'Time to rise', sub: 'Heartbreak · Lift me up', text: 'I ended it, and I still feel terrible.', artists: ['Burna Boy', 'Beyoncé'] },
];

export const defaultProfile = () => ({ artists: [], songs: [], location: '' });

export const LINK_LABEL = { youtube: 'YouTube', spotify: 'Spotify', audiomack: 'Audiomack', web: 'Where to watch' };
export const KIND = { artist: 'Music', podcast: 'Listen', tv_show: 'Watch', movie: 'Film', book: 'Read' };
export const WEB_LABEL = { tv_show: 'Where to watch', movie: 'Where to watch', book: 'Find the book' };

export const SOURCE_LABEL = {
  qloo: 'Live Qloo taste graph',
  sample: 'Sample data (no Qloo key set)',
  error: 'Qloo problem',
  none: 'No matches yet',
};

export function greeting(hour) {
  if (hour < 5) return 'Still up? Keep the volume low.';
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  if (hour < 22) return 'Good evening.';
  return 'It is late. Be gentle with yourself.';
}
