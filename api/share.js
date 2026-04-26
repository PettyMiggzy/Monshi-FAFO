// Share landing page with OG meta tags - Twitter scrapes this for the rich preview
export default async function handler(req, res) {
  const { game = 'arcade', score = '0', name = 'ANON', rank = '', sub = '', won = '0' } = req.query;
  
  const cleanName = String(name).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const cleanScore = parseInt(score) || 0;
  const cleanGame = String(game).replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 32);
  
  const ogParams = new URLSearchParams({
    game: cleanGame, score: cleanScore, name: cleanName,
    rank: rank || '', sub: sub || '', won: won || '0'
  });
  
  const ogImage = `https://monshi-fafo.vercel.app/api/og?${ogParams.toString()}`;
  const title = `${cleanName} scored ${cleanScore.toLocaleString()} on ${cleanGame.toUpperCase()}`;
  const desc = `MONSHI ARCADE — 24 games, one token, no exit. Beat my score 👇`;
  const gameUrl = `https://monshi-fafo.vercel.app/${cleanGame.toLowerCase().replace(/\s+/g,'')}.html`;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://monshi-fafo.vercel.app">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:site" content="@Monshi_Monpad">
<meta http-equiv="refresh" content="0;url=https://monshi-fafo.vercel.app">
<style>body{background:#02000a;color:#EDE9FF;font-family:sans-serif;text-align:center;padding:60px;}a{color:#4ADE80;}</style>
</head>
<body>
<h1>MONSHI ARCADE</h1>
<p>Redirecting...</p>
<p><a href="https://monshi-fafo.vercel.app">Click here if not redirected</a></p>
</body></html>`);
}
