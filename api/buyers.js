// Top buyers — scans recent Transfer events directly from Monad RPC.
// Replaces the dead nad.fun /trade/swap proxy.
//
// How it works:
//  1. Get latest block from RPC
//  2. eth_getLogs for ERC-20 Transfer events ON the MONSHI token
//  3. Filter to "buys" — transfers FROM known DEX pair contracts
//  4. Aggregate by buyer wallet, sum amounts, sort by total
//
// Free, no API keys needed. Uses public Monad RPC.

const TOKEN = '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';
const PAIRS = [
  '0x81550C36e0c7A6fcde790d10789033848BAabBA7'.toLowerCase(), // nad.fun bonding curve
  '0x2F83F27a237782f1d99ca5546Ad449b3FB119c4d'.toLowerCase(), // Uni v2 pair
  '0x81c2087F3841522e08b1453213F6ad5AC5bC1E2b'.toLowerCase()  // Uni v2 pair
];
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const RPC_URLS = [
  'https://rpc.monad.xyz',
  'https://testnet-rpc.monad.xyz'
];

async function rpc(method, params, rpcUrl) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', method, params, id: 1})
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

function topicToAddress(topic) {
  return '0x' + topic.slice(-40).toLowerCase();
}

function hexToBigInt(h) {
  return BigInt(h || '0x0');
}

export default async function handler(req, res) {
  const window_h = parseInt(req.query.window || '24');
  const limit = parseInt(req.query.limit || '50');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  let lastError = null;
  for (const rpcUrl of RPC_URLS) {
    try {
      const latestHex = await rpc('eth_blockNumber', [], rpcUrl);
      const latest = parseInt(latestHex, 16);

      // Monad ~1s blocks; cap window at 50k blocks to avoid massive scans
      const blocksBack = Math.min(window_h * 3600, 50000);
      const fromBlock = Math.max(0, latest - blocksBack);

      const logs = await rpc('eth_getLogs', [{
        address: TOKEN,
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: 'latest',
        topics: [TRANSFER_TOPIC]
      }], rpcUrl);

      // Filter to BUYS (transfers FROM pair contracts)
      const buys = {};
      for (const log of logs) {
        const fromAddr = topicToAddress(log.topics[1]);
        const toAddr = topicToAddress(log.topics[2]);
        if (PAIRS.includes(fromAddr) && !PAIRS.includes(toAddr)) {
          const amount = hexToBigInt(log.data);
          if (!buys[toAddr]) buys[toAddr] = { wallet: toAddr, total: 0n, count: 0, lastBlock: 0 };
          buys[toAddr].total += amount;
          buys[toAddr].count += 1;
          const blockNum = parseInt(log.blockNumber, 16);
          if (blockNum > buys[toAddr].lastBlock) buys[toAddr].lastBlock = blockNum;
        }
      }

      const ranked = Object.values(buys)
        .sort((a, b) => (b.total > a.total ? 1 : -1))
        .slice(0, limit)
        .map(b => ({
          wallet: b.wallet,
          total: (Number(b.total / 10n ** 14n) / 10000).toFixed(2),
          count: b.count,
          lastBlock: b.lastBlock
        }));

      return res.status(200).json({
        buyers: ranked,
        meta: {
          token: TOKEN,
          fromBlock,
          toBlock: latest,
          windowHours: window_h,
          totalUniqueBuyers: Object.keys(buys).length,
          rpcUsed: rpcUrl
        }
      });
    } catch (e) {
      lastError = e.message || String(e);
      continue;
    }
  }

  return res.status(503).json({
    error: 'All RPCs failed',
    detail: lastError,
    fallbackMessage: 'Monad RPC unavailable. Try DexScreener directly.'
  });
}
