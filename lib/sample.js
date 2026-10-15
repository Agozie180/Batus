// Offline demo data, used ONLY when QLOO_API_KEY is absent, and always labelled
// "sample" in the API response and the UI. Never presented as live Qloo output.

const a = (name, tags, themes) => ({ id: `sample:${name}`, name, type: 'artist', affinity: null, tags, image: null, themes });
const W = ['worry'];
const H = ['heartbreak'];

// International, well-known artists, used ONLY to show the interface when no Qloo
// key is configured. Labelled "sample" everywhere; never presented as taste-graph output.
export const SAMPLE_ARTISTS = [
  a('Bethel Music', ['worship'], W),
  a('Elevation Worship', ['worship'], W),
  a('Hillsong Worship', ['worship'], W),
  a('Coldplay', ['pop', 'rock'], W),
  a('Norah Jones', ['jazz', 'acoustic'], W),
  a('Pharrell Williams', ['pop', 'feel good'], W),
  a('Adele', ['pop', 'soul'], H),
  a('Sam Smith', ['pop', 'soul'], H),
  a('Lewis Capaldi', ['pop', 'ballad'], H),
  a('Billie Eilish', ['pop', 'alternative'], H),
  a('Olivia Rodrigo', ['pop'], H),
  a('SZA', ['r&b'], H),
  a('Bruno Mars', ['pop', 'r&b'], H),
  a('Beyonce', ['pop', 'r&b'], H),
];

export const SAMPLE_EXTRAS = [
  { id: 'sample:podcast', name: 'Sample encouragement podcast', type: 'podcast', affinity: null, tags: ['sample'], image: null },
  { id: 'sample:show', name: 'Sample feel-good show', type: 'tv_show', affinity: null, tags: ['sample'], image: null },
];

export function searchSample(query, take = 5) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SAMPLE_ARTISTS.filter((x) => x.name.toLowerCase().includes(q)).slice(0, take);
}
