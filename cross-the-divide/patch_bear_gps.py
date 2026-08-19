from pathlib import Path
p=Path('cross-the-divide/bear.js')
s=p.read_text()
old="async function getPos(fresh=false){let cached=cachedPos();if(!navigator.geolocation)return cached;if(!fresh&&cached&&Date.now()-(cached.saved||0)<10*60*1000)return cached;try{let p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:12000,maximumAge:fresh?0:300000}));return{lat:p.coords.latitude,lon:p.coords.longitude,cached:false,saved:Date.now()}}catch{return cached}}"
new="async function getPos(fresh=false){let cached=cachedPos(),recent=cached&&Date.now()-(cached.saved||0)<15*60*1000;if(!navigator.geolocation)return fresh?(recent?cached:null):cached;if(!fresh&&cached&&Date.now()-(cached.saved||0)<10*60*1000)return cached;try{let p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:12000,maximumAge:fresh?0:300000}));return{lat:p.coords.latitude,lon:p.coords.longitude,cached:false,saved:Date.now()}}catch{return fresh?(recent?cached:null):cached}}"
if old not in s: raise SystemExit('getPos marker not found')
p.write_text(s.replace(old,new,1))
print('bear report GPS safety patched')
