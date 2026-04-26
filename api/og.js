import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const TIERS = {
  shrimp: { e:'🦐', n:'SHRIMP', c:'#F97316' },
  crab:   { e:'🦀', n:'CRAB', c:'#FCD34D' },
  dolphin:{ e:'🐬', n:'DOLPHIN', c:'#60A5FA' },
  whale:  { e:'🐋', n:'WHALE', c:'#A855F7' },
  king:   { e:'👑', n:'ROYALTY', c:'#4ADE80' }
};

function tierFor(s) {
  if (s < 100) return TIERS.shrimp;
  if (s < 1000) return TIERS.crab;
  if (s < 5000) return TIERS.dolphin;
  if (s < 20000) return TIERS.whale;
  return TIERS.king;
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const game = (searchParams.get('game') || 'MONSHI ARCADE').toUpperCase().slice(0, 32);
    const score = parseInt(searchParams.get('score') || '0') || 0;
    const name = (searchParams.get('name') || 'ANON').toUpperCase().slice(0, 16);
    const rank = searchParams.get('rank') || '';
    const won = searchParams.get('won') === '1';
    const sub = (searchParams.get('sub') || '').slice(0, 40);
    
    const tier = tierFor(score);
    const titleColor = won ? '#4ADE80' : '#FCA5A5';
    const titleText = won ? 'YOU WON' : 'RUGGED';
    
    return new ImageResponse(
      {
        type: 'div',
        props: {
          style: {
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(135deg, #02000a 0%, #1a0040 50%, #0d0028 100%)',
            color: 'white', padding: '60px',
            fontFamily: 'sans-serif'
          },
          children: [
            {
              type: 'div',
              props: {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
                children: [
                  { type: 'div', props: { style: { fontSize: 24, color: '#A855F7', letterSpacing: 6, fontWeight: 700, display: 'flex' }, children: 'MONSHI ARCADE' } },
                  { type: 'div', props: { style: { fontSize: 18, color: '#4ADE80', letterSpacing: 4, fontWeight: 700, padding: '10px 22px', border: '2px solid #4ADE80', borderRadius: '10px', display: 'flex' }, children: '$MONSHI' } }
                ]
              }
            },
            { type: 'div', props: { style: { fontSize: 28, color: '#C4B5FD', letterSpacing: 6, fontWeight: 700, marginBottom: '16px', display: 'flex' }, children: game } },
            { type: 'div', props: { style: { fontSize: 110, fontWeight: 900, color: titleColor, letterSpacing: 6, lineHeight: 1, marginBottom: '24px', display: 'flex' }, children: titleText } },
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '24px' },
                children: [
                  { type: 'div', props: { style: { fontSize: 22, color: 'rgba(167,139,250,0.7)', letterSpacing: 4, display: 'flex' }, children: 'SCORE' } },
                  { type: 'div', props: { style: { fontSize: 88, fontWeight: 900, color: '#fff', letterSpacing: 2, display: 'flex' }, children: String(score).padStart(6, '0') } }
                ]
              }
            },
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
                children: [
                  { type: 'div', props: { style: { display: 'flex', padding: '10px 18px', borderRadius: '24px', background: tier.c + '22', border: '2px solid ' + tier.c, fontSize: 22, color: tier.c, fontWeight: 700, letterSpacing: 2 }, children: tier.e + ' ' + tier.n } },
                  { type: 'div', props: { style: { display: 'flex', fontSize: 26, color: '#EDE9FF', fontWeight: 700, letterSpacing: 2 }, children: name } },
                  rank ? { type: 'div', props: { style: { display: 'flex', fontSize: 20, color: '#FCD34D', fontWeight: 700, letterSpacing: 3, padding: '8px 14px', background: 'rgba(252,211,77,0.15)', borderRadius: '8px' }, children: 'RANK #' + rank } } : { type: 'div', props: { style: { display: 'flex' }, children: '' } }
                ]
              }
            },
            sub ? { type: 'div', props: { style: { fontSize: 20, color: 'rgba(196,181,253,0.6)', letterSpacing: 2, display: 'flex' }, children: sub.toUpperCase() } } : { type: 'div', props: { style: { display: 'flex' }, children: '' } },
            {
              type: 'div',
              props: {
                style: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                children: [
                  { type: 'div', props: { style: { display: 'flex', fontSize: 22, color: '#fff', letterSpacing: 4, fontWeight: 700 }, children: '🚀 CAN YOU BEAT ME?' } },
                  { type: 'div', props: { style: { display: 'flex', fontSize: 20, color: '#4ADE80', letterSpacing: 3, fontWeight: 700 }, children: 'monshi-fafo.vercel.app' } }
                ]
              }
            }
          ]
        }
      },
      { width: 1200, height: 630 }
    );
  } catch (e) {
    return new Response('OG error: ' + e.message, { status: 500 });
  }
}
