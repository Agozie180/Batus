import './globals.css';

export const metadata = {
  title: 'Batus',
  description: "When your mind won't stop or your heart is hurting, Batus finds your own kind of music through Qloo's taste graph.",
  applicationName: 'Batus',
  appleWebApp: { capable: true, title: 'Batus', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'Batus',
    description: "When your mind won't stop or your heart is hurting, your own music answers first.",
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#1b1636',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
