// Wallet profile page - shows all stats for a wallet across every game
const SUPABASE_URL = 'https://cuqhqcmrgpdjlhyqztnc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nu-E2mvgdQ0l1DsSsOswWA_ma2RbV4z';
const CONTRACT = '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';

const TABLES = [
  ['scores','MONSHI RUNNER','runner'],
  ['scores_shooter','MONSHI SHOOTER','shooter'],
  ['scores_racer','MONSHI HIGHWAY','racer'],
  ['scores_flappy','FLAPPY MONSHI','flappy'],
  ['scores_snake','MONSHI SNAKE','snake'],
  ['scores_breaker','MONSHI BREAKER','breaker'],
  ['scores_pump','PUMP OR DUMP','pump'],
  ['scores_flip','COIN FLIP','flip'],
  ['scores_whack','WHACK FUDDERS','whack'],
  ['scores_2048','2048 MONSHI','2048'],
  ['scores_slots','MONSHI SLOTS','slots'],
  ['scores_memory','MONSHI MEMORY','memory'],
  ['scores_plinko','MONSHI PLINKO','plinko'],
  ['scores_rug','RUG DETECTOR','rug'],
  ['scores_wordle','MONSHI WORDLE','wordle'],
  ['scores_tetris','MONSHI TETRIS','tetris'],
  ['scores_c4','BULLS vs BEARS','connect4'],
  ['scores_trivia','CRYPTO TRIVIA','trivia'],
  ['scores_mine','RUG SWEEPER','mine'],
  ['scores_bj','DEV BLACKJACK','blackjack'],
  ['scores_whale','WHALE HUNTER','whale'],
  ['scores_trade','TRADING SIM','trade']
];

const TIERS = [
  { name:'SHRIMP', emoji:'🦐', min:0, color:'#F97316' },
  { name:'CRAB', emoji:'🦀', min:10000, color:'#FCD34D' },
  { name:'DOLPHIN', emoji:'🐬', min:100000, color:'#60A5FA' },
  { name:'WHALE', emoji:'🐋', min:1000000, color:'#A855F7' },
  { name:'ROYALTY', emoji:'👑', min:10000000, color:'#4ADE80' }
];

function tierFor(bal){for(var i=TIERS.length-1;i>=0;i--)if(bal>=TIERS[i].min)return TIERS[i];return TIERS[0];}

async function fetchBalance(wallet){
  try{
    const data = '0x70a08231' + wallet.slice(2).padStart(64,'0').toLowerCase();
    const r = await fetch('https://rpc.monad.xyz', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',method:'eth_call',params:[{to:CONTRACT,data:data},'latest'],id:1})
    });
    const j = await r.json();
    if(!j.result) return 0;
    return Number(BigInt(j.result))/1e18;
  }catch(e){return 0;}
}

