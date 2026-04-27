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
    // Play unlock sound
    try{
      var ac = window.AudioContext || window.webkitAudioContext;
      if(ac){
        var ctx = new ac();
        [523,659,784,1046,1318].forEach(function(f,i){
          var o=ctx.createOscillator(),g=ctx.createGain();
          o.type='square';o.frequency.setValueAtTime(f, ctx.currentTime+i*0.06);
          g.gain.setValueAtTime(0, ctx.currentTime+i*0.06);
          g.gain.linearRampToValueAtTime(0.15, ctx.currentTime+i*0.06+0.01);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.06+0.15);
          o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime+i*0.06); o.stop(ctx.currentTime+i*0.06+0.2);
        });
      }
    }catch(e){}
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

// ── Streak system: count consecutive days played ──
(function(){
  if(!window.MONSHI_ACHIEVEMENTS) return;
  
  function todayKey(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function yesterdayKey(){var d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  
  MONSHI_ACHIEVEMENTS.checkStreak = function(){
    var today = todayKey();
    var lastPlay = localStorage.getItem('mon_lastPlay');
    if(lastPlay === today) return parseInt(localStorage.getItem('mon_streak')||'1');
    
    var streak = parseInt(localStorage.getItem('mon_streak')||'0');
    if(lastPlay === yesterdayKey()){
      streak++;
    } else if(!lastPlay){
      streak = 1;
    } else {
      streak = 1; // broke streak, restart
    }
    localStorage.setItem('mon_streak', streak);
    localStorage.setItem('mon_lastPlay', today);
    
    var bestStreak = parseInt(localStorage.getItem('mon_bestStreak')||'0');
    if(streak > bestStreak) localStorage.setItem('mon_bestStreak', streak);
    
    if(streak===2 || streak===3 || streak===7 || streak===14 || streak===30){
      showStreakToast(streak);
    }
    return streak;
  };
  
  MONSHI_ACHIEVEMENTS.getStreak = function(){return parseInt(localStorage.getItem('mon_streak')||'0');};
  MONSHI_ACHIEVEMENTS.getBestStreak = function(){return parseInt(localStorage.getItem('mon_bestStreak')||'0');};
  
  function showStreakToast(s){
    var t = document.createElement('div');
    t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:1001;background:linear-gradient(135deg,rgba(239,68,68,.95),rgba(239,68,68,.7));color:#fff;padding:14px 26px;border-radius:14px;font-family:Orbitron,sans-serif;font-weight:900;letter-spacing:2px;font-size:13px;box-shadow:0 0 30px rgba(239,68,68,.6);display:flex;gap:12px;align-items:center;animation:achPop .5s ease;';
    t.innerHTML = '<div style="font-size:28px;">🔥</div><div><div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,.8);">DAILY STREAK</div><div style="font-size:14px;">'+s+' DAYS IN A ROW</div></div>';
    document.body.appendChild(t);
    setTimeout(function(){t.style.transition='opacity .5s';t.style.opacity='0';setTimeout(function(){t.remove();},500);},3500);
  }
  
  // Auto-track on every page load
  setTimeout(MONSHI_ACHIEVEMENTS.checkStreak, 1500);
})();
