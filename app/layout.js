import './globals.css';

const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata = {
  metadataBase: new URL(base),
  title: 'Batus',
  description: "When your mind won't stop or your heart is hurting, Batus finds your own kind of music through Qloo's taste graph.",
  applicationName: 'Batus',
  appleWebApp: { capable: true, title: 'Batus', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'Batus',
    description: "When your mind won't stop or your heart is hurting, your own music answers first.",
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Batus', description: "When your mind won't stop or your heart is hurting, your own music answers first." },
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
