/* Garde l'app disponible hors ligne (les données viennent du cache Firestore).
   Réseau d'abord ; sans réseau, la dernière copie. Les pages (navigation) ne
   reçoivent aucune option de fetch : Android refuse une Request "navigate" modifiée. */
const C="dago-gerant-v25",F=["./","index.html","app.js","fbx.min.js","config.js","manifest.webmanifest","icon-192.png","icon-512.png","icone-dago.svg","logo-sombre.svg","Inter.woff2","inter-tight-latin-700-normal.woff2","inter-tight-latin-800-normal.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(f=>c.add(new Request(f,{cache:"reload"})).catch(()=>{})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(u.origin!==location.origin||r.method!=="GET")return;
 const net=r.mode==="navigate"?fetch(r):fetch(new Request(r.url,{cache:"no-store",credentials:"same-origin"}));
 e.respondWith(net.then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{})}return res})
  .catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match("index.html")).then(x=>x||new Response("Hors ligne : ouvrez l'app une fois avec internet.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}}))))});
