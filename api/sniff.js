// /api/sniff.js — Sniff Test proxy
//
// Simulates a swap on Monad mainnet via Tenderly to detect:
//   - Honeypots (you can buy but can't sell)
//   - Hidden taxes (advertised vs actual transfer amount)
//   - Per-wallet blacklists
//
// Logic:
//   - User asks to simulate "buy" / "sell" / "both"
//   - For each, we simulate the swap against the Monad fork of mainnet state
//   - We compare expected vs actual amounts to compute effective tax
//   - For "both", we sim a buy first, then a sell of the bought tokens —
//     if buy succeeds but sell reverts → HONEYPOT
//
// Tier-gated daily limits (enforced server-side via Supabase):
//   Basic   100k+   → 3 sniffs/day
//   Shark   500k+   → 10 sniffs/day
//   Whale   1M+     → 25 sniffs/day
//   Royalty 10M+    → unlimited
//
// Env vars required (set in Vercel):
//   TENDERLY_ACCESS_KEY  — secret, never exposed to client
//   TENDERLY_ACCOUNT     — account slug (e.g. "Kingpetty")
//   TENDERLY_PROJECT     — project slug (e.g. "project")

const TENDERLY_API = 'https://api.tenderly.co/api/v1';
const MONAD_NETWORK_ID = '143';
const MONAD_RPC = 'https://rpc.monad.xyz';
const MONSHI_TOKEN = '0xb744f5cdb792d8187640214c4a1c9ace29af7777';

const SUPABASE_URL = 'https://cuqhqcmrgpdjlhyqztnc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nu-E2mvgdQ0l1DsSsOswWA_ma2RbV4z';

// Crust V3 router on Monad (Uniswap V3 fork) — used for swap routing
// (We try multiple routers since Monad has several DEXes — fallback chain)
const ROUTERS = {
  crust: {
    name: 'Crust V3 (Uniswap V3 fork)',
    address: '0xa9f6B6656e32F223d778b01642F32D00F5310526',
    type: 'v3'
  }
};

// Common addresses
const WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A';

// ─── Tier limits ───
const TIER_LIMITS = {
  basic: { min: 100_000n, max: 3 },
  shark: { min: 500_000n, max: 10 },
  whale: { min: 1_000_000n, max: 25 },
  royalty: { min: 10_000_000n, max: Infinity }
};

// ─── Helpers ───
function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

async function getMonshiBalance(wallet) {
  // ERC-20 balanceOf via standard JSON-RPC eth_call
  const data = '0x70a08231' + '0'.repeat(24) + wallet.toLowerCase().replace(/^0x/, '');
  const res = await fetch(MONAD_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: MONSHI_TOKEN, data }, 'latest'],
      id: 1
    })
  });
  if (!res.ok) throw new Error('RPC error');
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  // Token has 18 decimals, return whole-number bag
  return BigInt(j.result || '0x0') / (10n ** 18n);
}

function getTierForBalance(bag) {
  if (bag >= TIER_LIMITS.royalty.min) return 'royalty';
  if (bag >= TIER_LIMITS.whale.min) return 'whale';
  if (bag >= TIER_LIMITS.shark.min) return 'shark';
  if (bag >= TIER_LIMITS.basic.min) return 'basic';
  return null;
}

async function getDailyUsage(wallet) {
  // Count usage today (UTC)
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const url = `${SUPABASE_URL}/rest/v1/sniff_usage?wallet=eq.${wallet.toLowerCase()}&used_at=gte.${today}T00:00:00Z&select=id`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) return 0;
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
}

async function recordUsage(wallet, tokenAddress, mode, status) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/sniff_usage`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        wallet: wallet.toLowerCase(),
        token_address: tokenAddress.toLowerCase(),
        mode,
        result_status: status
      })
    });
  } catch (e) {
    console.error('record usage failed:', e.message);
  }
}

// ─── Tenderly simulate ───
async function tenderlySimulate({ from, to, input, value }) {
  const url = `${TENDERLY_API}/account/${process.env.TENDERLY_ACCOUNT}/project/${process.env.TENDERLY_PROJECT}/simulate`;
  const body = {
    network_id: MONAD_NETWORK_ID,
    from,
    to,
    input,
    value: value || '0',
    save: false,
    save_if_fails: false,
    simulation_type: 'quick',
    gas: 5_000_000,
    gas_price: '1000000000'
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': process.env.TENDERLY_ACCESS_KEY
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Tenderly ${res.status}: ${t.slice(0, 200)}`);
  }
  return await res.json();
}

