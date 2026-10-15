export default function manifest() {
  return {
    name: 'Batus',
    short_name: 'Batus',
    description: "When your mind won't stop, your own praise music answers first.",
    start_url: '/',
    display: 'standalone',
    background_color: '#1b1636',
    theme_color: '#1b1636',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
