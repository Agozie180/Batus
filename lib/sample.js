// Offline demo data, used ONLY when QLOO_API_KEY is absent, and always labelled
// "sample" in the API response and the UI. Never presented as live Qloo output.

const a = (name, tags) => ({ id: `sample:${name}`, name, type: 'artist', affinity: null, tags, image: null });

export const SAMPLE_ARTISTS = [
  a('Nathaniel Bassey', ['gospel', 'worship']),
  a('Sinach', ['gospel', 'praise']),
  a('Mercy Chinwo', ['gospel', 'worship']),
  a('Frank Edwards', ['gospel', 'praise']),
  a('Dunsin Oyekan', ['gospel', 'worship']),
  a('Maverick City Music', ['gospel', 'worship']),
  a('Elevation Worship', ['worship', 'contemporary']),
  a('Travis Greene', ['gospel', 'praise']),
  a('Minister Prudence', ['gospel', 'praise']),
  a('The Belonging Co', ['worship', 'contemporary']),
  a('Hillsong Worship', ['worship', 'contemporary']),
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
