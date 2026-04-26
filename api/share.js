// Returns HTML page with dynamic OG tags so Twitter cards render
export default async function handler(req, res) {
  const { game = 'MONSHI', score = '0', name = 'ANON', rank = '', goto = '' } = req.query;
  
  const cardUrl = `https://monshi-fafo.vercel.app/api/card?game=${encodeURIComponent(game)}&score=${encodeURIComponent(score)}&name=${encodeURIComponent(name)}&rank=${encodeURIComponent(rank)}`;
  const redirectTo = goto || 'https://monshi-fafo.vercel.app/';
  const title = `${name} scored ${score} on ${game}`;
  const description = `Can you beat me on the Monshi Arcade? Play 24+ games on Monad. $MONSHI`;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${cardUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://monshi-fafo.vercel.app">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${cardUrl}">
<meta name="twitter:site" content="@Monshi_Monpad">
<meta http-equiv="refresh" content="0; url=${redirectTo}">
<style>body{background:#02000a;color:#fff;font-family:monospace;text-align:center;padding:50px;}</style>
</head>
<body>
<p>Redirecting to <a href="${redirectTo}" style="color:#4ADE80">Monshi Arcade</a>...</p>
</body>
</html>`);
}
