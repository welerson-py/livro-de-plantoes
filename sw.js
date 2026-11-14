/* Modo offline do Livro de Plantões.
   Guarda o app no aparelho na primeira abertura. Depois disso ele abre sem internet.
   Os dados (fichas e histórico) NÃO passam por aqui: ficam no armazenamento do navegador. */
var CACHE = 'livro-plantoes-v2';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'archivo.woff2', 'dm-mono-400.woff2', 'dm-mono-500.woff2',
             'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function put(req, res){
  if (res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
  return res;
}
function cached(req){
  return caches.match(req, {ignoreSearch:true}).then(function(hit){ return hit || caches.match('index.html'); });
}
/* página: tenta a rede (para pegar atualização), mas não espera mais de 2,5 s; sem rede usa o guardado */
function pageFirstNet(req){
  return new Promise(function(resolve){
    var done = false;
    function finish(r){ if (!done && r){ done = true; resolve(r); } }
    var timer = setTimeout(function(){ cached(req).then(finish); }, 2500);
    fetch(req).then(function(res){
      clearTimeout(timer);
      if (res && res.ok){ put(req, res); finish(res); }
      else cached(req).then(function(hit){ finish(hit || res); });
    }).catch(function(){
      clearTimeout(timer);
      cached(req).then(function(hit){ finish(hit || Response.error()); });
    });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  var isPage = req.mode === 'navigate' || /(\/|\.html|\.webmanifest|sw\.js)$/.test(url.pathname);
  if (isPage){ e.respondWith(pageFirstNet(req)); return; }
  /* fontes e ícones não mudam: usa o guardado e só busca se faltar */
  e.respondWith(caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(res){ return put(req, res); });
  }));
});
