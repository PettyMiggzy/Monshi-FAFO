// /api/boss-img?u=<encoded nadapp image url> — same-origin proxy so token
// PFPs can be used as WebGL textures without CORS tainting.
export default async function handler(req, res) {
  const u = req.query.u || '';
  if (!/^https:\/\/storage\.nadapp\.net\//.test(u)) {
    return res.status(400).json({ error: 'only nadapp storage urls allowed' });
  }
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MonshiArcade/1.0)' } });
    if (!r.ok) return res.status(r.status).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