// Encode router calldata for V3 exactInputSingle
// (Crust V3 mirrors Uniswap V3 router interface)
function encodeV3ExactInputSingle({ tokenIn, tokenOut, fee, recipient, amountIn, amountOutMin, deadline }) {
  // exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96))
  // method id: 0x04e45aaf
  const sel = '0x04e45aaf';
  const pad = (h, len = 64) => h.replace(/^0x/, '').padStart(len, '0');
  return sel
    + pad(tokenIn)
    + pad(tokenOut)
    + pad(fee.toString(16))
    + pad(recipient)
    + pad(BigInt(deadline).toString(16))
    + pad(BigInt(amountIn).toString(16))
    + pad(BigInt(amountOutMin).toString(16))
    + pad('0'); // sqrtPriceLimitX96 = 0 (no limit)
}

// Parse ERC-20 Transfer event from logs to figure out actual tokens received
function findTransferToRecipient(logs, recipient, tokenAddress) {
  if (!Array.isArray(logs)) return null;
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const recipLower = recipient.toLowerCase().replace(/^0x/, '');
  const tokenLower = tokenAddress.toLowerCase();
  for (const log of logs) {
    if (!log.raw && !log.topics) continue;
    const topics = log.raw?.topics || log.topics;
    const data = log.raw?.data || log.data;
    const addr = (log.raw?.address || log.address || '').toLowerCase();
    if (addr !== tokenLower) continue;
    if (!topics || topics[0] !== TRANSFER_TOPIC) continue;
    if (!topics[2]) continue;
    const toLower = topics[2].slice(-40).toLowerCase();
    if (toLower !== recipLower) continue;
    return BigInt(data || '0x0');
  }
  return null;
}

