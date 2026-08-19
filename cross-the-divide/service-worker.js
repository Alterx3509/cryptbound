const CACHE='ctd-shell-v11';
const SHELL=['./','./index.html','./manifest.json','./recover.html','./bear.js','./official-bear.js','./updater.js','./version.json'];
const SUNCALC='https://cdn.jsdelivr.net/npm/suncalc/+esm';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    for(const item of SHELL){
      try{
        const res=await fetch(item,{cache:'reload'});
        if(res.ok)await c.put(item,res.clone());
      }catch(e){}
    }
    try{
      const res=await fetch(SUNCALC,{cache:'reload'});
      if(res.ok)await c.put(SUNCALC,res.clone());
    }catch(e){}
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
        const freshReq=new Request(req,{cache:'no-store'});
        const res=await fetch(freshReq);
        if(res.ok)c.put(req,res.clone()).catch(()=>{});
        return res;
      }catch(e){
        return (await caches.match(req,{ignoreSearch:true})) || (req.mode==='navigate' ? caches.match('./index.html') : Promise.reject(e));
      }
    })());
    return;
  }
  if(url.hostname==='cdn.jsdelivr.net'){
    event.respondWith((async()=>{
      try{
        const res=await fetch(new Request(req,{cache:'no-store'}));
        if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}
        return res;
      }catch(e){
        const cached=await caches.match(req);
        if(cached)return cached;
        throw e;
      }
    })());
  }
});
