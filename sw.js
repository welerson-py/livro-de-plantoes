/* Modo offline: guarda o app no aparelho na primeira abertura. */
var CACHE = 'livro-plantoes-v1';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  /* fontes do Google: usa a guardada, busca na rede só na primeira vez */
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(function(c){
      return c.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){ c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  /* app: tenta a rede (pega atualização), sem internet usa o guardado */
  e.respondWith(fetch(req).then(function(res){
    var copy = res.clone();
    caches.open(CACHE).then(function(c){ c.put(req, copy); });
    return res;
  }).catch(function(){
    return caches.match(req).then(function(hit){ return hit || caches.match('index.html'); });
  }));
});
