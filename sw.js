// Monshi Arcade Service Worker v2 — bump for WalletConnect rollout
var CACHE = 'monshi-v2';
var STATIC = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/monshi-shared.js',
  '/achievements.js',
  '/prize-banner.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(STATIC).catch(function(){});}));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

// Network-first for HTML, cache-first for assets
self.addEventListener('fetch', function(e){
  var url = e.request.url;
  // Don't cache API calls or external requests
  if(url.indexOf('/api/') > 0 || url.indexOf('supabase') > 0 || url.indexOf('opensea') > 0 || url.indexOf('dexscreener') > 0 || url.indexOf('nadapp') > 0){
    return; // let it pass through normally
  }
  if(e.request.method !== 'GET') return;
  
  // HTML: network-first, fallback to cache
  if(e.request.headers.get('accept') && e.request.headers.get('accept').indexOf('text/html') >= 0){
    e.respondWith(
      fetch(e.request).then(function(r){
        var copy = r.clone();
        caches.open(CACHE).then(function(c){c.put(e.request, copy).catch(function(){});});
        return r;
      }).catch(function(){return caches.match(e.request);})
    );
    return;
  }
  
  // JS files: network-first too (so code updates ship without cache invalidation)
  if(url.indexOf('.js') > 0 && url.indexOf(self.location.origin) === 0){
    e.respondWith(
      fetch(e.request).then(function(r){
        if(r.status === 200){
          var copy = r.clone();
          caches.open(CACHE).then(function(c){c.put(e.request, copy).catch(function(){});});
        }
        return r;
      }).catch(function(){return caches.match(e.request);})
    );
    return;
  }
  
  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(r){
        if(r.status === 200){
          var copy = r.clone();
          caches.open(CACHE).then(function(c){c.put(e.request, copy).catch(function(){});});
        }
        return r;
      }).catch(function(){return cached;});
    })
  );
});
