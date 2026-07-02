// /api/bosses — top market-cap tokens on nad.fun, shaped for the WEN MOON game.
// Returns 5 boss cards (symbol, name, image) pulled live, cached at the edge.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  const limit = Math.min(parseInt(req.query.limit) || 6, 20);
  try {
    const r = await fetch('https://api.nadapp.net/order/market_cap?limit=' + (limit + 4) + '&page=1', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; MonshiArcade/1.0)' }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'upstream ' + r.status });
    const data = await r.json();
    const toks = Array.isArray(data.tokens) ? data.tokens : [];
    const bosses = toks
      .map(t => t.token_info || {})
      .filter(ti => ti.image_uri && ti.symbol && !ti.is_nsfw)
      .slice(0, limit)
      .map(ti => ({
        symbol: String(ti.symbol).slice(0, 12),
        name: String(ti.name || ti.symbol).slice(0, 24),
        image: ti.image_uri,
        token: ti.token_id || ''
      }));
    return res.status(200).json({ bosses });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
