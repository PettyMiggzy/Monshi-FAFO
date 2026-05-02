/*!
 * Monshi Embed Pack
 * https://monshi.xyz/embed
 *
 * Drop-in widgets for any Monad token. Paste one <script> tag, get live data.
 *   <script src="https://monshi.xyz/embed.js"
 *           data-token="0x..."
 *           data-widget="price|ticker|buy|burn"
 *           data-style="dark|light"
 *           data-license="0xtx_hash..."></script>
 *
 * Browser-side. Hits public APIs (DexScreener, Monad RPC) directly.
 * No backend. No API keys. No tracking.
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────────────
  var TREASURY = '0xb9d4b73be18914c6d64bee65a806648370be467f';
  var MONSHI_CA = '0xb744f5cdb792d8187640214c4a1c9ace29af7777';
  var WMON = '0x3bd359c1119da7da1d913d1c4d2b7c461115433a';
  var DEAD = '0x000000000000000000000000000000000000dead';
  var ZERO = '0x0000000000000000000000000000000000000000';
  var LICENSE_PAID_MIN = 500000n * 1000000000000000000n;   // 500K MONSHI
  var LICENSE_PRO_MIN  = 5000000n * 1000000000000000000n;  // 5M MONSHI

  var SWAP_V3_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
  var TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  var RPC_POOL = ['https://rpc.ankr.com/monad', 'https://rpc.monad.xyz', 'https://monad-mainnet.drpc.org'];
  var rpcIdx = 0;

  // ─── RPC with failover ───────────────────────────────────────────────
  function rpc(method, params) {
    return new Promise(function (resolve, reject) {
      var attempt = 0;
      function next() {
        if (attempt >= RPC_POOL.length) { reject(new Error('rpc')); return; }
        var url = RPC_POOL[(rpcIdx + attempt) % RPC_POOL.length];
        attempt++;
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 6000);
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params || [] }),
          signal: ctrl.signal
        }).then(function (r) { clearTimeout(to); if (!r.ok) throw 0; return r.json(); })
          .then(function (j) { if (j.error) throw 0; rpcIdx = (rpcIdx + attempt - 1) % RPC_POOL.length; resolve(j.result); })
          .catch(function () { clearTimeout(to); next(); });
      }
      next();
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────
  function pad(a) { return '0x' + String(a).toLowerCase().replace('0x', '').padStart(64, '0'); }
  function decodeInt256(hex) { var bn = BigInt(hex); return bn >= (1n << 255n) ? bn - (1n << 256n) : bn; }

  function fmtPrice(n) {
    if (!n || isNaN(n)) return '$—';
    if (n >= 1) return '$' + n.toFixed(2);
    if (n >= 0.01) return '$' + n.toFixed(4);
    if (n >= 0.0001) return '$' + n.toFixed(6);
    var s = n.toFixed(20).split('.')[1] || ''; var z = 0;
    for (var i = 0; i < s.length; i++) { if (s[i] === '0') z++; else break; }
    var sig = s.slice(z, z + 4).replace(/0+$/, '') || '0';
    var sub = String(z).split('').map(function (d) { return '₀₁₂₃₄₅₆₇₈₉'[+d]; }).join('');
    return '$0.0' + sub + sig;
  }
  function fmtUsd(n) {
    if (!n || isNaN(n)) return '$—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
  }
  function fmtNum(n) {
    if (!n || isNaN(n)) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  }
  function timeAgo(s) {
    var d = Math.floor((Date.now() / 1000) - s);
    if (d < 60) return d + 's ago';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }
  function shortAddr(a) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : ''; }

  // ─── License verification (cached in localStorage with integrity hash) ──
  // Lightweight tamper resistance. Determined dev with browser tools can still bypass.
  // Real protection requires server-side validation.
  function _h(s) {
    // tiny non-crypto hash for cache integrity (cyrb53-ish)
    var h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
    for (var i = 0, ch; i < s.length; i++) {
      ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function _k(license) { return 'm_' + _h('lic:' + license.toLowerCase() + ':' + TREASURY); }
  function _seal(obj) { obj._s = _h(JSON.stringify({ t: obj.tier, k: TREASURY })); return obj; }
  function _unseal(obj) {
    if (!obj || obj._s !== _h(JSON.stringify({ t: obj.tier, k: TREASURY }))) return null;
    return { tier: obj.tier };
  }

  function verifyLicense(license) {
    return new Promise(function (resolve) {
      if (!license || !/^0x[a-fA-F0-9]{64}$/.test(license)) {
        resolve({ tier: 'free' }); return;
      }
      var cacheKey = _k(license);
      try {
        var cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        var unsealed = _unseal(cached);
        if (unsealed) { resolve(unsealed); return; }
      } catch (e) {}

      Promise.all([
        rpc('eth_getTransactionByHash', [license]),
        rpc('eth_getTransactionReceipt', [license])
      ]).then(function (r) {
        var tx = r[0], receipt = r[1];
        if (!tx || !receipt || receipt.status !== '0x1') throw 0;
        if (!tx.to || tx.to.toLowerCase() !== MONSHI_CA) throw 0;
        if (!tx.input || !tx.input.toLowerCase().startsWith('0xa9059cbb')) throw 0; // transfer(address,uint256)
        var recipient = '0x' + tx.input.slice(34, 74);
        var amount = BigInt('0x' + tx.input.slice(74, 138));
        if (recipient.toLowerCase() !== TREASURY) throw 0;
        var tier = amount >= LICENSE_PRO_MIN ? 'pro' : amount >= LICENSE_PAID_MIN ? 'paid' : 'free';
        var result = _seal({ tier: tier });
        try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) {}
        resolve({ tier: tier });
      }).catch(function () { resolve({ tier: 'free' }); });
    });
  }

  // ─── DexScreener data (cached for 30s) ──────────────────────────────
  var dexCache = {};
  function fetchDex(token) {
    var key = token.toLowerCase();
    if (dexCache[key] && Date.now() - dexCache[key].at < 30000) return Promise.resolve(dexCache[key].data);
    return fetch('https://api.dexscreener.com/latest/dex/tokens/' + key)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.pairs || !d.pairs.length) return null;
        var top = d.pairs.sort(function (a, b) { return (b.liquidity && b.liquidity.usd || 0) - (a.liquidity && a.liquidity.usd || 0); })[0];
        dexCache[key] = { data: top, at: Date.now() };
        return top;
      }).catch(function () { return null; });
  }

  // ─── Inject CSS once ────────────────────────────────────────────────
  var STYLES_INJECTED = false;
  function injectStyles() {
    if (STYLES_INJECTED) return;
    STYLES_INJECTED = true;
    var css = '\
.monshi-w{box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;border-radius:14px;overflow:hidden;position:relative;line-height:1.4;}\
.monshi-w *{box-sizing:border-box;}\
.monshi-w.monshi-dark{background:linear-gradient(180deg,#1a0735,#0a0418);color:#ede9ff;border:1px solid rgba(168,85,247,.25);box-shadow:0 0 24px rgba(168,85,247,.08);}\
.monshi-w.monshi-light{background:#fafafa;color:#1a0735;border:1px solid #e5e7eb;}\
.monshi-foot{display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-top:1px solid rgba(168,85,247,.12);font-weight:700;}\
.monshi-w.monshi-dark .monshi-foot{color:rgba(196,181,253,.55);background:rgba(0,0,0,.25);}\
.monshi-w.monshi-light .monshi-foot{color:rgba(0,0,0,.45);background:rgba(0,0,0,.03);}\
.monshi-foot:hover{color:#a855f7 !important;}\
.monshi-loading{padding:24px;text-align:center;font-size:11px;letter-spacing:1.5px;opacity:.5;}\
\
/* PRICE widget */\
.mw-price{padding:18px 20px;}\
.mw-price-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}\
.mw-price-logo{width:32px;height:32px;border-radius:50%;flex-shrink:0;}\
.mw-price-logo-fb{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0;}\
.mw-price-name{font-weight:800;font-size:13px;letter-spacing:1px;}\
.mw-price-sym{opacity:.5;font-size:11px;letter-spacing:1px;}\
.mw-price-big{font-size:28px;font-weight:900;letter-spacing:-.5px;line-height:1;}\
.mw-price-row{display:flex;align-items:baseline;gap:10px;margin-bottom:14px;flex-wrap:wrap;}\
.mw-chg{font-weight:700;font-size:12px;padding:3px 8px;border-radius:5px;}\
.mw-chg.up{background:rgba(74,222,128,.18);color:#4ade80;}\
.mw-chg.dn{background:rgba(239,68,68,.18);color:#ef4444;}\
.mw-spark{width:100%;height:34px;}\
.mw-spark path{fill:none;stroke-width:2;}\
.mw-spark path.up{stroke:#4ade80;}\
.mw-spark path.dn{stroke:#ef4444;}\
.mw-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;font-size:10px;}\
.mw-stat-l{opacity:.5;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;}\
.mw-stat-v{font-weight:700;font-size:12px;margin-top:2px;}\
\
/* TICKER widget */\
.mw-ticker{padding:0;}\
.mw-ticker-head{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(168,85,247,.12);font-size:11px;letter-spacing:1.5px;font-weight:700;}\
.mw-live-dot{width:6px;height:6px;background:#4ade80;border-radius:50%;animation:mwPulse 1.5s infinite;box-shadow:0 0 6px #4ade80;}\
@keyframes mwPulse{0%,100%{opacity:1;}50%{opacity:.3;}}\
.mw-ticker-list{max-height:300px;overflow-y:auto;}\
.mw-ticker-list::-webkit-scrollbar{width:6px;}\
.mw-ticker-list::-webkit-scrollbar-thumb{background:rgba(168,85,247,.3);border-radius:3px;}\
.mw-ticker-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(168,85,247,.06);font-size:11px;}\
.mw-ticker-row:last-child{border:none;}\
.mw-ticker-emoji{font-size:14px;flex-shrink:0;}\
.mw-ticker-mid{flex:1;min-width:0;}\
.mw-ticker-buyer{font-weight:700;font-size:11px;}\
.mw-ticker-amt{opacity:.65;font-size:10px;margin-top:1px;}\
.mw-ticker-usd{font-weight:800;font-size:12px;}\
.mw-ticker-usd.buy{color:#4ade80;}\
.mw-ticker-usd.sell{color:#ef4444;}\
.mw-ticker-time{opacity:.4;font-size:9px;letter-spacing:.5px;margin-top:1px;text-align:right;}\
\
/* BUY widget */\
.mw-buy{padding:16px;}\
.mw-buy-row{display:flex;align-items:center;gap:12px;margin-bottom:12px;}\
.mw-buy-name{font-weight:800;font-size:14px;letter-spacing:1px;}\
.mw-buy-price{opacity:.6;font-size:11px;margin-top:2px;}\
.mw-buy-btn{display:block;width:100%;padding:14px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff !important;text-align:center;text-decoration:none;font-weight:900;letter-spacing:2px;font-size:13px;border-radius:10px;animation:mwBuyP 2.5s infinite;text-transform:uppercase;}\
.mw-buy-btn:hover{transform:translateY(-1px);}\
@keyframes mwBuyP{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5);}50%{box-shadow:0 0 0 10px rgba(34,197,94,0);}}\
\
/* BURN widget */\
.mw-burn{padding:18px 20px;}\
.mw-burn-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;opacity:.7;}\
.mw-burn-flame{font-size:18px;animation:mwFlame 1s infinite alternate;}\
@keyframes mwFlame{from{transform:scale(1);}to{transform:scale(1.15);}}\
.mw-burn-big{font-size:24px;font-weight:900;letter-spacing:-.3px;line-height:1;margin-bottom:4px;}\
.mw-burn-pct{font-size:11px;opacity:.65;margin-bottom:12px;}\
.mw-burn-bar{height:6px;border-radius:3px;background:rgba(168,85,247,.15);overflow:hidden;margin-bottom:10px;}\
.mw-burn-fill{height:100%;background:linear-gradient(90deg,#f97316,#fcd34d,#f97316);background-size:200% 100%;animation:mwBurnGrad 3s linear infinite;border-radius:3px;}\
@keyframes mwBurnGrad{0%{background-position:0% 0%;}100%{background-position:200% 0%;}}\
.mw-burn-foot{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1px;font-weight:700;opacity:.6;}\
\
/* HOLDERS widget */\
.mw-holders{padding:18px 20px;}\
.mw-h-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;opacity:.7;}\
.mw-h-emoji{font-size:18px;}\
.mw-h-big{font-size:30px;font-weight:900;letter-spacing:-.3px;line-height:1;margin-bottom:4px;color:var(--monshi-accent,#a855f7);}\
.mw-h-lbl{font-size:10px;letter-spacing:1.5px;opacity:.65;font-weight:700;text-transform:uppercase;margin-bottom:12px;}\
.mw-h-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;}\
.mw-h-cell{padding:8px 10px;background:rgba(168,85,247,.06);border-radius:6px;}\
.mw-h-cell-l{font-size:9px;letter-spacing:1.2px;opacity:.6;font-weight:700;text-transform:uppercase;}\
.mw-h-cell-v{font-weight:800;font-size:13px;margin-top:2px;}\
\
/* COMPARE widget (Pro) */\
.mw-compare{padding:14px 16px;}\
.mw-c-head{font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;opacity:.7;margin-bottom:10px;}\
.mw-c-row{display:grid;grid-template-columns:24px 1fr 90px 70px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(168,85,247,.08);font-size:12px;}\
.mw-c-row:last-child{border:none;}\
.mw-c-rank{font-weight:900;opacity:.5;font-size:11px;}\
.mw-c-rank.g{color:#fcd34d;opacity:1;}\
.mw-c-rank.s{color:#cbd5e1;opacity:1;}\
.mw-c-rank.b{color:#cd7f32;opacity:1;}\
.mw-c-sym{font-weight:800;}\
.mw-c-name{font-size:9px;opacity:.55;letter-spacing:.5px;margin-top:1px;}\
.mw-c-price{font-weight:700;text-align:right;}\
.mw-c-chg{font-weight:800;text-align:right;font-size:11px;padding:2px 6px;border-radius:4px;}\
.mw-c-chg.up{background:rgba(74,222,128,.15);color:#4ade80;}\
.mw-c-chg.dn{background:rgba(239,68,68,.15);color:#ef4444;}\
\
/* BADGE widget — flexable tier badge for personal sites/bios */\
.mw-badge{padding:14px 18px;display:flex;align-items:center;gap:14px;}\
.mw-bg-emoji{font-size:36px;line-height:1;flex-shrink:0;}\
.mw-bg-mid{flex:1;min-width:0;}\
.mw-bg-tier{font-size:14px;font-weight:900;letter-spacing:1.5px;line-height:1.1;}\
.mw-bg-tier.shrimp{color:#f97316;}\
.mw-bg-tier.crab{color:#fcd34d;}\
.mw-bg-tier.dolphin{color:#60a5fa;}\
.mw-bg-tier.whale{color:#a855f7;}\
.mw-bg-tier.royalty{color:#4ade80;text-shadow:0 0 12px rgba(74,222,128,.4);}\
.mw-bg-bal{font-size:11px;font-weight:700;opacity:.65;margin-top:3px;letter-spacing:.5px;}\
.mw-bg-addr{font-size:9px;opacity:.45;margin-top:2px;letter-spacing:1px;}\
.mw-bg-link{flex-shrink:0;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;font-size:14px;font-weight:900;}\
.mw-bg-link:hover{transform:scale(1.05);}\
';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ─── Watermark footer ────────────────────────────────────────────────
  function makeFooter(license) {
    if (license.tier === 'paid' || license.tier === 'pro') return '';
    return '<a class="monshi-foot" href="https://monshi.xyz/embed?ref=widget" target="_blank" rel="noopener">🐱 powered by monshi</a>';
  }

  // ─── Widget: PRICE ───────────────────────────────────────────────────
  function renderPrice(host, token, license) {
    host.innerHTML = '<div class="mw-price"><div class="monshi-loading">Loading…</div></div>' + makeFooter(license);
    var sparkPts = [];

    function refresh() {
      fetchDex(token).then(function (top) {
        if (!top) { host.querySelector('.mw-price').innerHTML = '<div class="monshi-loading">No pair found</div>'; return; }
        var price = parseFloat(top.priceUsd || 0);
        var chg = parseFloat(top.priceChange && top.priceChange.h24 || 0);
        var name = top.baseToken && top.baseToken.name || 'Token';
        var sym = top.baseToken && top.baseToken.symbol || '';
        var logo = (top.info && top.info.imageUrl) || '';
        sparkPts.push(price); if (sparkPts.length > 30) sparkPts.shift();
        // If only 1 point, seed visual sparkline from change %
        var pts = sparkPts.length > 1 ? sparkPts : (function () {
          var arr = []; var base = price * (1 - chg / 100);
          for (var i = 0; i < 20; i++) arr.push(base + (price - base) * (i / 19) * (1 + (Math.random() - 0.5) * 0.1));
          return arr;
        }());
        var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), range = max - min || 1;
        var d = 'M 0 ' + (30 - ((pts[0] - min) / range) * 28 - 1);
        for (var i = 1; i < pts.length; i++) {
          var x = (i / (pts.length - 1)) * 200, y = 30 - ((pts[i] - min) / range) * 28 - 1;
          d += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        var logoHtml = logo
          ? '<img class="mw-price-logo" src="' + logo + '" alt="" onerror="this.outerHTML=\'<div class=&quot;mw-price-logo-fb&quot;>' + (sym[0] || '?') + '</div>\'">'
          : '<div class="mw-price-logo-fb">' + (sym[0] || '?') + '</div>';
        host.querySelector('.mw-price').innerHTML =
          '<div class="mw-price-head">' + logoHtml + '<div><div class="mw-price-name">' + name + '</div><div class="mw-price-sym">$' + sym + '</div></div></div>' +
          '<div class="mw-price-row"><span class="mw-price-big">' + fmtPrice(price) + '</span><span class="mw-chg ' + (chg >= 0 ? 'up' : 'dn') + '">' + (chg >= 0 ? '▲ +' : '▼ ') + chg.toFixed(2) + '%</span></div>' +
          '<svg class="mw-spark" viewBox="0 0 200 30" preserveAspectRatio="none"><path class="' + (chg >= 0 ? 'up' : 'dn') + '" d="' + d + '"/></svg>' +
          '<div class="mw-stats">' +
          '<div><div class="mw-stat-l">MCap</div><div class="mw-stat-v">' + fmtUsd(top.marketCap || top.fdv) + '</div></div>' +
          '<div><div class="mw-stat-l">24h Vol</div><div class="mw-stat-v">' + fmtUsd(top.volume && top.volume.h24) + '</div></div>' +
          '<div><div class="mw-stat-l">Liq</div><div class="mw-stat-v">' + fmtUsd(top.liquidity && top.liquidity.usd) + '</div></div>' +
          '</div>';
      });
    }
    refresh();
    setInterval(refresh, 30000);
  }

  // ─── Widget: TICKER (live buys + sells via Swap event polling) ──────
  function renderTicker(host, token, license) {
    host.innerHTML = '<div class="mw-ticker"><div class="mw-ticker-head"><span class="mw-live-dot"></span><span>LIVE TRADES</span></div><div class="mw-ticker-list"><div class="monshi-loading">Loading…</div></div></div>' + makeFooter(license);

    var poolAddr = null;
    var isToken0 = false;
    var lastBlock = 0;
    var trades = [];
    var tokenDecimals = 18;

    fetchDex(token).then(function (top) {
      if (!top) { host.querySelector('.mw-ticker-list').innerHTML = '<div class="monshi-loading">No pair found</div>'; return; }
      poolAddr = top.pairAddress.toLowerCase();
      // Determine token ordering
      rpc('eth_call', [{ to: poolAddr, data: '0x0dfe1681' }, 'latest']).then(function (t0Hex) {
        if (t0Hex) {
          var token0 = '0x' + t0Hex.slice(26);
          isToken0 = token0.toLowerCase() === token.toLowerCase();
        } else {
          isToken0 = token.toLowerCase() < (top.quoteToken && top.quoteToken.address || '').toLowerCase();
        }
        return rpc('eth_blockNumber', []);
      }).then(function (blk) {
        lastBlock = parseInt(blk, 16) - 90; // backfill ~90 blocks
        pollSwaps();
        setInterval(pollSwaps, 15000);
      }).catch(function () {
        host.querySelector('.mw-ticker-list').innerHTML = '<div class="monshi-loading">RPC unavailable</div>';
      });
    });

    function pollSwaps() {
      rpc('eth_blockNumber', []).then(function (blk) {
        var cur = parseInt(blk, 16);
        if (cur <= lastBlock) return;
        var fromB = lastBlock + 1, toB = Math.min(cur, fromB + 90);
        return rpc('eth_getLogs', [{
          fromBlock: '0x' + fromB.toString(16),
          toBlock: '0x' + toB.toString(16),
          address: poolAddr,
          topics: [SWAP_V3_TOPIC]
        }]).then(function (logs) {
          lastBlock = toB;
          if (!logs || !logs.length) return;
          // Need block timestamps — fetch in batch
          var blockTimes = {};
          var uniqueBlocks = {};
          logs.forEach(function (l) { uniqueBlocks[l.blockNumber] = true; });
          var blockPromises = Object.keys(uniqueBlocks).map(function (bh) {
            return rpc('eth_getBlockByNumber', [bh, false]).then(function (b) {
              if (b) blockTimes[bh] = parseInt(b.timestamp, 16);
            }).catch(function () {});
          });
          return Promise.all(blockPromises).then(function () {
            return fetchDex(token).then(function (top) {
              var price = top ? parseFloat(top.priceUsd || 0) : 0;
              logs.forEach(function (log) {
                // V3 Swap data: amount0(int256), amount1(int256), sqrtPriceX96, liquidity, tick
                var raw = log.data.replace('0x', '');
                var amount0 = decodeInt256('0x' + raw.slice(0, 64));
                var amount1 = decodeInt256('0x' + raw.slice(64, 128));
                // Pool's perspective: positive = pool received, negative = pool sent
                // For our token: tokenDelta > 0 = SELL (someone gave token to pool)
                //                tokenDelta < 0 = BUY  (pool gave token to someone)
                var tokenDelta = isToken0 ? amount0 : amount1;
                if (tokenDelta === 0n) return;
                var isBuy = tokenDelta < 0n;
                var tokens = Number(isBuy ? -tokenDelta : tokenDelta) / Math.pow(10, tokenDecimals);
                var trader = '0x' + log.topics[2].slice(26); // recipient = trader
                trades.unshift({
                  trader: trader,
                  amt: tokens,
                  usd: tokens * price,
                  ts: blockTimes[log.blockNumber] || Math.floor(Date.now() / 1000),
                  tx: log.transactionHash,
                  isBuy: isBuy
                });
              });
              if (trades.length > 30) trades = trades.slice(0, 30);
              renderList();
            });
          });
        });
      }).catch(function () {});
    }

    function renderList() {
      var list = host.querySelector('.mw-ticker-list');
      if (!trades.length) { list.innerHTML = '<div class="monshi-loading">No recent trades</div>'; return; }
      list.innerHTML = trades.map(function (t) {
        return '<a class="mw-ticker-row" href="https://explorer.monad.xyz/tx/' + t.tx + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">' +
          '<span class="mw-ticker-emoji">' + (t.isBuy ? '🟢' : '🔴') + '</span>' +
          '<div class="mw-ticker-mid">' +
          '<div class="mw-ticker-buyer">' + shortAddr(t.trader) + ' ' + (t.isBuy ? 'bought' : 'sold') + '</div>' +
          '<div class="mw-ticker-amt">' + fmtNum(t.amt) + ' tokens</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
          '<div class="mw-ticker-usd ' + (t.isBuy ? 'buy' : 'sell') + '">' + fmtUsd(t.usd) + '</div>' +
          '<div class="mw-ticker-time">' + timeAgo(t.ts) + '</div>' +
          '</div>' +
          '</a>';
      }).join('');
    }
  }

  // ─── Widget: BUY ─────────────────────────────────────────────────────
  function renderBuy(host, token, license) {
    host.innerHTML = '<div class="mw-buy"><div class="monshi-loading">Loading…</div></div>' + makeFooter(license);
    fetchDex(token).then(function (top) {
      var name = top && top.baseToken && top.baseToken.name || 'Token';
      var sym = top && top.baseToken && top.baseToken.symbol || '';
      var logo = (top && top.info && top.info.imageUrl) || '';
      var price = top ? fmtPrice(parseFloat(top.priceUsd || 0)) : '$—';
      var logoHtml = logo
        ? '<img class="mw-price-logo" src="' + logo + '" alt="" onerror="this.outerHTML=\'<div class=&quot;mw-price-logo-fb&quot;>' + (sym[0] || '?') + '</div>\'">'
        : '<div class="mw-price-logo-fb">' + (sym[0] || '?') + '</div>';
      host.querySelector('.mw-buy').innerHTML =
        '<div class="mw-buy-row">' + logoHtml +
        '<div><div class="mw-buy-name">' + name + ' ($' + sym + ')</div><div class="mw-buy-price">' + price + '</div></div></div>' +
        '<a class="mw-buy-btn" href="https://nad.fun/tokens/' + token + '" target="_blank" rel="noopener">🚀 BUY $' + sym + '</a>';
    });
  }

  // ─── Widget: BURN ────────────────────────────────────────────────────
  function renderBurn(host, token, license) {
    host.innerHTML = '<div class="mw-burn"><div class="monshi-loading">Loading…</div></div>' + makeFooter(license);

    function refresh() {
      Promise.all([
        rpc('eth_call', [{ to: token, data: '0x18160ddd' }, 'latest']),                      // totalSupply
        rpc('eth_call', [{ to: token, data: '0x70a08231' + pad(DEAD).slice(2) }, 'latest']), // balanceOf(dead)
        rpc('eth_call', [{ to: token, data: '0x70a08231' + pad(ZERO).slice(2) }, 'latest']), // balanceOf(zero)
        fetchDex(token)
      ]).then(function (r) {
        if (!r[0]) throw 0;
        var totalSupply = Number(BigInt(r[0])) / 1e18;
        var deadBal = r[1] ? Number(BigInt(r[1])) / 1e18 : 0;
        var zeroBal = r[2] ? Number(BigInt(r[2])) / 1e18 : 0;
        // Need original supply — assume max(totalSupply at start) by checking dex first
        // Use circulating + dead/zero as effective burn proxy if we can't know original
        var top = r[3];
        var origSupply = totalSupply + deadBal + zeroBal; // best-effort
        // Try DexScreener's reported supply if higher
        if (top && top.fdv && top.priceUsd) {
          var implied = parseFloat(top.fdv) / parseFloat(top.priceUsd);
          if (implied > origSupply) origSupply = implied;
        }
        var burned = origSupply - totalSupply + deadBal + zeroBal;
        if (burned < 0) burned = deadBal + zeroBal;
        var pct = origSupply > 0 ? (burned / origSupply) * 100 : 0;
        host.querySelector('.mw-burn').innerHTML =
          '<div class="mw-burn-head"><span class="mw-burn-flame">🔥</span><span>BURNED FOREVER</span></div>' +
          '<div class="mw-burn-big">' + fmtNum(burned) + '</div>' +
          '<div class="mw-burn-pct">' + pct.toFixed(3) + '% of supply gone</div>' +
          '<div class="mw-burn-bar"><div class="mw-burn-fill" style="width:' + Math.min(pct, 100).toFixed(2) + '%"></div></div>' +
          '<div class="mw-burn-foot"><span>circulating</span><span>' + fmtNum(totalSupply - deadBal - zeroBal) + '</span></div>';
      }).catch(function () {
        host.querySelector('.mw-burn').innerHTML = '<div class="monshi-loading">RPC unavailable</div>';
      });
    }
    refresh();
    setInterval(refresh, 60000);
  }

  // ─── Widget: HOLDERS ────────────────────────────────────────────────
  function renderHolders(host, token, license) {
    host.innerHTML = '<div class="mw-holders"><div class="monshi-loading">Loading…</div></div>' + makeFooter(license);

    function tryFetchHolders() {
      // Try Blockscout-style v2 API (most likely format for Monad explorer)
      return fetch('https://explorer.monad.xyz/api/v2/tokens/' + token)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && (d.holders || d.holders_count)) {
            return parseInt(d.holders || d.holders_count, 10);
          }
          // Try Blockscout v1 (etherscan-style)
          return fetch('https://explorer.monad.xyz/api?module=token&action=getToken&contractaddress=' + token)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d2) {
              if (d2 && d2.result && d2.result.holders) return parseInt(d2.result.holders, 10);
              return null;
            });
        })
        .catch(function () { return null; });
    }

    function refresh() {
      Promise.all([tryFetchHolders(), fetchDex(token)]).then(function (r) {
        var holders = r[0];
        var top = r[1];
        var c = host.querySelector('.mw-holders');
        var sym = (top && top.baseToken && top.baseToken.symbol) || 'TOKEN';
        var change = (top && top.priceChange && top.priceChange.h24) || 0;

        if (holders === null || holders === 0) {
          c.innerHTML =
            '<div class="mw-h-head"><span class="mw-h-emoji">👥</span><span>$' + sym + ' Holders</span></div>' +
            '<div class="mw-h-big">—</div>' +
            '<div class="mw-h-lbl">data not yet indexed</div>';
          return;
        }

        // Aggregate stats from DexScreener if available
        var txns24 = top && top.txns && top.txns.h24 || {};
        var totalTx = (txns24.buys || 0) + (txns24.sells || 0);

        c.innerHTML =
          '<div class="mw-h-head"><span class="mw-h-emoji">👥</span><span>$' + sym + ' Holders</span></div>' +
          '<div class="mw-h-big">' + fmtNum(holders) + '</div>' +
          '<div class="mw-h-lbl">unique wallets holding</div>' +
          '<div class="mw-h-grid">' +
          '<div class="mw-h-cell"><div class="mw-h-cell-l">24h Tx</div><div class="mw-h-cell-v">' + fmtNum(totalTx) + '</div></div>' +
          '<div class="mw-h-cell"><div class="mw-h-cell-l">24h Δ</div><div class="mw-h-cell-v" style="color:' + (change >= 0 ? '#4ade80' : '#ef4444') + '">' + (change >= 0 ? '+' : '') + change.toFixed(2) + '%</div></div>' +
          '</div>';
      });
    }
    refresh();
    setInterval(refresh, 120000); // refresh every 2 min
  }

  // ─── Widget: COMPARE (Pro tier — multi-token ranking) ───────────────
  function renderCompare(host, tokens, license) {
    if (license.tier !== 'pro') {
      host.innerHTML =
        '<div class="mw-compare"><div class="monshi-loading" style="padding:30px 20px;">' +
        '👑 The <b>compare</b> widget requires a <a href="https://monshi.xyz/embed/buy.html?tier=pro" target="_blank" rel="noopener" style="color:#a855f7;">Pro license</a>' +
        '</div></div>' + makeFooter(license);
      return;
    }
    var tokenList = tokens.split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(function (t) { return /^0x[a-f0-9]{40}$/.test(t); });
    if (!tokenList.length) {
      host.innerHTML = '<div class="mw-compare"><div class="monshi-loading">No valid tokens in data-tokens</div></div>';
      return;
    }
    if (tokenList.length > 10) tokenList = tokenList.slice(0, 10);

    host.innerHTML = '<div class="mw-compare"><div class="mw-c-head">📊 TOKEN COMPARISON</div><div class="mw-c-list"><div class="monshi-loading">Loading…</div></div></div>' + makeFooter(license);

    function refresh() {
      Promise.all(tokenList.map(function (t) { return fetchDex(t); })).then(function (results) {
        var rows = results.map(function (top, i) {
          if (!top) return { sym: tokenList[i].slice(0, 6) + '…', name: 'no pair', price: 0, change: 0, mcap: 0 };
          return {
            sym: (top.baseToken && top.baseToken.symbol) || '?',
            name: (top.baseToken && top.baseToken.name) || '',
            price: parseFloat(top.priceUsd || 0),
            change: parseFloat(top.priceChange && top.priceChange.h24 || 0),
            mcap: top.marketCap || top.fdv || 0,
            ca: tokenList[i]
          };
        });
        // Rank by 24h % change
        rows.sort(function (a, b) { return b.change - a.change; });

        host.querySelector('.mw-c-list').innerHTML = rows.map(function (r, idx) {
          var rankCls = idx === 0 ? 'g' : idx === 1 ? 's' : idx === 2 ? 'b' : '';
          return '<div class="mw-c-row">' +
            '<div class="mw-c-rank ' + rankCls + '">#' + (idx + 1) + '</div>' +
            '<div><div class="mw-c-sym">$' + r.sym + '</div><div class="mw-c-name">' + (r.name || r.ca.slice(0, 8)) + '</div></div>' +
            '<div class="mw-c-price">' + fmtPrice(r.price) + '</div>' +
            '<div class="mw-c-chg ' + (r.change >= 0 ? 'up' : 'dn') + '">' + (r.change >= 0 ? '+' : '') + r.change.toFixed(1) + '%</div>' +
            '</div>';
        }).join('');
      });
    }
    refresh();
    setInterval(refresh, 30000);
  }

  // ─── Widget: BADGE — embeddable MONSHI tier badge for personal sites ──
  function renderBadge(host, wallet, license) {
    host.innerHTML = '<div class="mw-badge"><div class="monshi-loading" style="padding:18px;">Loading…</div></div>' + makeFooter(license);

    function refresh() {
      // Always queries against MONSHI_CA — this widget is specifically for $MONSHI tier flexing
      rpc('eth_call', [{ to: MONSHI_CA, data: '0x70a08231' + pad(wallet).slice(2) }, 'latest']).then(function (raw) {
        if (!raw) throw 0;
        var bal = Number(BigInt(raw)) / 1e18;
        var tier;
        if (bal >= 10000000)      tier = { key: 'royalty', emoji: '👑', label: 'ROYALTY' };
        else if (bal >= 1000000)  tier = { key: 'whale',   emoji: '🐋', label: 'WHALE' };
        else if (bal >= 100000)   tier = { key: 'dolphin', emoji: '🐬', label: 'DOLPHIN' };
        else if (bal >= 10000)    tier = { key: 'crab',    emoji: '🦀', label: 'CRAB' };
        else                      tier = { key: 'shrimp',  emoji: '🦐', label: 'SHRIMP' };

        host.querySelector('.mw-badge').innerHTML =
          '<div class="mw-bg-emoji">' + tier.emoji + '</div>' +
          '<div class="mw-bg-mid">' +
            '<div class="mw-bg-tier ' + tier.key + '">' + tier.label + '</div>' +
            '<div class="mw-bg-bal">' + fmtNum(bal) + ' $MONSHI</div>' +
            '<div class="mw-bg-addr">' + shortAddr(wallet) + '</div>' +
          '</div>' +
          '<a class="mw-bg-link" href="https://monshi.xyz?ref=badge" target="_blank" rel="noopener" title="Get yours at monshi.xyz">→</a>';
      }).catch(function () {
        host.querySelector('.mw-badge').innerHTML = '<div class="monshi-loading" style="padding:18px;">Could not load tier</div>';
      });
    }
    refresh();
    setInterval(refresh, 60000);
  }

  // ─── Boot ────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    var scripts = document.querySelectorAll('script[data-widget]');
    scripts.forEach(function (script) {
      // Skip if already initialized
      if (script.dataset.monshiInit) return;
      script.dataset.monshiInit = '1';

      var widget = (script.getAttribute('data-widget') || '').toLowerCase();
      var token = (script.getAttribute('data-token') || '').toLowerCase();
      var tokens = script.getAttribute('data-tokens') || ''; // for compare widget
      var walletAttr = (script.getAttribute('data-wallet') || '').toLowerCase(); // for badge widget
      var style = (script.getAttribute('data-style') || 'dark').toLowerCase();
      var license = script.getAttribute('data-license') || '';
      var accent = script.getAttribute('data-accent') || ''; // Pro-only

      // Validation per widget type
      if (widget === 'badge') {
        if (!walletAttr || !/^0x[a-fA-F0-9]{40}$/.test(walletAttr)) {
          console.warn('[monshi-embed] badge widget requires data-wallet="0x..."');
          return;
        }
      } else if (widget === 'compare') {
        if (!tokens) {
          console.warn('[monshi-embed] compare widget requires data-tokens="0xa,0xb,..."');
          return;
        }
      } else {
        if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) {
          console.warn('[monshi-embed] missing or invalid data-token on', script);
          return;
        }
      }
      if (!['price', 'ticker', 'buy', 'burn', 'holders', 'compare', 'badge'].includes(widget)) {
        console.warn('[monshi-embed] unknown data-widget="' + widget + '". Use: price, ticker, buy, burn, holders, compare, badge');
        return;
      }

      var host = document.createElement('div');
      host.className = 'monshi-w monshi-' + (style === 'light' ? 'light' : 'dark');
      host.setAttribute('data-monshi-widget', widget);
      script.parentNode.insertBefore(host, script.nextSibling);

      verifyLicense(license).then(function (lic) {
        // Pro-only: custom accent color
        if (lic.tier === 'pro' && accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
          host.style.setProperty('--monshi-accent', accent);
        }
        if (widget === 'price') renderPrice(host, token, lic);
        else if (widget === 'ticker') renderTicker(host, token, lic);
        else if (widget === 'buy') renderBuy(host, token, lic);
        else if (widget === 'burn') renderBurn(host, token, lic);
        else if (widget === 'holders') renderHolders(host, token, lic);
        else if (widget === 'compare') renderCompare(host, tokens, lic);
        else if (widget === 'badge') renderBadge(host, walletAttr, lic);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
