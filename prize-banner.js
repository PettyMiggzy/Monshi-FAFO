// Floating prize banner with 2-phase: build-up (STARTS IN) → live (ENDS IN)
(function(){
  var PRIZE_START = 1777373655508;
  var PRIZE_END = 1777546455508;
  if(Date.now() >= PRIZE_END) return;
  if(window.location.pathname.indexOf('prize') >= 0) return;
  
  function init(){
    if(document.getElementById('prizeBanner')) return;
    var b = document.createElement('a');
    b.id = 'prizeBanner';
    b.href = '/prize.html';
    b.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:97;background:linear-gradient(135deg,#FCD34D,#92400E);color:#fff;text-decoration:none;padding:10px 16px;border-radius:30px;font-family:Orbitron,sans-serif;font-size:11px;font-weight:900;letter-spacing:2px;box-shadow:0 0 24px rgba(252,211,77,.6);cursor:pointer;display:flex;align-items:center;gap:10px;animation:prizeBouncing 1.6s ease-in-out infinite;border:2px solid rgba(252,211,77,.4);';
    b.innerHTML = '<span style="font-size:18px;">🏆</span><div><div style="font-size:9px;opacity:.85;letter-spacing:2px;" id="prizeBannerLbl">600 MON · STARTS IN</div><div style="font-size:13px;letter-spacing:2px;" id="prizeBannerTime">--:--:--</div></div>';
    if(!document.getElementById('prizeBannerKf')){
      var s = document.createElement('style');s.id='prizeBannerKf';
      s.textContent = '@keyframes prizeBouncing{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(b);
    
    function tick(){
      var now = Date.now();
      var lbl = document.getElementById('prizeBannerLbl');
      var tm = document.getElementById('prizeBannerTime');
      if(!lbl || !tm) return;
      var target, label;
      if(now < PRIZE_START){
        target = PRIZE_START - now;
        label = '600 MON · STARTS IN';
      } else if(now < PRIZE_END){
        target = PRIZE_END - now;
        label = '🟢 LIVE · ENDS IN';
        b.style.background = 'linear-gradient(135deg,#22C55E,#15803D)';
        b.style.borderColor = 'rgba(74,222,128,.5)';
      } else {
        b.remove(); return;
      }
      var d = Math.floor(target/86400000);
      var h = Math.floor((target%86400000)/3600000);
      var m = Math.floor((target%3600000)/60000);
      var s = Math.floor((target%60000)/1000);
      var pad = function(n){return String(n).padStart(2,'0');};
      lbl.textContent = label;
      tm.textContent = (d>0?d+'d ':'')+pad(h)+':'+pad(m)+':'+pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
