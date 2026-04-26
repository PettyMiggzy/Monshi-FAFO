// Monshi Arcade — Shared wallet + tier + score system
// This script is included in all games for wallet connect, tier perks, and global ranking

(function(){
  window.MONSHI = window.MONSHI || {};
  
  var CONTRACT = '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';
  var MONAD_HEX = '0x8f';
  var MONAD_DEC = 143;
  var SUPABASE_URL = 'https://cuqhqcmrgpdjlhyqztnc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nu-E2mvgdQ0l1DsSsOswWA_ma2RbV4z';

  var TIERS = [
    { name:'SHRIMP',  emoji:'🦐', min:0,        color:'#F97316', mult:1.0, perks:[] },
    { name:'CRAB',    emoji:'🦀', min:10000,    color:'#FCD34D', mult:1.5, perks:['1.5x SCORE'] },
    { name:'DOLPHIN', emoji:'🐬', min:100000,   color:'#60A5FA', mult:2.0, perks:['2x SCORE','+1 LIFE'] },
    { name:'WHALE',   emoji:'🐋', min:1000000,  color:'#A855F7', mult:2.5, perks:['2.5x SCORE','+2 LIVES','WHALE MODE'] },
    { name:'ROYALTY', emoji:'👑', min:10000000, color:'#4ADE80', mult:3.0, perks:['3x SCORE','+3 LIVES','GOLD BADGE','ROYAL MODE'] }
  ];

  function tierForBalance(bal){
    for(var i=TIERS.length-1;i>=0;i--) if(bal>=TIERS[i].min) return TIERS[i];
    return TIERS[0];
  }

  // State
  MONSHI.wallet = localStorage.getItem('monshi_wallet') || null;
  MONSHI.balance = parseFloat(localStorage.getItem('monshi_balance')||'0');
  MONSHI.tier = tierForBalance(MONSHI.balance);

  // ── Wallet connect ──
  MONSHI.connectWallet = async function(){
    if(!window.ethereum){alert('Install a Monad-compatible wallet (MetaMask, Phantom, Rabby)');return null;}
    try{
      var accs = await window.ethereum.request({method:'eth_requestAccounts'});
      if(!accs||!accs.length)return null;
      MONSHI.wallet = accs[0];
      localStorage.setItem('monshi_wallet', MONSHI.wallet);
      // Try to switch to Monad
      try{
        await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:MONAD_HEX}]});
      }catch(e){
        if(e.code===4902){
          try{
            await window.ethereum.request({method:'wallet_addEthereumChain',params:[{
              chainId:MONAD_HEX,chainName:'Monad',nativeCurrency:{name:'Monad',symbol:'MON',decimals:18},
              rpcUrls:['https://rpc.monad.xyz'],blockExplorerUrls:['https://monadexplorer.com']
            }]});
          }catch(e2){}
        }
      }
      await MONSHI.fetchBalance();
      MONSHI.updateBadge();
      window.dispatchEvent(new Event('monshi:connect'));
      return MONSHI.wallet;
    }catch(e){console.log('wallet err',e);return null;}
  };

  MONSHI.disconnect = function(){
    MONSHI.wallet=null;MONSHI.balance=0;MONSHI.tier=TIERS[0];
    localStorage.removeItem('monshi_wallet');localStorage.removeItem('monshi_balance');
    MONSHI.updateBadge();
  };

  MONSHI.fetchBalance = async function(){
    if(!MONSHI.wallet||!window.ethereum)return 0;
    try{
      var data = '0x70a08231' + MONSHI.wallet.slice(2).padStart(64,'0');
      var r = await window.ethereum.request({method:'eth_call',params:[{to:CONTRACT,data:data},'latest']});
      var bal = Number(BigInt(r))/1e18;
      MONSHI.balance = bal;
      MONSHI.tier = tierForBalance(bal);
      localStorage.setItem('monshi_balance', bal);
      return bal;
    }catch(e){console.log('balance err',e);return 0;}
  };

  // ── Connect button injected on every game ──
  MONSHI.injectBadge = function(){
    if(document.getElementById('monshiBadge'))return;
    var el = document.createElement('div');
    el.id='monshiBadge';
    el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;transition:all .2s;';
    el.onclick = function(){
      if(MONSHI.wallet){
        if(confirm('Disconnect wallet?'))MONSHI.disconnect();
      } else MONSHI.connectWallet();
    };
    document.body.appendChild(el);
    MONSHI.updateBadge();
    
    // Re-check balance periodically
    setInterval(function(){if(MONSHI.wallet)MONSHI.fetchBalance().then(MONSHI.updateBadge);},60000);
  };

  MONSHI.updateBadge = function(){
    var el = document.getElementById('monshiBadge');if(!el)return;
    if(!MONSHI.wallet){
      el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#22C55E,#15803D);color:#fff;padding:8px 14px;border-radius:8px;border:1px solid rgba(74,222,128,.5);box-shadow:0 0 12px rgba(34,197,94,.3);';
      el.textContent='🔌 CONNECT';
    } else {
      var t=MONSHI.tier;
      el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;background:'+t.color+'22;color:'+t.color+';padding:8px 14px;border-radius:8px;border:1.5px solid '+t.color+';box-shadow:0 0 12px '+t.color+'66;';
      var balK=MONSHI.balance>=1e9?(MONSHI.balance/1e9).toFixed(1)+'B':MONSHI.balance>=1e6?(MONSHI.balance/1e6).toFixed(1)+'M':MONSHI.balance>=1e3?(MONSHI.balance/1e3).toFixed(0)+'K':Math.floor(MONSHI.balance);
      el.innerHTML=t.emoji+' '+t.name+' · '+balK+' · '+t.mult+'x';
    }
  };

  // ── Score submission with multiplier + wallet ──
  // Wraps the submitS function. Returns the boosted score.
  MONSHI.boostedScore = function(rawScore){
    return Math.floor(rawScore * MONSHI.tier.mult);
  };

  MONSHI.getMultiplier = function(){return MONSHI.tier.mult;};
  MONSHI.getExtraLives = function(){
    return MONSHI.tier.name==='SHRIMP'?0:MONSHI.tier.name==='CRAB'?0:MONSHI.tier.name==='DOLPHIN'?1:MONSHI.tier.name==='WHALE'?2:3;
  };

  // Patched score submitter (called from game's showDeath)
  // Adds wallet column when present
  MONSHI.submitWithWallet = function(table, name, score, cb){
    var body = {name:name||'ANON', score:Math.floor(score)};
    if(MONSHI.wallet) body.wallet = MONSHI.wallet;
    fetch(SUPABASE_URL+'/rest/v1/'+table,{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify(body)
    }).then(function(r){return r.json();}).then(cb).catch(cb);
  };

  // Auto-init on load
  function init(){
    MONSHI.injectBadge();
    if(MONSHI.wallet) MONSHI.fetchBalance().then(MONSHI.updateBadge);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
