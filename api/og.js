import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const TIERS = {
  shrimp: { emoji: '🦐', label: 'SHRIMP', color: '#F97316' },
  crab:   { emoji: '🦀', label: 'CRAB', color: '#FCD34D' },
  dolphin:{ emoji: '🐬', label: 'DOLPHIN', color: '#60A5FA' },
  whale:  { emoji: '🐋', label: 'WHALE', color: '#A855F7' },
  king:   { emoji: '👑', label: 'ROYALTY', color: '#4ADE80' }
};

function tierForScore(s) {
  if (s < 100) return TIERS.shrimp;
  if (s < 1000) return TIERS.crab;
  if (s < 5000) return TIERS.dolphin;
  if (s < 20000) return TIERS.whale;
  return TIERS.king;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const game = (searchParams.get('game') || 'MONSHI ARCADE').toUpperCase();
  const score = searchParams.get('score') || '0';
  const name = (searchParams.get('name') || 'ANON').toUpperCase().slice(0, 16);
  const rank = searchParams.get('rank') || '';
  const sub = searchParams.get('sub') || '';
  const won = searchParams.get('won') === '1';
  
  const tier = tierForScore(parseInt(score) || 0);
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
          color: 'white',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        },
        children: [
          // Header
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '40px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      { type: 'div', props: { style: { fontSize: 22, color: '#A855F7', letterSpacing: 6, fontWeight: 700 }, children: 'MONSHI ARCADE' } },
                      { type: 'div', props: { style: { fontSize: 14, color: 'rgba(167,139,250,0.6)', letterSpacing: 3, marginTop: 4 }, children: 'a KING PETTY build' } }
                    ]
                  }
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 18, color: '#4ADE80', letterSpacing: 4, fontWeight: 700, padding: '10px 20px', border: '2px solid #4ADE80', borderRadius: 10 },
                    children: '$MONSHI'
                  }
                }
              ]
            }
          },
          // Game name
          {
            type: 'div',
            props: {
              style: { fontSize: 32, color: '#C4B5FD', letterSpacing: 8, fontWeight: 700, marginBottom: 20 },
              children: game
            }
          },
          // RUGGED / YOU WON title
          {
            type: 'div',
            props: {
              style: {
                fontSize: 120, fontWeight: 900, color: titleColor,
                textShadow: `0 0 40px ${titleColor}`,
                letterSpacing: 8, lineHeight: 1, marginBottom: 30,
              },
              children: titleText
            }
          },
          // Score
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 24 },
              children: [
                { type: 'div', props: { style: { fontSize: 24, color: 'rgba(167,139,250,0.7)', letterSpacing: 4 }, children: 'SCORE' } },
                { type: 'div', props: { style: { fontSize: 96, fontWeight: 900, color: '#fff', letterSpacing: 2 }, children: String(score).padStart(6, '0') } }
              ]
            }
          },
          // Tier badge + name + rank
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 20px', borderRadius: 30,
                      background: tier.color + '22', border: `2px solid ${tier.color}`,
                      fontSize: 24, color: tier.color, fontWeight: 700, letterSpacing: 2
                    },
                    children: `${tier.emoji} ${tier.label}`
                  }
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 28, color: '#EDE9FF', fontWeight: 700, letterSpacing: 2 },
                    children: name
                  }
                },
                rank ? {
                  type: 'div',
                  props: {
                    style: { fontSize: 22, color: '#FCD34D', fontWeight: 700, letterSpacing: 3, padding: '8px 16px', background: 'rgba(252,211,77,0.15)', borderRadius: 8 },
                    children: `RANK #${rank}`
                  }
                } : null
              ].filter(Boolean)
            }
          },
          // Sub text
          sub ? {
            type: 'div',
            props: {
              style: { fontSize: 20, color: 'rgba(196,181,253,0.6)', letterSpacing: 2, marginBottom: 30 },
              children: sub.toUpperCase()
            }
          } : null,
          // CTA at bottom
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', bottom: 40, left: 60, right: 60,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 22, color: '#fff', letterSpacing: 4, fontWeight: 700 },
                    children: '🚀 CAN YOU BEAT ME?'
                  }
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 20, color: '#4ADE80', letterSpacing: 3, fontWeight: 700 },
                    children: 'monshi-fafo.vercel.app'
                  }
                }
              ]
            }
          }
        ].filter(Boolean)
      }
    },
    { width: 1200, height: 630 }
  );
}
