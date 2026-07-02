// /api/dex — live $MONSHI market data from DexScreener, shaped for the city chart board.
const TOKEN = '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  try {
    const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + TOKEN, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'MonshiCity/1.0' }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'upstream ' + r.status });
    const data = await r.json();
    const pairs = Array.isArray(data.pairs) ? data.pairs.slice() : [];
    pairs.sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
    const p = pairs[0];
    if (!p) return res.status(200).json({});
    return res.status(200).json({
      price: p.priceUsd || '0',
      change24: (p.priceChange && p.priceChange.h24) || 0,
      vol24: (p.volume && p.volume.h24) || 0,
      liq: (p.liquidity && p.liquidity.usd) || 0,
      mcap: p.marketCap || p.fdv || 0,
      url: p.url || ('https://dexscreener.com/monad/' + TOKEN)
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
