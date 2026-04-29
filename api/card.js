// Pure SVG share card - no dependencies, always works
export default function handler(req, res) {
  const { game = 'MONSHI ARCADE', score = '0', name = 'ANON', rank = '', won = '0' } = req.query;
  
  const cleanName = String(name).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16).toUpperCase() || 'ANON';
  const cleanScore = parseInt(score) || 0;
  const cleanGame = String(game).replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 32).toUpperCase();
  const cleanRank = parseInt(rank) || 0;
  const isWon = won === '1';
  
  // Tier colors based on score
  let tierEmoji='🦐', tierName='SHRIMP', tierColor='#F97316';
  if(cleanScore>=20000){tierEmoji='👑';tierName='ROYALTY';tierColor='#4ADE80';}
  else if(cleanScore>=5000){tierEmoji='🐋';tierName='WHALE';tierColor='#A855F7';}
  else if(cleanScore>=1000){tierEmoji='🐬';tierName='DOLPHIN';tierColor='#60A5FA';}
  else if(cleanScore>=100){tierEmoji='🦀';tierName='CRAB';tierColor='#FCD34D';}
  
  const titleColor = isWon ? '#4ADE80' : '#FCA5A5';
  const titleText = isWon ? 'YOU WON' : 'RUGGED';
  const scoreStr = String(cleanScore).padStart(6, '0');
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#02000a"/>
      <stop offset="50%" stop-color="#1a0040"/>
      <stop offset="100%" stop-color="#0d0028"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${tierColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${tierColor}" stop-opacity="0"/>
    </radialGradient>
    <filter id="textGlow">
      <feGaussianBlur stdDeviation="6"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  
  <!-- Header bar -->
  <text x="60" y="80" font-family="Arial Black,sans-serif" font-size="28" font-weight="900" fill="#A855F7" letter-spacing="6">MONSHI ARCADE</text>
  <text x="60" y="108" font-family="Arial,sans-serif" font-size="14" fill="rgba(167,139,250,0.6)" letter-spacing="3">a KING PETTY build</text>
  
  <!-- $MONSHI badge top right -->
  <rect x="1010" y="50" width="140" height="44" rx="10" fill="none" stroke="#4ADE80" stroke-width="2"/>
  <text x="1080" y="80" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#4ADE80" text-anchor="middle" letter-spacing="4">$MONSHI</text>
  
  <!-- Game name -->
  <text x="60" y="190" font-family="Arial Black,sans-serif" font-size="36" font-weight="900" fill="#C4B5FD" letter-spacing="6">${cleanGame}</text>
  
  <!-- Big WON/RUGGED -->
  <text x="60" y="320" font-family="Arial Black,sans-serif" font-size="130" font-weight="900" fill="${titleColor}" letter-spacing="8" filter="url(#textGlow)">${titleText}</text>
  
  <!-- Score -->
  <text x="60" y="400" font-family="Arial,sans-serif" font-size="22" fill="rgba(167,139,250,0.7)" letter-spacing="4">SCORE</text>
  <text x="200" y="408" font-family="Arial Black,sans-serif" font-size="84" font-weight="900" fill="#fff" letter-spacing="2">${scoreStr}</text>
  
  <!-- Tier badge -->
  <rect x="60" y="450" width="280" height="50" rx="25" fill="${tierColor}" fill-opacity="0.2" stroke="${tierColor}" stroke-width="2"/>
  <text x="200" y="484" font-family="Arial Black,sans-serif" font-size="22" font-weight="900" fill="${tierColor}" text-anchor="middle" letter-spacing="3">${tierEmoji} ${tierName}</text>
  
  <!-- Player name -->
  <text x="370" y="484" font-family="Arial Black,sans-serif" font-size="26" font-weight="900" fill="#EDE9FF" letter-spacing="3">${cleanName}</text>
  
  ${cleanRank > 0 ? `
  <!-- Rank pill -->
  <rect x="60" y="520" width="240" height="46" rx="8" fill="rgba(252,211,77,0.15)" stroke="#FCD34D" stroke-width="1.5"/>
  <text x="180" y="551" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#FCD34D" text-anchor="middle" letter-spacing="3">RANK #${cleanRank} GLOBAL</text>
  ` : ''}
  
  <!-- Footer CTA -->
  <text x="60" y="600" font-family="Arial Black,sans-serif" font-size="22" font-weight="900" fill="#fff" letter-spacing="4">🚀 CAN YOU BEAT ME?</text>
  <text x="1140" y="600" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#4ADE80" text-anchor="end" letter-spacing="3">monshi-fafo.vercel.app</text>
</svg>`;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.status(200).send(svg);
}
