import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const score = searchParams.get('score') || '0';
    const name = (searchParams.get('name') || 'ANON').toUpperCase().slice(0, 16);
    const game = (searchParams.get('game') || 'MONSHI ARCADE').toUpperCase();
    const rank = searchParams.get('rank') || '';
    const sub = searchParams.get('sub') || '';

    // Tier badge based on score
    let tierEmoji = '🦐';
    let tierName = 'SHRIMP';
    let tierColor = '#F97316';
    const sNum = parseInt(score) || 0;
    if (sNum >= 10000) { tierEmoji = '👑'; tierName = 'ROYALTY'; tierColor = '#4ADE80'; }
    else if (sNum >= 5000) { tierEmoji = '🐋'; tierName = 'WHALE'; tierColor = '#A855F7'; }
    else if (sNum >= 1000) { tierEmoji = '🐬'; tierName = 'DOLPHIN'; tierColor = '#60A5FA'; }
    else if (sNum >= 500) { tierEmoji = '🦀'; tierName = 'CRAB'; tierColor = '#FCD34D'; }

    return new ImageResponse(
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #02000a 0%, #1a0040 50%, #02000a 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            padding: '60px',
          },
          children: [
            // Top left logo
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  marginBottom: '40px',
                },
                children: [
                  {
                    type: 'img',
                    props: {
                      src: 'https://monshi-fafo.vercel.app/monshi-face.jpg',
                      width: 80,
                      height: 80,
                      style: { borderRadius: '50%', border: '3px solid #8B5CF6' },
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column' },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '32px', fontWeight: 900, color: '#EDE9FF', letterSpacing: '4px' },
                            children: 'MONSHI ARCADE',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '14px', color: '#8B5CF6', letterSpacing: '4px', marginTop: '4px' },
                            children: 'A KING PETTY BUILD',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            // Game name
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  fontSize: '36px',
                  color: '#A855F7',
                  letterSpacing: '6px',
                  fontWeight: 700,
                  marginBottom: '20px',
                },
                children: game,
              },
            },
            // Player name
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  fontSize: '52px',
                  color: '#FCD34D',
                  fontWeight: 900,
                  marginBottom: '20px',
                },
                children: name,
              },
            },
            // Score - HUGE
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '20px',
                  marginBottom: '30px',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '180px',
                        fontWeight: 900,
                        color: '#4ADE80',
                        letterSpacing: '-4px',
                        lineHeight: 1,
                      },
                      children: String(sNum).padStart(6, '0'),
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '24px',
                        color: 'rgba(167,139,250,0.7)',
                        letterSpacing: '4px',
                        fontWeight: 700,
                      },
                      children: 'SCORE',
                    },
                  },
                ],
              },
            },
            // Bottom row: tier + rank + URL
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'auto',
                  width: '100%',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 24px',
                              background: 'rgba(0,0,0,0.5)',
                              border: `2px solid ${tierColor}`,
                              borderRadius: '12px',
                              fontSize: '24px',
                              color: tierColor,
                              fontWeight: 900,
                              letterSpacing: '3px',
                            },
                            children: `${tierEmoji} ${tierName}`,
                          },
                        },
                        rank ? {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 24px',
                              background: 'rgba(74,222,128,0.15)',
                              border: '2px solid #4ADE80',
                              borderRadius: '12px',
                              fontSize: '24px',
                              color: '#4ADE80',
                              fontWeight: 900,
                              letterSpacing: '3px',
                            },
                            children: `🏆 #${rank} GLOBAL`,
                          },
                        } : null,
                      ].filter(Boolean),
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '20px', color: '#22C55E', fontWeight: 700, letterSpacing: '2px' },
                            children: '$MONSHI',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '18px', color: '#EDE9FF', marginTop: '4px' },
                            children: 'monshi-fafo.vercel.app',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '14px', color: 'rgba(167,139,250,0.6)', marginTop: '6px', letterSpacing: '2px' },
                            children: 'CAN YOU BEAT ME?',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
