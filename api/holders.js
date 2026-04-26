// Vercel serverless proxy for nad.fun holder API (avoids CORS)
export default async function handler(req, res) {
  const token = req.query.token || '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';
  const limit = req.query.limit || 20;
  const page = req.query.page || 1;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  
  try {
    const url = `https://api.nadapp.net/trade/holder/${token}?tableType=holder-table&page=${page}&limit=${limit}`;
    const r = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; MonshiArcade/1.0)'
      }
    });
    
    if (!r.ok) {
      return res.status(r.status).json({ error: 'upstream ' + r.status });
    }
    
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
