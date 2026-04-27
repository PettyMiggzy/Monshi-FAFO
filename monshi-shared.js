// Monshi Arcade — Shared wallet + tier + perks system
(function(){
  window.MONSHI = window.MONSHI || {};
  
  var CONTRACT = '0xB744F5CDb792d8187640214C4A1c9aCE29af7777';
  var NFT_CONTRACT = '0x6a933b14c67399aabccfcc85b3429b730c98a519';
  var NFT_OPENSEA = 'https://opensea.io/collection/monshi-nft-collection-563194175';
  var MONAD_HEX = '0x8f';
  var SUPABASE_URL = 'https://cuqhqcmrgpdjlhyqztnc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nu-E2mvgdQ0l1DsSsOswWA_ma2RbV4z';

  // 5 tiers - real perks attached
  var TIERS = [
    { name:'SHRIMP',  emoji:'🦐', min:0,        color:'#F97316', mult:1.0, lives:0, perks:'No perks. Just play.' },
    { name:'CRAB',    emoji:'🦀', min:10000,    color:'#FCD34D', mult:1.5, lives:0, perks:'1.5x score' },
    { name:'DOLPHIN', emoji:'🐬', min:100000,   color:'#60A5FA', mult:2.0, lives:1, perks:'2x score · +1 life' },
    { name:'WHALE',   emoji:'🐋', min:1000000,  color:'#A855F7', mult:2.5, lives:2, perks:'2.5x score · +2 lives · WHALE MODE' },
    { name:'ROYALTY', emoji:'👑', min:10000000, color:'#4ADE80', mult:3.0, lives:3, perks:'3x score · +3 lives · ROYAL MODE · gold leaderboard badge' }
  ];

  function tierForBalance(bal){
    for(var i=TIERS.length-1;i>=0;i--) if(bal>=TIERS[i].min) return TIERS[i];
    return TIERS[0];
  }

  // State
  MONSHI.wallet = localStorage.getItem('monshi_wallet') || null;
  MONSHI.balance = parseFloat(localStorage.getItem('monshi_balance')||'0');
  MONSHI.tier = tierForBalance(MONSHI.balance);
  MONSHI.nftCount = parseInt(localStorage.getItem('monshi_nfts')||'0');
  MONSHI.NFT_OPENSEA = NFT_OPENSEA;
  MONSHI.NFT_CONTRACT = NFT_CONTRACT;

  // ── Wallet connect ──
  MONSHI.connectWallet = async function(){
    if(!window.ethereum){
      alert('Install a wallet (MetaMask, Phantom, Rabby) to unlock perks');
      return null;
    }
    try{
      var accs = await window.ethereum.request({method:'eth_requestAccounts'});
      if(!accs||!accs.length)return null;
      MONSHI.wallet = accs[0];
      localStorage.setItem('monshi_wallet', MONSHI.wallet);
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
      MONSHI.showPerksToast();
      window.dispatchEvent(new Event('monshi:connect'));
      return MONSHI.wallet;
    }catch(e){console.log('wallet err',e);return null;}
  };

  MONSHI.disconnect = function(){
    MONSHI.wallet=null;MONSHI.balance=0;MONSHI.tier=TIERS[0];
    localStorage.removeItem('monshi_wallet');
    localStorage.removeItem('monshi_balance');
    MONSHI.updateBadge();
    window.dispatchEvent(new Event('monshi:disconnect'));
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
    }catch(e){console.log('balance err',e);}
    // Also fetch NFT count
    try{
      var nftData = '0x70a08231' + MONSHI.wallet.slice(2).padStart(64,'0');
      var nftR = await window.ethereum.request({method:'eth_call',params:[{to:NFT_CONTRACT,data:nftData},'latest']});
      var nftN = Number(BigInt(nftR));
      MONSHI.nftCount = nftN;
      localStorage.setItem('monshi_nfts', nftN);
    }catch(e){console.log('nft err',e);}
    return MONSHI.balance;
  };

  // ── Connect badge ──
  MONSHI.injectBadge = function(){
    if(document.getElementById('monshiBadge'))return;
    var el = document.createElement('div');
    el.id='monshiBadge';
    el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;transition:all .2s;';
    el.onclick = function(){
      if(MONSHI.wallet){
        if(confirm('Disconnect wallet? You\\'ll lose your tier perks.'))MONSHI.disconnect();
      } else MONSHI.connectWallet();
    };
    document.body.appendChild(el);
    MONSHI.updateBadge();
    setInterval(function(){if(MONSHI.wallet)MONSHI.fetchBalance().then(MONSHI.updateBadge);},60000);
  };

  MONSHI.updateBadge = function(){
    var el = document.getElementById('monshiBadge');if(!el)return;
    if(!MONSHI.wallet){
      el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#22C55E,#15803D);color:#fff;padding:8px 14px;border-radius:8px;border:1px solid rgba(74,222,128,.5);box-shadow:0 0 12px rgba(34,197,94,.3);';
      el.textContent='🔌 CONNECT FOR PERKS';
    } else {
      var t=MONSHI.tier;
      el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;background:'+t.color+'22;color:'+t.color+';padding:8px 14px;border-radius:8px;border:1.5px solid '+t.color+';box-shadow:0 0 12px '+t.color+'66;';
      var balK=MONSHI.balance>=1e9?(MONSHI.balance/1e9).toFixed(1)+'B':MONSHI.balance>=1e6?(MONSHI.balance/1e6).toFixed(1)+'M':MONSHI.balance>=1e3?(MONSHI.balance/1e3).toFixed(0)+'K':Math.floor(MONSHI.balance);
      var nftBadge = MONSHI.hasNFT() ? ' 🎴×'+MONSHI.nftCount : '';
      var realMult = MONSHI.getMultiplier();
      el.innerHTML=t.emoji+nftBadge+' · '+balK+' · '+realMult+'x';
    }
  };

  // ── Show perks toast on connect ──
  MONSHI.showPerksToast = function(){
    var t = MONSHI.tier;
    var color = MONSHI.hasNFT() ? '#EC4899' : t.color;
    var emoji = MONSHI.hasNFT() ? '🎴' : t.emoji;
    var name = MONSHI.hasNFT() ? 'NFT HOLDER + '+t.name : t.name;
    var perks = MONSHI.hasNFT() ? (MONSHI.getMultiplier()+'x score · +'+MONSHI.getExtraLives()+' lives · pink badge · NFT auto-unlocks whale mode') : t.perks;
    var toast = document.createElement('div');
    toast.style.cssText='position:fixed;top:60px;right:8px;z-index:1000;background:rgba(0,0,8,.95);border:2px solid '+color+';border-radius:12px;padding:18px 24px;font-family:Orbitron,sans-serif;color:#fff;max-width:300px;animation:monshiSlide .4s ease;box-shadow:0 0 30px '+color+'88;';
    toast.innerHTML = '<div style="font-size:24px;text-align:center;margin-bottom:8px;">'+emoji+'</div>'+
      '<div style="font-size:18px;font-weight:900;letter-spacing:2px;color:'+color+';text-align:center;margin-bottom:8px;">'+name+' UNLOCKED</div>'+
      '<div style="font-size:11px;color:rgba(220,210,255,.8);text-align:center;line-height:1.5;letter-spacing:1px;">'+perks+'</div>';
    if(!document.getElementById('monshiKeyframes')){
      var s=document.createElement('style');s.id='monshiKeyframes';
      s.textContent='@keyframes monshiSlide{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(toast);
    setTimeout(function(){toast.style.transition='opacity .5s';toast.style.opacity='0';setTimeout(function(){toast.remove();},500);},5000);
  };

  // ── Public perks API (NFT BONUSES STACK ON TOP) ──
  MONSHI.hasNFT = function(){return MONSHI.nftCount > 0;};
  MONSHI.getNFTCount = function(){return MONSHI.nftCount;};
  // NFT adds +1.0 to multiplier (so Crab+NFT = 2.5x, Whale+NFT = 3.5x, Royalty+NFT = 4x)
  MONSHI.getMultiplier = function(){return MONSHI.tier.mult + (MONSHI.hasNFT()?1.0:0);};
  // NFT adds +2 extra lives on top
  MONSHI.getExtraLives = function(){return MONSHI.tier.lives + (MONSHI.hasNFT()?2:0);};
  MONSHI.isWhale = function(){return MONSHI.balance >= 1000000 || MONSHI.hasNFT();}; // NFT auto-unlocks whale mode
  MONSHI.isRoyalty = function(){return MONSHI.balance >= 10000000 || MONSHI.nftCount >= 3;}; // 3+ NFTs = royal mode
  MONSHI.boostScore = function(rawScore){return Math.floor(rawScore * MONSHI.getMultiplier());};
  MONSHI.getTierColor = function(){return MONSHI.hasNFT()?'#EC4899':MONSHI.tier.color;}; // NFT pink
  MONSHI.getTierEmoji = function(){return MONSHI.hasNFT()?'🎴':MONSHI.tier.emoji;};
  MONSHI.getTierName = function(){return MONSHI.hasNFT()?(MONSHI.tier.name+' + NFT'):MONSHI.tier.name;};

  // ── Visual: floating multiplier indicator on score events ──
  MONSHI.popMultiplier = function(x, y, baseScore){
    if(MONSHI.tier.mult <= 1)return;
    var pop = document.createElement('div');
    var boost = Math.floor(baseScore*(MONSHI.tier.mult-1));
    pop.style.cssText='position:fixed;left:'+x+'px;top:'+y+'px;color:'+MONSHI.tier.color+';font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;text-shadow:0 0 8px '+MONSHI.tier.color+';pointer-events:none;z-index:50;animation:monshiPop 1s ease-out forwards;letter-spacing:2px;';
    pop.textContent='+'+boost+' '+MONSHI.tier.mult+'x';
    if(!document.getElementById('monshiPopKeyframes')){
      var s=document.createElement('style');s.id='monshiPopKeyframes';
      s.textContent='@keyframes monshiPop{0%{transform:translateY(0) scale(1);opacity:1;}100%{transform:translateY(-60px) scale(1.4);opacity:0;}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(pop);
    setTimeout(function(){pop.remove();},1000);
  };

  function init(){
    MONSHI.injectBadge();
    if(MONSHI.wallet) MONSHI.fetchBalance().then(MONSHI.updateBadge);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
