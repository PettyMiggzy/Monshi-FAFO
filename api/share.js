export default async function handler(req, res) {
  const { game = 'arcade', score = '0', name = 'ANON', rank = '', won = '0' } = req.query;
  const cleanName = String(name).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const cleanScore = parseInt(score) || 0;
  const cleanGame = String(game).replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 32);
  const title = `${cleanName} scored ${cleanScore.toLocaleString()} on ${cleanGame.toUpperCase()}`;
  
  const cardParams = new URLSearchParams({game:cleanGame,score:String(cleanScore),name:cleanName,rank:String(rank||''),won});
  const cardImage = `https://monshi-fafo.vercel.app/api/card?${cardParams.toString()}`;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="MONSHI ARCADE — 25 games, one token. Beat my score 👇">
<meta property="og:image" content="${cardImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://monshi-fafo.vercel.app">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:image" content="${cardImage}">
<meta name="twitter:site" content="@Monshi_Monpad">
<meta http-equiv="refresh" content="0;url=https://monshi-fafo.vercel.app">
<style>body{background:#02000a;color:#EDE9FF;font-family:sans-serif;text-align:center;padding:60px;}</style>
</head><body><h1>MONSHI ARCADE</h1><p>Redirecting...</p></body></html>`);
}
