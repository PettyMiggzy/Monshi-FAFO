// Monshi Arcade — Achievements system (localStorage-based)
(function(){
  window.MONSHI_ACHIEVEMENTS = window.MONSHI_ACHIEVEMENTS || {};
  
  var BADGES = [
    { id:'first_play', emoji:'🎮', name:'FIRST GAME', desc:'Played your first game', check:function(s){return s.gamesPlayed>=1;} },
    { id:'tryhard',    emoji:'🏆', name:'TRYHARD',     desc:'Played 5 different games', check:function(s){return s.uniqueGames>=5;} },
    { id:'completionist',emoji:'💎',name:'COMPLETIONIST',desc:'Played all 24 games', check:function(s){return s.uniqueGames>=24;} },
    { id:'first_score',emoji:'⭐', name:'GETTING STARTED',desc:'Submitted first score', check:function(s){return s.scoresSubmitted>=1;} },
    { id:'climber',    emoji:'📈', name:'CLIMBING',    desc:'Made top 10 in any game', check:function(s){return s.bestRank<=10;} },
    { id:'top3',       emoji:'🥉', name:'PODIUM',      desc:'Made top 3 in any game', check:function(s){return s.bestRank<=3;} },
    { id:'champion',   emoji:'🥇', name:'CHAMPION',    desc:'Hit #1 in any game', check:function(s){return s.bestRank===1;} },
    { id:'addicted',   emoji:'🔥', name:'ADDICTED',    desc:'Played 50 total games', check:function(s){return s.gamesPlayed>=50;} },
    { id:'connected',  emoji:'🔌', name:'CONNECTED',   desc:'Connected your wallet', check:function(s){return !!s.wallet;} },
    { id:'crab',       emoji:'🦀', name:'CRAB',        desc:'Held 10K+ MONSHI', check:function(s){return s.maxBalance>=10000;} },
    { id:'dolphin',    emoji:'🐬', name:'DOLPHIN',     desc:'Held 100K+ MONSHI', check:function(s){return s.maxBalance>=100000;} },
    { id:'whale',      emoji:'🐋', name:'WHALE',       desc:'Held 1M+ MONSHI', check:function(s){return s.maxBalance>=1000000;} },
    { id:'royalty',    emoji:'👑', name:'ROYALTY',     desc:'Held 10M+ MONSHI', check:function(s){return s.maxBalance>=10000000;} }
  ];

  function getStats(){
    return {
      gamesPlayed: parseInt(localStorage.getItem('mon_gamesPlayed')||'0'),
      uniqueGames: JSON.parse(localStorage.getItem('mon_uniqueGames')||'[]').length,
      scoresSubmitted: parseInt(localStorage.getItem('mon_scoresSubmitted')||'0'),
      bestRank: parseInt(localStorage.getItem('mon_bestRank')||'9999'),
      wallet: localStorage.getItem('monshi_wallet'),
      maxBalance: parseFloat(localStorage.getItem('mon_maxBalance')||'0')
    };
  }
  
  MONSHI_ACHIEVEMENTS.trackPlay = function(gameKey){
    var n = parseInt(localStorage.getItem('mon_gamesPlayed')||'0')+1;
    localStorage.setItem('mon_gamesPlayed', n);
    var unique = JSON.parse(localStorage.getItem('mon_uniqueGames')||'[]');
    if(unique.indexOf(gameKey)<0){unique.push(gameKey);localStorage.setItem('mon_uniqueGames', JSON.stringify(unique));}
    MONSHI_ACHIEVEMENTS.checkUnlocks();
  };
  MONSHI_ACHIEVEMENTS.trackScore = function(rank){
    var n = parseInt(localStorage.getItem('mon_scoresSubmitted')||'0')+1;
    localStorage.setItem('mon_scoresSubmitted', n);
    var best = parseInt(localStorage.getItem('mon_bestRank')||'9999');
    if(rank>0 && rank<best) localStorage.setItem('mon_bestRank', rank);
    MONSHI_ACHIEVEMENTS.checkUnlocks();
  };
  MONSHI_ACHIEVEMENTS.trackBalance = function(bal){
    var max = parseFloat(localStorage.getItem('mon_maxBalance')||'0');
    if(bal>max) localStorage.setItem('mon_maxBalance', bal);
    MONSHI_ACHIEVEMENTS.checkUnlocks();
  };
  
  MONSHI_ACHIEVEMENTS.checkUnlocks = function(){
    var stats = getStats();
    var unlocked = JSON.parse(localStorage.getItem('mon_unlocks')||'[]');
    BADGES.forEach(function(b){
      if(unlocked.indexOf(b.id)>=0) return;
      if(b.check(stats)){
        unlocked.push(b.id);
        localStorage.setItem('mon_unlocks', JSON.stringify(unlocked));
        showUnlockToast(b);
      }
    });
  };
  
  function showUnlockToast(badge){
    var t = document.createElement('div');
    t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1001;background:linear-gradient(135deg,rgba(252,211,77,.95),rgba(180,83,9,.95));color:#fff;padding:16px 28px;border-radius:14px;font-family:Orbitron,sans-serif;font-weight:900;letter-spacing:2px;font-size:14px;box-shadow:0 0 30px rgba(252,211,77,.6);display:flex;gap:14px;align-items:center;animation:achPop .5s ease;';
    t.innerHTML = '<div style="font-size:32px;">'+badge.emoji+'</div><div><div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,.8);">ACHIEVEMENT UNLOCKED</div><div style="font-size:14px;">'+badge.name+'</div></div>';
    if(!document.getElementById('achKf')){var s=document.createElement('style');s.id='achKf';s.textContent='@keyframes achPop{from{transform:translate(-50%,40px);opacity:0;}to{transform:translate(-50%,0);opacity:1;}}';document.head.appendChild(s);}
    document.body.appendChild(t);
    setTimeout(function(){t.style.transition='opacity .5s';t.style.opacity='0';setTimeout(function(){t.remove();},500);},3500);
  }
  
  MONSHI_ACHIEVEMENTS.getUnlocked = function(){return JSON.parse(localStorage.getItem('mon_unlocks')||'[]');};
  MONSHI_ACHIEVEMENTS.getAllBadges = function(){return BADGES;};
  
  // Auto-track wallet balance on load
  setTimeout(function(){
    if(window.MONSHI && window.MONSHI.balance){
      MONSHI_ACHIEVEMENTS.trackBalance(window.MONSHI.balance);
    }
  }, 2000);
})();
