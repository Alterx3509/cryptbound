(()=>{
'use strict';
const BUILD='2026.08.18.1740';
let checking=false,lastCheck=0;
async function checkForUpdate(force=false){
  if(checking||!navigator.onLine)return;
  if(!force&&Date.now()-lastCheck<60000)return;
  checking=true;lastCheck=Date.now();
  try{
    const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)return;
    const v=await r.json();
    if(!v?.build||v.build===BUILD)return;
    try{const reg=await navigator.serviceWorker?.getRegistration?.();await reg?.update?.()}catch{}
    try{for(const k of await caches.keys())if(k.startsWith('ctd-shell-'))await caches.delete(k)}catch{}
    const u=new URL('./',location.href);u.searchParams.set('build',v.build);u.searchParams.set('t',Date.now());
    location.replace(u.href);
  }catch{}
  finally{checking=false}
}
window.addEventListener('online',()=>checkForUpdate(true));
window.addEventListener('focus',()=>checkForUpdate());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate(true)});
setTimeout(()=>checkForUpdate(true),1200);
setInterval(()=>checkForUpdate(),300000);
})();
