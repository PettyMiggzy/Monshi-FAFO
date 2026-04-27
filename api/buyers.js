// Top buyers proxy - pulls recent buy txns from nad.fun
export default async function handler(req, res) {
  const token = req.query.token || '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';
  const window_h = parseInt(req.query.window || '24'); // hours
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  
  try {
    // Try the trade endpoint - same domain as holders
    const url = `https://api.nadapp.net/trade/swap/${token}?tableType=swap-table&page=1&limit=100`;
    const r = await fetch(url, {
      headers: {'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; MonshiArcade/1.0)'}
    });
    if(!r.ok) return res.status(r.status).json({error:'upstream '+r.status});
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
}
