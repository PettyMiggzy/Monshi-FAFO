// /api/nft-check — proxies OpenSea v2 with a server-side API key.
// Audit found NFT detection completely broken because OpenSea v2 now requires
// an API key, and putting it in client code would leak it.
//
// Two modes:
//   ?wallet=0x... → returns NFT count for that wallet in the Monshi collection
//   ?collection=1 → returns the full collection NFT list (used by leaderboard)
//
// Setup:
//   1. Sign up at opensea.io/account/developer
//   2. Add OPENSEA_API_KEY to Vercel env vars
//   3. Redeploy

const COLLECTION_SLUG = 'monshi-nft-collection-563194175';
const OPENSEA_BASE = 'https://api.opensea.io/api/v2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'OpenSea API key not configured',
      hint: 'Add OPENSEA_API_KEY to Vercel env vars. Sign up at opensea.io/account/developer.',
      fallback: { count: 0, isHolder: false, items: [] }
    });
  }

  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': apiKey
  };

  try {
    // Mode: wallet check
    const wallet = req.query.wallet;
    if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      const url = `${OPENSEA_BASE}/chain/monad/account/${wallet}/nfts?collection=${COLLECTION_SLUG}&limit=50`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        return res.status(r.status).json({
          error: 'OpenSea returned ' + r.status,
          detail: errText.slice(0, 200),
          fallback: { count: 0, isHolder: false }
        });
      }
      const data = await r.json();
      const items = Array.isArray(data.nfts) ? data.nfts : [];
      return res.status(200).json({
        wallet: wallet.toLowerCase(),
        count: items.length,
        isHolder: items.length > 0,
        firstImage: items[0]?.display_image_url || items[0]?.image_url || null,
        items: items.map(n => ({
          id: n.identifier,
          name: n.name,
          image: n.display_image_url || n.image_url
        }))
      });
    }

    // Mode: full collection list
    if (req.query.collection) {
      const limit = Math.min(parseInt(req.query.limit || '200'), 200);
      const url = `${OPENSEA_BASE}/collection/${COLLECTION_SLUG}/nfts?limit=${limit}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        return res.status(r.status).json({
          error: 'OpenSea returned ' + r.status,
          detail: errText.slice(0, 200)
        });
      }
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({
      error: 'Pass ?wallet=0x... or ?collection=1'
    });
  } catch (e) {
    return res.status(500).json({
      error: 'NFT proxy failed',
      detail: e.message || String(e),
      fallback: { count: 0, isHolder: false }
    });
  }
}
