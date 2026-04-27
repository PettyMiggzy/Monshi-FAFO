// Captures ?ref=0x... query param and saves it. When wallet connects, posts referral.
(function(){
  var SUPABASE_URL='https://cuqhqcmrgpdjlhyqztnc.supabase.co';
  var SUPABASE_KEY='sb_publishable_nu-E2mvgdQ0l1DsSsOswWA_ma2RbV4z';
  
  // Capture ref from URL on first load
  var params = new URLSearchParams(window.location.search);
  var refFromUrl = params.get('ref');
  if(refFromUrl && /^0x[a-f0-9]{40}$/i.test(refFromUrl)){
    if(!localStorage.getItem('monshi_referrer')){
      localStorage.setItem('monshi_referrer', refFromUrl.toLowerCase());
    }
  }
  
  // When wallet connects, register the referral
  function tryRegister(){
    if(!window.MONSHI || !MONSHI.wallet) return;
    var refWallet = localStorage.getItem('monshi_referrer');
    if(!refWallet) return;
    var myWallet = MONSHI.wallet.toLowerCase();
    if(refWallet === myWallet) return; // Can't refer yourself
    if(localStorage.getItem('monshi_ref_registered')) return;
    
    fetch(SUPABASE_URL+'/rest/v1/referrals',{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({
        referrer_wallet: refWallet,
        referred_wallet: myWallet,
        referrer_name: 'unknown'
      })
    }).then(function(r){
      if(r.status===201 || r.status===409){ // 409 = already exists, fine
        localStorage.setItem('monshi_ref_registered','1');
        if(r.status===201){
          // Show toast
          var t = document.createElement('div');
          t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:1001;background:linear-gradient(135deg,#22C55E,#15803D);color:#fff;padding:14px 22px;border-radius:14px;font-family:Orbitron,sans-serif;font-weight:900;letter-spacing:2px;font-size:12px;box-shadow:0 0 24px rgba(34,197,94,.5);';
          t.textContent = '🤝 RECRUITED BY '+refWallet.slice(0,6)+'...'+refWallet.slice(-4);
          document.body.appendChild(t);
          setTimeout(function(){t.style.transition='opacity .5s';t.style.opacity='0';setTimeout(function(){t.remove();},500);},3500);
        }
      }
    }).catch(function(){});
  }
  
  window.addEventListener('monshi:connect', function(){setTimeout(tryRegister, 800);});
  setTimeout(tryRegister, 2000); // Also try if already connected on load
})();
