/**
 * ROBY HUB · Shared shell
 * Renders the sticky top ticker bar + nav + footer on every page.
 * Every Roby page just needs:
 *   <div id="roby-shell"></div>
 *   <script src="/roby/roby-shell.js"></script>
 *
 * The ticker pulls live prices from DexScreener for tracked tokens.
 */

(function(){
  'use strict';

  // Tokens to show in the ticker. Order matters — first ones shown first.
  // Updated dynamically by also pulling whatever's in calls.json when available.
  var TICKER_TOKENS = [
    { sym: 'MONSHI', ca: '0xB744F5CDb792d8187640214C4A1c9aCE29af7777', chain: 'monad' },
    { sym: 'CHOG',   ca: '0x350035555E10d9AfAF1566AaebfCeD5BA6C27777', chain: 'monad' },
    { sym: 'CHOGI',  ca: '0x5E1b1A14c8758104B8560514e94ab8320e587777', chain: 'monad' },
    { sym: 'PHUCK',  ca: '0x148a3a811979e5BF8366FC279B2d67742Fe17777', chain: 'monad' },
    { sym: 'RENE',   ca: '0xaCA86430cCCEdbedB35910fC8A5AFEF07dA37777', chain: 'monad' }
  ];

  // Inject CSS
  var css = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Cinzel:wght@500;700;900&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700;900&display=swap');

:root {
  --r-gold:#FCC419;
  --r-gold-deep:#E0A800;
  --r-red:#9B2C2C;
  --r-red-deep:#5B1A1A;
  --r-stone:#2E2618;
  --r-stone-deep:#1A140C;
  --r-cream:#F5E6CC;
  --r-blue:#4A6BA6;
  --r-green:#4ADE80;
  --r-down:#EF4444;
}

.roby-body {
  font-family:'Space Grotesk', system-ui, sans-serif;
  background:#0d0a06;
  color:var(--r-cream);
  min-height:100vh;
  margin:0;
  -webkit-font-smoothing:antialiased;
  position:relative;
}
.roby-body::before {
  content:'';
  position:fixed; inset:0;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(252,196,25,0.10), transparent 55%),
    radial-gradient(ellipse at 100% 100%, rgba(155,44,44,0.18), transparent 55%);
  pointer-events:none;
  z-index:-2;
}
.roby-body::after {
  content:'';
  position:fixed; inset:0;
  background-image:
    linear-gradient(rgba(252,196,25,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(252,196,25,0.04) 1px, transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse at center, black 30%, transparent 80%);
  -webkit-mask-image:radial-gradient(ellipse at center, black 30%, transparent 80%);
  pointer-events:none;
  z-index:-1;
}

/* TICKER */
.roby-ticker {
  position:sticky; top:0; z-index:60;
  background:linear-gradient(180deg, #1a1208, #0d0a06);
  border-bottom:1px solid rgba(252,196,25,.3);
  height:36px;
  overflow:hidden;
  position:relative;
}
.roby-ticker::before {
  content:'LIVE';
  position:absolute; left:0; top:0; bottom:0;
  display:flex; align-items:center;
  padding:0 12px;
  background:linear-gradient(90deg, #9B2C2C, #5B1A1A);
  color:#FCC419;
  font-family:'Press Start 2P', monospace;
  font-size:9px;
  letter-spacing:1px;
  z-index:2;
  border-right:2px solid #FCC419;
  animation:livePulse 1.4s infinite;
}
@keyframes livePulse{0%,100%{filter:brightness(1);}50%{filter:brightness(1.3);}}

.roby-ticker-track {
  display:flex;
  gap:32px;
  align-items:center;
  height:100%;
  white-space:nowrap;
  padding-left:80px;
  animation:tickerScroll 50s linear infinite;
  will-change:transform;
}
.roby-ticker:hover .roby-ticker-track { animation-play-state:paused; }
@keyframes tickerScroll {
  0% { transform:translateX(0); }
  100% { transform:translateX(-50%); }
}
.roby-ticker-item {
  display:inline-flex; align-items:center;
  gap:7px;
  font-family:'JetBrains Mono', monospace;
  font-size:11px; font-weight:700;
  letter-spacing:.5px;
  flex-shrink:0;
}
.roby-ticker-sym { color:#FCC419; }
.roby-ticker-price { color:#F5E6CC; }
.roby-ticker-pct { font-weight:700; padding:1px 5px; border-radius:3px; font-size:10px; }
.roby-ticker-pct.up { color:#4ADE80; background:rgba(74,222,128,.12); }
.roby-ticker-pct.dn { color:#EF4444; background:rgba(239,68,68,.12); }
.roby-ticker-pct.flat { color:rgba(245,230,204,.5); background:rgba(245,230,204,.06); }
.roby-ticker-arrow { font-size:10px; }

/* NAV */
.roby-nav {
  position:sticky; top:36px; z-index:55;
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 20px;
  background:rgba(13,10,6,.92);
  backdrop-filter:blur(14px);
  border-bottom:2px solid rgba(252,196,25,.4);
  flex-wrap:wrap;
  gap:12px;
}
.roby-brand {
  display:flex; align-items:center; gap:12px;
  text-decoration:none;
}
.roby-brand-img {
  width:42px; height:42px; border-radius:50%;
  border:2px solid #FCC419;
  box-shadow:0 0 16px rgba(252,196,25,.5);
  background:#4A6BA6;
  overflow:hidden; flex-shrink:0;
}
.roby-brand-img img { width:100%; height:100%; object-fit:cover; }
.roby-brand-text {}
.roby-brand-name {
  font-family:'Cinzel', serif;
  font-weight:900;
  font-size:18px;
  color:#FCC419;
  letter-spacing:2.5px;
  line-height:1;
  text-shadow:0 0 18px rgba(252,196,25,.5);
}
.roby-brand-sub {
  font-family:'JetBrains Mono', monospace;
  font-size:9px;
  letter-spacing:2px;
  color:rgba(245,230,204,.55);
  margin-top:3px;
  font-weight:700;
}

.roby-nav-links {
  display:flex; gap:6px; flex-wrap:wrap;
}
.roby-nav-links a {
  padding:8px 13px;
  font-family:'Cinzel', serif;
  font-weight:700;
  font-size:11px;
  letter-spacing:1.5px;
  color:rgba(245,230,204,.7);
  text-decoration:none;
  background:rgba(252,196,25,.05);
  border:1px solid rgba(252,196,25,.25);
  border-radius:6px;
  transition:all .12s;
  text-transform:uppercase;
}
.roby-nav-links a:hover {
  background:rgba(252,196,25,.18);
  color:#FCC419;
  border-color:#FCC419;
}
.roby-nav-links a.current {
  background:linear-gradient(135deg, #FCC419, #E0A800);
  color:#0d0a06;
  border-color:#FCC419;
}
.roby-nav-links a.tg {
  background:linear-gradient(135deg, #4A6BA6, #2C4A7C);
  color:#fff;
  border:none;
}
.roby-nav-links a.bot {
  background:linear-gradient(135deg, #9B2C2C, #FCC419);
  color:#fff;
  border:none;
  font-weight:900;
  position:relative;
  animation:botBlink 2.5s ease-in-out infinite;
}
@keyframes botBlink {
  0%,100% { box-shadow:0 0 0 rgba(252,196,25,0); }
  50% { box-shadow:0 0 14px rgba(252,196,25,.6); }
}

/* FOOTER */
.roby-footer {
  margin-top:60px;
  padding:30px 20px 60px;
  text-align:center;
  border-top:1px solid rgba(252,196,25,.15);
}
.roby-footer-quote {
  font-family:'Cinzel', serif;
  font-size:14px;
  font-style:italic;
  color:rgba(245,230,204,.6);
  margin-bottom:18px;
  letter-spacing:1px;
}
.roby-footer-links {
  display:flex; gap:14px; justify-content:center; flex-wrap:wrap;
  margin-bottom:18px;
  font-family:'JetBrains Mono', monospace;
  font-size:10px; letter-spacing:1.5px; font-weight:700;
}
.roby-footer-links a {
  color:rgba(245,230,204,.55);
  text-decoration:none;
}
.roby-footer-links a:hover { color:#FCC419; }
.roby-credit-pill {
  display:inline-flex; align-items:center; gap:8px;
  margin-top:6px;
  padding:9px 18px;
  background:linear-gradient(135deg, rgba(252,196,25,.1), rgba(155,44,44,.1));
  border:1.5px solid rgba(252,196,25,.4);
  border-radius:30px;
  text-decoration:none; color:#fff;
  font-family:'Cinzel', serif; font-weight:700;
  font-size:11px; letter-spacing:1.5px;
  text-transform:uppercase;
}
.roby-credit-pill .h {
  color:#FCC419;
  font-family:'JetBrains Mono', monospace;
  font-weight:700;
  font-size:10px;
  letter-spacing:1px;
  text-transform:none;
}

/* RESPONSIVE */
@media(max-width:600px) {
  .roby-nav { padding:12px 14px; }
  .roby-brand-name { font-size:16px; }
  .roby-nav-links a { padding:6px 9px; font-size:10px; }
  .roby-ticker { height:30px; }
  .roby-ticker::before { font-size:8px; padding:0 9px; }
  .roby-ticker-track { padding-left:62px; gap:24px; animation-duration:35s; }
}
`;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Add roby-body class to body
  document.body.classList.add('roby-body');

  // Determine current page for nav highlight
  var path = window.location.pathname.replace(/\/$/,'');
  var isCurrent = function(p){
    if (p === '/roby' || p === '/roby/index.html') {
      return path === '/roby' || path === '/roby/index.html' || path === '';
    }
    return path === p || path === p + '.html' || path.endsWith(p);
  };

  // Build shell HTML
  var navItems = [
    { href:'/roby/',              label:'HUB',   match:'/roby' },
    { href:'/roby/calls.html',    label:'CALLS', match:'/roby/calls' },
    { href:'/roby/cardmaker.html',label:'CARD MAKER', match:'/roby/cardmaker' },
    { href:'/roby/raids.html',    label:'RAIDS', match:'/roby/raids' },
    { href:'/roby/leaderboard.html', label:'COURT', match:'/roby/leaderboard' }
  ];

  var navLinksHtml = navItems.map(function(item){
    var cls = isCurrent(item.match) ? 'current' : '';
    return '<a href="' + item.href + '" class="' + cls + '">' + item.label + '</a>';
  }).join('') +
    '<a href="https://t.me/RobysRaidBot" target="_blank" rel="noopener" class="bot">🤖 BOT</a>' +
    '<a href="https://t.me/robyslounge" target="_blank" rel="noopener" class="tg">📱 LOUNGE</a>' +
    '<a href="https://x.com/RobyCalls" target="_blank" rel="noopener">𝕏</a>';

  var shellHtml =
    '<div class="roby-ticker">' +
      '<div class="roby-ticker-track" id="roby-ticker-track"><span class="roby-ticker-item" style="color:rgba(245,230,204,.4);">loading prices...</span></div>' +
    '</div>' +
    '<nav class="roby-nav">' +
      '<a class="roby-brand" href="/roby/">' +
        '<div class="roby-brand-img"><img src="/roby/data/roby-pfp.png" alt="Roby Calls" onerror="this.parentElement.innerHTML=\'👑\';this.parentElement.style.display=\'flex\';this.parentElement.style.alignItems=\'center\';this.parentElement.style.justifyContent=\'center\';this.parentElement.style.fontSize=\'24px\';"></div>' +
        '<div class="roby-brand-text">' +
          '<div class="roby-brand-name">ROBY CALLS</div>' +
          '<div class="roby-brand-sub">ROYAL HUB · MONAD</div>' +
        '</div>' +
      '</a>' +
      '<div class="roby-nav-links">' + navLinksHtml + '</div>' +
    '</nav>';

  // Footer
  var footerHtml =
    '<footer class="roby-footer">' +
      '<div class="roby-footer-quote">"the throne sees all calls."</div>' +
      '<div class="roby-footer-links">' +
        '<a href="/roby/">HUB</a>' +
        '<a href="/roby/calls.html">CALLS</a>' +
        '<a href="/roby/cardmaker.html">CARD MAKER</a>' +
        '<a href="/roby/raids.html">RAIDS</a>' +
        '<a href="/roby/leaderboard.html">COURT</a>' +
        '<a href="https://t.me/robyslounge" target="_blank" rel="noopener">LOUNGE</a>' +
        '<a href="https://x.com/RobyCalls" target="_blank" rel="noopener">𝕏</a>' +
        '<a href="https://linktr.ee/robycalls" target="_blank" rel="noopener">LINKS</a>' +
      '</div>' +
      '<div style="font-family:\'Cinzel\', serif; font-size:11px; color:rgba(245,230,204,.4); margin-bottom:14px; letter-spacing:1.5px;">a royal hub · hosted by monshi · monad mainnet</div>' +
      '<a href="https://x.com/miggzyonbase" target="_blank" rel="noopener" class="roby-credit-pill">' +
        '<span style="font-size:14px;">👑</span>' +
        '<span>BUILT BY KING PETTY</span>' +
        '<span class="h">@miggzyonbase</span>' +
      '</a>' +
    '</footer>';

  // Insert into shell mount points
  var headerMount = document.getElementById('roby-shell');
  if (headerMount) {
    headerMount.outerHTML = shellHtml;
  } else {
    // No mount point — prepend to body
    var div = document.createElement('div');
    div.innerHTML = shellHtml;
    document.body.insertBefore(div, document.body.firstChild);
  }
  var footerMount = document.getElementById('roby-footer');
  if (footerMount) {
    footerMount.outerHTML = footerHtml;
  } else {
    var fdiv = document.createElement('div');
    fdiv.innerHTML = footerHtml;
    document.body.appendChild(fdiv);
  }

  // ─── TICKER DATA ──────────────────────────────────────
  function fmtPrice(n){
    if(!n||isNaN(n))return '—';
    if(n>=1)return '$'+n.toFixed(2);
    if(n>=0.01)return '$'+n.toFixed(4);
    if(n>=0.0001)return '$'+n.toFixed(6);
    var s=n.toFixed(20).split('.')[1]||''; var z=0;
    for(var i=0;i<s.length;i++){if(s[i]==='0')z++;else break;}
    var sig=s.slice(z,z+4).replace(/0+$/,'')||'0';
    var sub=String(z).split('').map(function(d){return '₀₁₂₃₄₅₆₇₈₉'[+d];}).join('');
    return '$0.0'+sub+sig;
  }

  function loadTicker(){
    var track = document.getElementById('roby-ticker-track');
    if (!track) return;

    // Also pull tokens from calls.json (Roby's tracked calls) if available
    fetch('/roby/data/calls.json').then(function(r){return r.ok ? r.json() : null;}).catch(function(){return null;}).then(function(callsData){
      var dynamicTokens = TICKER_TOKENS.slice();
      if (callsData && Array.isArray(callsData.calls)) {
        callsData.calls.forEach(function(c){
          if (c.contract && c.symbol && !dynamicTokens.find(function(t){return t.ca.toLowerCase()===c.contract.toLowerCase();})) {
            dynamicTokens.push({ sym: c.symbol, ca: c.contract, chain: c.chain || 'monad' });
          }
        });
      }

      Promise.all(dynamicTokens.map(function(tok){
        return fetch('https://api.dexscreener.com/latest/dex/tokens/' + tok.ca)
          .then(function(r){return r.json();})
          .then(function(d){
            if(!d.pairs || !d.pairs.length) return null;
            var p = d.pairs.sort(function(a,b){return (b.liquidity?.usd||0)-(a.liquidity?.usd||0);})[0];
            return {
              sym: tok.sym,
              price: parseFloat(p.priceUsd||0),
              chg: parseFloat(p.priceChange?.h24||0)
            };
          })
          .catch(function(){return null;});
      })).then(function(results){
        var items = results.filter(Boolean);
        if (!items.length) {
          track.innerHTML = '<span class="roby-ticker-item" style="color:rgba(245,230,204,.4);">no live data right now</span>';
          return;
        }
        // Build HTML for one set, then duplicate for seamless infinite scroll
        var singleSet = items.map(function(it){
          var pctClass = it.chg > 0.01 ? 'up' : it.chg < -0.01 ? 'dn' : 'flat';
          var arrow = it.chg > 0.01 ? '▲' : it.chg < -0.01 ? '▼' : '·';
          return '<span class="roby-ticker-item">' +
            '<span class="roby-ticker-sym">$' + it.sym + '</span>' +
            '<span class="roby-ticker-price">' + fmtPrice(it.price) + '</span>' +
            '<span class="roby-ticker-pct ' + pctClass + '"><span class="roby-ticker-arrow">' + arrow + '</span> ' + (it.chg>=0?'+':'') + it.chg.toFixed(2) + '%</span>' +
          '</span>';
        }).join('');
        track.innerHTML = singleSet + singleSet; // double for infinite scroll
      });
    });
  }
  loadTicker();
  setInterval(loadTicker, 60000); // refresh every 60s
})();