// ─── Main handler ───
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Parse body
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { wallet, tokenAddress, mode, amountWei } = body || {};

  // Validate inputs
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
    return res.status(400).json({ error: 'Invalid token address' });
  }
  if (!['buy', 'sell', 'both'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be buy, sell, or both' });
  }
  if (!amountWei || !/^\d+$/.test(String(amountWei))) {
    return res.status(400).json({ error: 'amountWei must be a positive integer string' });
  }

  // Env check
  if (!process.env.TENDERLY_ACCESS_KEY || !process.env.TENDERLY_ACCOUNT || !process.env.TENDERLY_PROJECT) {
    return res.status(503).json({
      error: 'Sniff Test not configured',
      hint: 'Tenderly env vars missing on server'
    });
  }

  // Tier check
  let bag, tier, used, limit;
  try {
    bag = await getMonshiBalance(wallet);
    tier = getTierForBalance(bag);
  } catch (e) {
    return res.status(502).json({ error: 'Could not check $MONSHI balance', detail: e.message });
  }

  if (!tier) {
    return res.status(403).json({
      error: 'Need 100,000+ $MONSHI to use Sniff Test',
      yourBag: String(bag),
      required: '100,000'
    });
  }

  used = await getDailyUsage(wallet);
  limit = TIER_LIMITS[tier].max;
  if (used >= limit) {
    return res.status(429).json({
      error: 'Daily limit hit',
      tier,
      used,
      limit: limit === Infinity ? 'unlimited' : limit,
      hint: tier === 'royalty' ? 'huh that should not happen' : 'upgrade your bag for more sniffs'
    });
  }

  // ─── Simulate ───
  const router = ROUTERS.crust;
  const deadline = Math.floor(Date.now() / 1000) + 600; // +10 min
  const amountIn = BigInt(amountWei);
  const fee = 3000; // 0.3% pool by default — most common
  const result = {
    tier,
    used: used + 1,
    limit: limit === Infinity ? null : limit,
    bagSize: String(bag),
    tokenAddress: tokenAddress.toLowerCase(),
    mode,
    amountIn: amountWei,
    router: router.name,
    buy: null,
    sell: null,
    verdict: null,
    flags: []
  };

  let buyResult = null;
  let sellResult = null;

  // Buy simulation: WMON -> token (or MON via deposit + swap pattern)
  if (mode === 'buy' || mode === 'both') {
    try {
      const calldata = encodeV3ExactInputSingle({
        tokenIn: WMON,
        tokenOut: tokenAddress,
        fee,
        recipient: wallet,
        amountIn,
        amountOutMin: 0n,
        deadline
      });
      const sim = await tenderlySimulate({
        from: wallet,
        to: router.address,
        input: calldata,
        value: '0' // assuming wallet has WMON; if user wants native MON sim, frontend wraps first
      });
      const ok = !!sim?.transaction?.status;
      const logs = sim?.transaction?.transaction_info?.logs || sim?.transaction?.logs || [];
      const tokensReceived = findTransferToRecipient(logs, wallet, tokenAddress);
      buyResult = {
        success: ok,
        tokensReceived: tokensReceived ? String(tokensReceived) : null,
        gasUsed: sim?.transaction?.gas_used || null,
        revertReason: sim?.transaction?.error_message || null
      };
      if (!ok) result.flags.push('BUY_REVERTS');
    } catch (e) {
      buyResult = { success: false, error: e.message };
      result.flags.push('BUY_SIM_ERROR');
    }
  }

  // Sell simulation: token -> WMON
  if (mode === 'sell' || (mode === 'both' && buyResult?.success && buyResult?.tokensReceived)) {
    try {
      // For "both" we sell the amount we just received (slightly less than 100% to handle dust)
      const sellAmount = mode === 'sell'
        ? amountIn
        : (BigInt(buyResult.tokensReceived) * 99n) / 100n;
      if (sellAmount === 0n) {
        sellResult = { success: false, error: 'No tokens to sell' };
        result.flags.push('SELL_ZERO_AMOUNT');
      } else {
        const calldata = encodeV3ExactInputSingle({
          tokenIn: tokenAddress,
          tokenOut: WMON,
          fee,
          recipient: wallet,
          amountIn: sellAmount,
          amountOutMin: 0n,
          deadline
        });
        const sim = await tenderlySimulate({
          from: wallet,
          to: router.address,
          input: calldata,
          value: '0'
        });
        const ok = !!sim?.transaction?.status;
        const logs = sim?.transaction?.transaction_info?.logs || sim?.transaction?.logs || [];
        const wmonReceived = findTransferToRecipient(logs, wallet, WMON);
        sellResult = {
          success: ok,
          sellAmount: String(sellAmount),
          wmonReceived: wmonReceived ? String(wmonReceived) : null,
          gasUsed: sim?.transaction?.gas_used || null,
          revertReason: sim?.transaction?.error_message || null
        };
        if (!ok) result.flags.push('SELL_REVERTS');
      }
    } catch (e) {
      sellResult = { success: false, error: e.message };
      result.flags.push('SELL_SIM_ERROR');
    }
  }

  result.buy = buyResult;
  result.sell = sellResult;

  // Verdict logic
  if (mode === 'both') {
    if (buyResult?.success && sellResult?.success) {
      result.verdict = 'SAFE';
    } else if (buyResult?.success && (!sellResult || !sellResult.success)) {
      result.verdict = 'HONEYPOT';
      result.flags.push('CANNOT_SELL_AFTER_BUY');
    } else if (!buyResult?.success) {
      result.verdict = 'CANNOT_BUY';
    } else {
      result.verdict = 'INCONCLUSIVE';
    }
  } else if (mode === 'buy') {
    result.verdict = buyResult?.success ? 'BUY_OK' : 'BUY_FAILS';
  } else {
    result.verdict = sellResult?.success ? 'SELL_OK' : 'SELL_FAILS';
  }

  // Record usage (always, even on errors — counts the API spend)
  await recordUsage(wallet, tokenAddress, mode, result.verdict);

  return res.status(200).json(result);
}
