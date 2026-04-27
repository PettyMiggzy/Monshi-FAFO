// Monshi Arcade PWA install prompt
(function(){
  // Register service worker
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js').catch(function(e){console.log('SW reg failed',e);});
    });
  }
  
  // Capture beforeinstallprompt event (Chrome/Android)
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(showInstallPrompt, 5000); // Wait 5sec before nudging
  });
  
  // iOS detection (no beforeinstallprompt support)
  function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;}
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;}
  
  function showInstallPrompt(){
    if(isStandalone()) return;
    if(localStorage.getItem('monshi_pwa_dismissed')) return;
    if(document.getElementById('pwaPrompt')) return;
    
    var p = document.createElement('div');
    p.id = 'pwaPrompt';
    p.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:998;background:rgba(20,5,50,.95);border:1.5px solid rgba(168,85,247,.6);border-radius:16px;padding:16px 20px;max-width:340px;width:calc(100% - 40px);box-shadow:0 0 30px rgba(168,85,247,.4);font-family:Orbitron,sans-serif;color:#fff;backdrop-filter:blur(10px);animation:pwaSlide .4s ease;';
    p.innerHTML = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><img src="/favicon.png" style="width:40px;height:40px;border-radius:10px;border:1px solid rgba(168,85,247,.5);"><div><div style="font-size:13px;font-weight:900;letter-spacing:2px;color:#A855F7;">INSTALL MONSHI</div><div style="font-size:10px;color:rgba(196,181,253,.7);letter-spacing:1px;font-family:Space Mono,monospace;">Get the app · Faster + offline</div></div></div><div style="display:flex;gap:8px;">'+
      '<button id="pwaInstallBtn" style="flex:1;padding:10px;background:linear-gradient(135deg,#A855F7,#7C3AED);color:#fff;border:none;border-radius:8px;font-family:Orbitron,sans-serif;font-size:11px;font-weight:900;letter-spacing:2px;cursor:pointer;">INSTALL</button>'+
      '<button id="pwaDismissBtn" style="padding:10px 14px;background:rgba(0,0,0,.4);color:rgba(196,181,253,.6);border:1px solid rgba(139,92,246,.3);border-radius:8px;font-family:Space Mono,monospace;font-size:11px;cursor:pointer;">LATER</button>'+
    '</div>';
    
    if(!document.getElementById('pwaKf')){
      var s = document.createElement('style');s.id='pwaKf';
      s.textContent = '@keyframes pwaSlide{from{transform:translate(-50%,40px);opacity:0;}to{transform:translate(-50%,0);opacity:1;}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(p);
    
    document.getElementById('pwaInstallBtn').onclick = function(){
      if(deferredPrompt){
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(){
          deferredPrompt = null;
          p.remove();
        });
      } else if(isIOS()){
        // iOS instructions modal
        showIOSPrompt();
        p.remove();
      }
    };
    document.getElementById('pwaDismissBtn').onclick = function(){
      localStorage.setItem('monshi_pwa_dismissed', Date.now());
      p.remove();
    };
  }
  
  function showIOSPrompt(){
    var m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,8,.95);display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = '<div style="max-width:400px;background:rgba(20,5,50,.95);border:2px solid rgba(168,85,247,.6);border-radius:18px;padding:28px;text-align:center;font-family:Orbitron,sans-serif;color:#fff;">'+
      '<img src="/favicon.png" style="width:60px;height:60px;border-radius:14px;margin-bottom:14px;">'+
      '<div style="font-size:18px;font-weight:900;letter-spacing:2px;margin-bottom:18px;color:#A855F7;">INSTALL ON IOS</div>'+
      '<div style="font-family:Space Mono,monospace;font-size:13px;color:rgba(220,210,255,.85);line-height:1.6;text-align:left;background:rgba(0,0,0,.3);padding:16px;border-radius:10px;margin-bottom:18px;">'+
        '<b style="color:#FCD34D;">1.</b> Tap the share button <span style="font-size:18px;">⬆️</span> at the bottom of Safari<br><br>'+
        '<b style="color:#FCD34D;">2.</b> Scroll down and tap <b>"Add to Home Screen"</b><br><br>'+
        '<b style="color:#FCD34D;">3.</b> Tap <b>"Add"</b> in the top right'+
      '</div>'+
      '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:linear-gradient(135deg,#A855F7,#7C3AED);color:#fff;border:none;border-radius:10px;font-family:Orbitron,sans-serif;font-size:12px;font-weight:900;letter-spacing:2px;cursor:pointer;">GOT IT</button>'+
      '</div>';
    document.body.appendChild(m);
  }
  
  // For iOS users, show install prompt after 8 sec
  if(isIOS() && !isStandalone() && !localStorage.getItem('monshi_pwa_dismissed')){
    setTimeout(function(){
      if(!document.getElementById('pwaPrompt')){
        // Show simplified iOS prompt
        var p = document.createElement('div');
        p.id = 'pwaPrompt';
        p.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:998;background:rgba(20,5,50,.95);border:1.5px solid rgba(168,85,247,.6);border-radius:16px;padding:16px 20px;max-width:340px;width:calc(100% - 40px);box-shadow:0 0 30px rgba(168,85,247,.4);font-family:Orbitron,sans-serif;color:#fff;backdrop-filter:blur(10px);';
        p.innerHTML = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><img src="/favicon.png" style="width:40px;height:40px;border-radius:10px;border:1px solid rgba(168,85,247,.5);"><div><div style="font-size:13px;font-weight:900;letter-spacing:2px;color:#A855F7;">INSTALL MONSHI</div><div style="font-size:10px;color:rgba(196,181,253,.7);letter-spacing:1px;font-family:Space Mono,monospace;">Get the app on your home screen</div></div></div><div style="display:flex;gap:8px;">'+
          '<button id="pwaInstallBtn" style="flex:1;padding:10px;background:linear-gradient(135deg,#A855F7,#7C3AED);color:#fff;border:none;border-radius:8px;font-family:Orbitron,sans-serif;font-size:11px;font-weight:900;letter-spacing:2px;cursor:pointer;">HOW</button>'+
          '<button id="pwaDismissBtn" style="padding:10px 14px;background:rgba(0,0,0,.4);color:rgba(196,181,253,.6);border:1px solid rgba(139,92,246,.3);border-radius:8px;font-family:Space Mono,monospace;font-size:11px;cursor:pointer;">LATER</button>'+
        '</div>';
        document.body.appendChild(p);
        document.getElementById('pwaInstallBtn').onclick = function(){showIOSPrompt();p.remove();};
        document.getElementById('pwaDismissBtn').onclick = function(){localStorage.setItem('monshi_pwa_dismissed', Date.now());p.remove();};
      }
    }, 8000);
  }
})();
