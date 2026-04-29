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
  // Detect mobile: no window.ethereum + touch device
  function isMobileNoWallet(){
    return !window.ethereum && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  function isInWalletBrowser(){
    // Heuristic: window.ethereum exists AND on mobile = we're in MetaMask/Rabby/etc browser
    return !!window.ethereum && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // Build a wallet deeplink: each mobile wallet has its own scheme that opens
  // their in-app browser at the given URL, where window.ethereum WILL be injected.
  function getWalletDeeplinks(){
    var url = window.location.href;
    var host = window.location.host + window.location.pathname + window.location.search;
    return [
      { name: 'MetaMask',  url: 'https://metamask.app.link/dapp/' + host, icon: '🦊' },
      { name: 'Rabby',     url: 'https://rabby.io/wallet?dapp=' + encodeURIComponent(url), icon: '🐰' },
      { name: 'Trust',     url: 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(url), icon: '🛡️' },
      { name: 'Coinbase',  url: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(url), icon: '🅒' }
    ];
  }

  // Show a mobile-friendly modal listing deeplinks instead of the alert()
  function showMobileWalletPicker(){
    // Remove any existing
    var old = document.getElementById('monshi-wallet-modal');
    if(old) old.remove();

    var deeplinks = getWalletDeeplinks();
    var modal = document.createElement('div');
    modal.id = 'monshi-wallet-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,8,.92);z-index:99998;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px);';

    var card = document.createElement('div');
    card.style.cssText = 'background:linear-gradient(135deg,rgba(168,85,247,.18),rgba(20,5,50,.96));border:1.5px solid rgba(168,85,247,.5);border-top-left-radius:20px;border-top-right-radius:20px;padding:24px 20px 36px;width:100%;max-width:560px;color:#fff;font-family:Orbitron,sans-serif;animation:monshiSlideUp .25s ease;';

    var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div style="font-size:14px;letter-spacing:3px;font-weight:900;color:#FCD34D;">CONNECT WALLET</div>' +
      '<button id="monshi-wallet-close" style="background:rgba(0,0,0,.5);border:1px solid rgba(168,85,247,.4);color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div style="font-size:11px;color:rgba(196,181,253,.85);letter-spacing:1px;margin-bottom:18px;line-height:1.55;">Tap a wallet to open it. Once inside the wallet\'s browser, this site will load again with connect support.</div>';

    var buttons = deeplinks.map(function(w){
      return '<a href="' + w.url + '" style="display:flex;align-items:center;gap:14px;background:rgba(0,0,0,.45);border:1.5px solid rgba(168,85,247,.4);border-radius:12px;padding:14px 18px;margin-bottom:8px;color:#fff;text-decoration:none;font-family:Orbitron,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;">' +
        '<span style="font-size:24px;">' + w.icon + '</span>' +
        '<span>' + w.name + '</span>' +
        '<span style="margin-left:auto;color:rgba(196,181,253,.6);font-size:11px;">→</span>' +
        '</a>';
    }).join('');

    var hint = '<div style="margin-top:14px;font-size:10px;color:rgba(167,139,250,.55);letter-spacing:1px;line-height:1.6;text-align:center;">Don\'t have one? Install MetaMask or Rabby from the App Store / Google Play first, then come back.</div>';

    card.innerHTML = head + buttons + hint;
    modal.appendChild(card);
    document.body.appendChild(modal);

    // Inject animation if not already
    if(!document.getElementById('monshi-wallet-modal-anim')){
      var s = document.createElement('style');
      s.id = 'monshi-wallet-modal-anim';
      s.textContent = '@keyframes monshiSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}';
      document.head.appendChild(s);
    }

    document.getElementById('monshi-wallet-close').onclick = function(){modal.remove();};
    modal.onclick = function(e){if(e.target===modal)modal.remove();};
  }

  MONSHI.connectWallet = async function(){
    if(!window.ethereum){
      // Mobile + no injected provider: show deeplink picker
      if(isMobileNoWallet()){
        showMobileWalletPicker();
        return null;
      }
      // Desktop: just alert
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

  // Fetch the user's first owned NFT's image (uses OpenSea API)
  MONSHI.fetchNFTImage = async function(){
    if(!MONSHI.wallet) return null;
    if(!MONSHI.hasNFT()) return null;
    var cached = localStorage.getItem('monshi_nft_image');
    if(cached) return cached;
    try{
      // Use server-side /api/nft-check proxy (OpenSea v2 requires API key)
      var r = await fetch('/api/nft-check?wallet='+MONSHI.wallet);
      if(!r.ok) throw new Error('nft proxy '+r.status);
      var data = await r.json();
      if(data.firstImage){
        localStorage.setItem('monshi_nft_image', data.firstImage);
        if(data.items && data.items[0]){
          localStorage.setItem('monshi_nft_id', data.items[0].id || '');
          localStorage.setItem('monshi_nft_name', data.items[0].name || '');
        }
        localStorage.setItem('monshi_nft_count', String(data.count||0));
        return data.firstImage;
      }
      // No NFTs but call succeeded — cache 0 count
      localStorage.setItem('monshi_nft_count', '0');
    }catch(e){console.log('nft image err',e);}
    return null;
  };
  
  MONSHI.getNFTImage = function(){return localStorage.getItem('monshi_nft_image')||null;};
  MONSHI.getNFTName = function(){return localStorage.getItem('monshi_nft_name')||'';};
  
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
        if(confirm('Disconnect wallet? You\'ll lose your tier perks.'))MONSHI.disconnect();
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
      var color = MONSHI.hasNFT() ? '#EC4899' : t.color;
      el.style.cssText='position:fixed;top:8px;right:8px;z-index:99;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;font-weight:700;cursor:pointer;background:'+color+'22;color:'+color+';padding:6px 14px 6px 6px;border-radius:24px;border:1.5px solid '+color+';box-shadow:0 0 12px '+color+'66;display:flex;align-items:center;gap:8px;';
      var balK=MONSHI.balance>=1e9?(MONSHI.balance/1e9).toFixed(1)+'B':MONSHI.balance>=1e6?(MONSHI.balance/1e6).toFixed(1)+'M':MONSHI.balance>=1e3?(MONSHI.balance/1e3).toFixed(0)+'K':Math.floor(MONSHI.balance);
      var realMult = MONSHI.getMultiplier();
      var pfp = MONSHI.getNFTImage();
      var avatar = pfp ? '<img src="'+pfp+'" style="width:28px;height:28px;border-radius:50%;border:1.5px solid '+color+';object-fit:cover;" alt="">' : '<span style="font-size:18px;line-height:1;">'+(MONSHI.hasNFT()?'🎴':t.emoji)+'</span>';
      var nftCnt = MONSHI.hasNFT() ? ' 🎴×'+MONSHI.nftCount : '';
      el.innerHTML = avatar+'<span>'+t.name+nftCnt+' · '+realMult+'x</span>';
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

  // ── Referral system ──
  MONSHI.getRefCode = function(){
    var code = localStorage.getItem('monshi_refcode');
    if(!code){
      // Generate a 6-char code if user has wallet, else random
      if(MONSHI.wallet){
        code = MONSHI.wallet.slice(2,8).toUpperCase();
      } else {
        code = Math.random().toString(36).slice(2,8).toUpperCase();
      }
      localStorage.setItem('monshi_refcode', code);
    }
    return code;
  };
  MONSHI.getRefLink = function(){return 'https://monshi-fafo.vercel.app?ref='+MONSHI.getRefCode();};
  MONSHI.checkInboundRef = function(){
    var url = new URL(window.location.href);
    var ref = url.searchParams.get('ref');
    if(ref && !localStorage.getItem('monshi_referredBy')){
      localStorage.setItem('monshi_referredBy', ref.toUpperCase().slice(0,8));
      // Notify visually
      var t = document.createElement('div');
      t.style.cssText='position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,#22C55E,#15803D);color:#fff;padding:12px 24px;border-radius:10px;font-family:Orbitron,sans-serif;font-weight:900;letter-spacing:2px;font-size:11px;box-shadow:0 0 30px rgba(74,222,128,.5);';
      t.innerHTML='🤝 INVITED BY '+ref.toUpperCase();
      document.body.appendChild(t);
      setTimeout(function(){t.style.transition='opacity .5s';t.style.opacity='0';setTimeout(function(){t.remove();},500);},4000);
    }
  };

  function init(){
    MONSHI.injectBadge();
    MONSHI.checkInboundRef();
    if(MONSHI.wallet) MONSHI.fetchBalance().then(function(){
      MONSHI.updateBadge();
      if(MONSHI.hasNFT()) MONSHI.fetchNFTImage();
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
