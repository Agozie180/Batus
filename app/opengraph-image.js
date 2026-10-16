import { ImageResponse } from 'next/og';

export const alt = "Batus: when your mind won't stop or your heart is hurting, your own music answers first";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#1b1636,#2b2150)', color: '#f4eefc' }}>
        <div style={{ width: 84, height: 84, borderRadius: 42, background: '#f2b04c', boxShadow: '0 0 80px #f2b04c', marginBottom: 36, display: 'flex' }} />
        <div style={{ fontSize: 132, fontWeight: 700, color: '#f2b04c', display: 'flex' }}>Batus</div>
        <div style={{ fontSize: 40, marginTop: 20, maxWidth: 900, textAlign: 'center', display: 'flex' }}>When your mind won't stop or your heart is hurting, your own music answers first.</div>
        <div style={{ fontSize: 26, marginTop: 36, opacity: 0.75, display: 'flex' }}>Powered by Qloo's taste graph</div>
      </div>
    ),
    size,
  );
}
