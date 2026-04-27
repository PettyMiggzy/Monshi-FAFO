// Floating prize banner - shown on every page during the prize event
(function(){
  var PRIZE_END = 1777545922591;
  if(Date.now() >= PRIZE_END) return; // Don't show if event ended
  if(window.location.pathname.indexOf('prize') >= 0) return; // Don't show on prize page itself
  
  function init(){
    if(document.getElementById('prizeBanner')) return;
    var b = document.createElement('a');
    b.id = 'prizeBanner';
    b.href = '/prize.html';
    b.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:97;background:linear-gradient(135deg,#FCD34D,#92400E);color:#fff;text-decoration:none;padding:10px 16px;border-radius:30px;font-family:Orbitron,sans-serif;font-size:11px;font-weight:900;letter-spacing:2px;box-shadow:0 0 24px rgba(252,211,77,.6);cursor:pointer;display:flex;align-items:center;gap:10px;animation:prizeBouncing 1.6s ease-in-out infinite;border:2px solid rgba(252,211,77,.4);';
    b.innerHTML = '<span style="font-size:18px;">🏆</span><div><div style="font-size:9px;opacity:.85;letter-spacing:2px;">600 MON PRIZE</div><div style="font-size:13px;letter-spacing:2px;" id="prizeBannerTime">--:--:--</div></div>';
    if(!document.getElementById('prizeBannerKf')){
      var s = document.createElement('style');s.id='prizeBannerKf';
      s.textContent = '@keyframes prizeBouncing{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(b);
    
    function tick(){
      var diff = PRIZE_END - Date.now();
      if(diff <= 0){b.remove();return;}
      var d = Math.floor(diff/86400000);
      var h = Math.floor((diff%86400000)/3600000);
      var m = Math.floor((diff%3600000)/60000);
      var s = Math.floor((diff%60000)/1000);
      var pad = function(n){return String(n).padStart(2,'0');};
      document.getElementById('prizeBannerTime').textContent = (d>0?d+'d ':'')+pad(h)+':'+pad(m)+':'+pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
