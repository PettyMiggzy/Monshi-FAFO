// Rene Arcade — $RENE balance + holder perks. Rides on top of monshi-shared.js.
(function(){
  if(!window.MONSHI){console.warn('rene-shared: monshi-shared not loaded');return;}
  window.RENE = window.RENE || {};

  var RENE_TOKEN = '0xaCA86430cCCEdbedB35910fC8A5AFEF07dA37777';
  var RENE_PAIR  = '0x7d03647462615402e0798fe4488C62aDdB8da52B';
  var BUY_URL    = 'https://nad.fun/tokens/' + RENE_TOKEN;
  var SUPABASE_URL = 'https://cuqhqcmrgpdjlhyqztnc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nu-E2mvgdQ0l1DsSsOswWA_ma2RbV4z';

  RENE.TOKEN = RENE_TOKEN;
  RENE.PAIR  = RENE_PAIR;
  RENE.BUY_URL = BUY_URL;
  RENE.SUPABASE_URL = SUPABASE_URL;
  RENE.SUPABASE_KEY = SUPABASE_KEY;

  RENE.balance = parseFloat(localStorage.getItem('rene_balance')||'0');

  RENE.fetchBalance = async function(){
    if(!MONSHI.wallet||!window.ethereum)return 0;
    try{
      var data = '0x70a08231' + MONSHI.wallet.slice(2).padStart(64,'0');
      var r = await window.ethereum.request({method:'eth_call',params:[{to:RENE_TOKEN,data:data},'latest']});
      var bal = Number(BigInt(r))/1e18;
      RENE.balance = bal;
      localStorage.setItem('rene_balance', bal);
      window.dispatchEvent(new CustomEvent('rene:balance',{detail:bal}));
    }catch(e){console.log('rene balance err',e);}
    return RENE.balance;
  };

  // Holder = 2x score multiplier on top of MONSHI tier mult
  RENE.isHolder = function(){return RENE.balance > 0;};
  RENE.getMultiplier = function(){
    var base = MONSHI.getMultiplier(); // includes MONSHI tier + NFT
    return RENE.isHolder() ? base + 1.0 : base;
  };
  RENE.boostScore = function(raw){return Math.floor(raw * RENE.getMultiplier());};

  // Format helpers
  RENE.fmtBal = function(n){
    n = n||0;
    if(n>=1e9)return (n/1e9).toFixed(2)+'B';
    if(n>=1e6)return (n/1e6).toFixed(2)+'M';
    if(n>=1e3)return (n/1e3).toFixed(1)+'K';
    return Math.floor(n).toString();
  };

  // Supabase helpers (same project, rene_* tables)
  RENE.sbH = function(){return{
    'apikey':SUPABASE_KEY,
    'Authorization':'Bearer '+SUPABASE_KEY,
    'Content-Type':'application/json',
    'Prefer':'return=representation'
  };};
  RENE.fetchLeaderboard = function(table, limit){
    limit = limit||10;
    return fetch(SUPABASE_URL+'/rest/v1/'+table+'?select=name,score&order=score.desc&limit='+limit,{headers:RENE.sbH()})
      .then(function(r){return r.json();})
      .catch(function(){return [];});
  };
  RENE.submitScore = function(table, score){
    var name = localStorage.getItem('monshi_name')||'ANON';
    return fetch(SUPABASE_URL+'/rest/v1/'+table,{
      method:'POST',headers:RENE.sbH(),
      body:JSON.stringify({name:name,score:Math.floor(score)})
    }).catch(function(e){console.log('submit err',e);});
  };
  RENE.fetchBestScore = async function(table){
    var name = localStorage.getItem('monshi_name');
    if(!name)return 0;
    try{
      var r = await fetch(SUPABASE_URL+'/rest/v1/'+table+'?select=score&name=eq.'+encodeURIComponent(name)+'&order=score.desc&limit=1',{headers:RENE.sbH()});
      var d = await r.json();
      return (d && d[0]) ? d[0].score : 0;
    }catch(e){return 0;}
  };

  // Auto-fetch RENE balance when wallet connects/changes
  window.addEventListener('monshi:connect', function(){RENE.fetchBalance();});
  window.addEventListener('monshi:disconnect', function(){RENE.balance=0;localStorage.removeItem('rene_balance');});

  function init(){if(MONSHI.wallet) RENE.fetchBalance();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