export default async function handler(req, res) {
  const wallet = (req.query.wallet || '').toLowerCase();
  if(!/^0x[a-f0-9]{40}$/.test(wallet)){
    res.status(400).send('Invalid wallet');return;
  }
  
  // Fetch best score per game for this wallet
  const headers = {'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY};
  const promises = TABLES.map(([t,name,slug])=>
    fetch(`${SUPABASE_URL}/rest/v1/${t}?wallet=eq.${wallet}&select=name,score,created_at&order=score.desc&limit=1`,{headers})
      .then(r=>r.ok?r.json():[])
      .then(d=>({table:t,name,slug,best:d[0]||null}))
      .catch(()=>({table:t,name,slug,best:null}))
  );
  
  const results = await Promise.all(promises);
  const balance = await fetchBalance(wallet);
  const tier = tierFor(balance);
  
  const playedGames = results.filter(r=>r.best);
  const totalScore = playedGames.reduce((a,r)=>a+r.best.score,0);
  const playerName = playedGames.length>0?playedGames[0].best.name:'ANON';
  const fmtBal = balance>=1e9?(balance/1e9).toFixed(1)+'B':balance>=1e6?(balance/1e6).toFixed(2)+'M':balance>=1e3?(balance/1e3).toFixed(1)+'K':Math.floor(balance);
  
  const ogParams = new URLSearchParams({game:`${playerName}'S PROFILE`,score:totalScore,name:playerName,sub:`${playedGames.length} games · ${tier.emoji} ${tier.name}`});
  const ogImage = `https://monshi-fafo.vercel.app/api/og?${ogParams.toString()}`;
  
  const shortW = wallet.slice(0,6)+'...'+wallet.slice(-4);
  
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=60');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${playerName} — MONSHI ARCADE Profile</title>
<meta property="og:title" content="${playerName}'s Profile · MONSHI ARCADE">
<meta property="og:description" content="${totalScore.toLocaleString()} total points across ${playedGames.length} games. ${tier.emoji} ${tier.name} holder.">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:site" content="@Monshi_Monpad">
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&family=JetBrains+Mono&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#02000a;font-family:'Space Mono',monospace;color:#fff;padding:30px 20px;}
.wrap{max-width:900px;margin:0 auto;}
.bk{display:inline-block;color:rgba(139,92,246,.7);text-decoration:none;font-size:11px;letter-spacing:1.5px;background:rgba(0,0,0,.5);padding:6px 12px;border-radius:8px;border:1px solid rgba(139,92,246,.2);margin-bottom:30px;}
.bk:hover{color:#fff;}
.hero{text-align:center;padding:40px 20px;background:linear-gradient(135deg,${tier.color}15,rgba(20,5,50,.7));border:1.5px solid ${tier.color}66;border-radius:18px;margin-bottom:24px;backdrop-filter:blur(10px);box-shadow:0 0 40px ${tier.color}33;}
.tier-emoji{font-size:64px;margin-bottom:8px;}
.player-name{font-family:Orbitron,sans-serif;font-size:48px;font-weight:900;color:#fff;letter-spacing:3px;margin-bottom:6px;text-shadow:0 0 30px ${tier.color};}
.wallet-addr{font-family:'JetBrains Mono',monospace;font-size:13px;color:rgba(167,139,250,.7);margin-bottom:16px;}
.tier-badge{display:inline-block;padding:8px 20px;border:2px solid ${tier.color};background:${tier.color}22;color:${tier.color};border-radius:30px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:3px;font-size:14px;}
.bag{margin-top:16px;font-size:14px;color:rgba(196,181,253,.7);letter-spacing:2px;}
.bag span{color:#fff;font-family:Orbitron,sans-serif;font-weight:700;}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:30px;}
.stat{background:rgba(20,5,50,.6);border:1px solid rgba(139,92,246,.25);border-radius:12px;padding:18px;text-align:center;}
.stat .v{font-family:Orbitron,sans-serif;font-size:28px;font-weight:900;color:#fff;}
.stat .l{font-size:9px;color:rgba(167,139,250,.6);letter-spacing:2px;margin-top:4px;}
.section-h{font-family:Orbitron,sans-serif;font-size:14px;letter-spacing:4px;color:#A855F7;margin:30px 0 16px;}
.games-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.game-card{background:rgba(20,5,50,.5);border:1px solid rgba(139,92,246,.2);border-radius:10px;padding:16px;text-decoration:none;color:inherit;transition:all .2s;display:flex;justify-content:space-between;align-items:center;}
.game-card:hover{border-color:#8B5CF6;transform:translateY(-2px);}
.game-card.played{border-color:rgba(74,222,128,.3);background:rgba(34,197,94,.05);}
.game-card .info{flex:1;min-width:0;}
.game-card .gn{font-family:Orbitron,sans-serif;font-size:13px;font-weight:700;color:#fff;letter-spacing:1px;margin-bottom:4px;}
.game-card .ds{font-size:10px;color:rgba(167,139,250,.5);letter-spacing:1px;}
.game-card .sc{font-family:Orbitron,sans-serif;font-size:20px;font-weight:900;color:#4ADE80;text-align:right;}
.game-card .sc.empty{color:rgba(139,92,246,.3);font-size:14px;}
.share-btn{display:inline-block;margin-top:30px;padding:14px 28px;background:linear-gradient(135deg,#1DA1F2,#0d7abf);color:#fff;text-decoration:none;font-family:Orbitron,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;border-radius:10px;}
.share-btn:hover{opacity:.9;}
.center{text-align:center;}
</style>
</head>
<body>
<div class="wrap">
  <a class="bk" href="/leaderboard.html">← BACK TO LEADERBOARD</a>
  
  <div class="hero">
    <div class="tier-emoji">${tier.emoji}</div>
    <div class="player-name">${escapeHtml(playerName)}</div>
    <div class="wallet-addr">${shortW}</div>
    <div class="tier-badge">${tier.name}</div>
    <div class="bag">$MONSHI BAG: <span>${fmtBal}</span></div>
  </div>
  
  <div class="stats-row">
    <div class="stat"><div class="v" style="color:#4ADE80;">${totalScore.toLocaleString()}</div><div class="l">TOTAL POINTS</div></div>
    <div class="stat"><div class="v">${playedGames.length}/22</div><div class="l">GAMES PLAYED</div></div>
    <div class="stat"><div class="v" style="color:${tier.color};">${tier.name==='SHRIMP'?'1.0x':tier.name==='CRAB'?'1.5x':tier.name==='DOLPHIN'?'2.0x':tier.name==='WHALE'?'2.5x':'3.0x'}</div><div class="l">SCORE MULTIPLIER</div></div>
  </div>
  
  <div class="section-h">📊 ALL GAMES</div>
  <div class="games-grid">
${results.map(r=>{
    if(!r.best) return `<a class="game-card" href="/${r.slug}.html"><div class="info"><div class="gn">${r.name}</div><div class="ds">never played — try it</div></div><div class="sc empty">—</div></a>`;
    return `<a class="game-card played" href="/${r.slug}.html"><div class="info"><div class="gn">${r.name}</div><div class="ds">best score</div></div><div class="sc">${r.best.score.toLocaleString()}</div></a>`;
  }).join('')}
  </div>
  
  <div class="center">
    <a class="share-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${playerName}'s @Monshi_Monpad ARCADE profile — ${totalScore.toLocaleString()} pts across ${playedGames.length} games. https://monshi-fafo.vercel.app/api/profile?wallet=${wallet} $MONSHI #Monad`)}" target="_blank">SHARE PROFILE 𝕏</a>
  </div>
</div>
<script>function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}</script>
</body>
</html>`);
}

function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
