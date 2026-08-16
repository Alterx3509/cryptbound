const CACHE='ctd-shell-v7';
const SHELL=['./','./index.html','./manifest.json'];
const SUNCALC='https://cdn.jsdelivr.net/npm/suncalc/+esm';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(SHELL);
    try{await c.add(SUNCALC)}catch(e){}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname==='raw.githubusercontent.com')return;
  if(url.origin===location.origin){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{
        const res=await fetch(req);
        if(res.ok)c.put(req,res.clone()).catch(()=>{});
        return res;
      }catch(e){
        return (await caches.match(req)) || (req.mode==='navigate' ? caches.match('./index.html') : Promise.reject(e));
      }
    })());
    return;
  }
  if(url.hostname==='cdn.jsdelivr.net'){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      if(cached)return cached;
      const res=await fetch(req);
      const c=await caches.open(CACHE);
      c.put(req,res.clone()).catch(()=>{});
      return res;
    })());
  }
});
