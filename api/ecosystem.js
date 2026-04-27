// Ecosystem proxy - pulls all Monad tokens from nad.fun
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  try {
    var r = await fetch('https://api.nadapp.net/order/market_cap?limit=40&page=1', {
      headers: {'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; MonshiArcade/1.0)'}
    });
    if(!r.ok) return res.status(r.status).json({error:'upstream '+r.status});
    var data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
}
