from pathlib import Path
import re

p=Path('cross-the-divide/index.html')
s=p.read_text()

# Add a visible build marker in the footer.
s=s.replace(
    '<footer>Weather: Open-Meteo · Tides: NOAA CO-OPS predictions · Fish counts &amp; regulations: Alaska Department of Fish &amp; Game · Sun &amp; moon: SunCalc</footer>',
    '<footer>Weather: Open-Meteo · Tides: NOAA CO-OPS predictions · Fish counts &amp; regulations: Alaska Department of Fish &amp; Game · Sun &amp; moon: SunCalc<br><span style="color:#9299a3">Build 2026.08.16.1308</span></footer>'
)

old_store="""function storeEvent(rec){let text=String(rec?.text||'').trim().slice(0,240);if(!text)return false;let clean={text,updated_at:rec?.updated_at||new Date().toISOString()};let cur=eventRecord();if(cur&&eventTime(cur)>eventTime(clean))return false;localStorage.setItem(EVENT_KEY,JSON.stringify(clean));renderEvent(clean);return true}
function renderEvent(rec=eventRecord()){let text=String(rec?.text||'').trim();$('eventBanner').hidden=!text;$('eventText').textContent=text;if(!text)return;let d=rec?.updated_at?new Date(rec.updated_at):null;$('eventMeta').textContent=d&&!isNaN(d)?'Group update · '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d):'Group update'}
function eventFromMessage(msg){if(msg?.event!=='message'||!msg.message)return;try{let rec=JSON.parse(msg.message);if(rec?.type==='ctd_event'&&rec?.text!=='transport diagnostic')storeEvent(rec)}catch{}}"""
new_store="""function storeEvent(rec){let text=String(rec?.text||'').trim().slice(0,240);if(!text)return false;let clean={text,updated_at:rec?.updated_at||new Date().toISOString(),id:rec?.id||null,synced:rec?.synced};let cur=eventRecord();if(cur&&eventTime(cur)>eventTime(clean))return false;localStorage.setItem(EVENT_KEY,JSON.stringify(clean));renderEvent(clean);return true}
function renderEvent(rec=eventRecord()){let text=String(rec?.text||'').trim();$('eventBanner').hidden=!text;$('eventText').textContent=text;if(!text)return;let d=rec?.updated_at?new Date(rec.updated_at):null,base=d&&!isNaN(d)?'Group update · '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d):'Group update',suffix=rec?.synced===true?' · ✓ PUSHED TO GROUP':rec?.synced===false?' · LOCAL ONLY — NOT CONFIRMED':'';$('eventMeta').textContent=base+suffix;$('eventMeta').style.color=rec?.synced===true?'#75cf98':rec?.synced===false?'#e4c77f':''}
function eventFromMessage(msg){if(msg?.event!=='message'||!msg.message)return;try{let rec=JSON.parse(msg.message);if(rec?.type==='ctd_event'&&rec?.text!=='transport diagnostic')storeEvent({...rec,synced:true})}catch{}}"""
if old_store not in s:
    raise SystemExit('event store block not found')
s=s.replace(old_store,new_store)

marker="async function publishGroupEvent(rec)"
verify="""async function verifyGroupEvent(rec){if(!navigator.onLine)return false;try{let r=await fetch(`${EVENT_URL}/json?poll=1&since=15m`,{cache:'no-store'});if(!r.ok)return false;let body=await r.text();for(let line of body.split(String.fromCharCode(10))){line=line.trim();if(!line)continue;try{let msg=JSON.parse(line);if(msg?.event!=='message'||!msg.message)continue;let got=JSON.parse(msg.message);if(got?.type!=='ctd_event')continue;if(rec.id&&got.id===rec.id)return true;if(got.updated_at===rec.updated_at&&got.text===rec.text)return true}catch{}}}catch{}return false}
"""
if marker not in s:
    raise SystemExit('publish marker not found')
s=s.replace(marker,verify+marker,1)

pattern=r"async function saveEvent\(\)\{.*?\}\nconst W="
new_save="""async function saveEvent(){let text=$('eventInput').value.trim().slice(0,240);if(!text)return $('eventInput').focus();let rec={type:'ctd_event',id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,text,updated_at:new Date().toISOString(),synced:false};storeEvent(rec);closeEventEditor();let btn=$('saveEvent'),old=btn.textContent;btn.disabled=true;btn.textContent='PUSHING…';try{await publishGroupEvent(rec);await new Promise(r=>setTimeout(r,700));let confirmed=await verifyGroupEvent(rec);if(confirmed){storeEvent({...rec,synced:true});btn.textContent='✓ PUSHED TO GROUP'}else{storeEvent({...rec,synced:false});btn.textContent='NOT CONFIRMED';alert('Saved on this phone, but group delivery was not confirmed. The event is local only until a later push succeeds.')}}catch(e){storeEvent({...rec,synced:false});btn.textContent='NOT CONFIRMED';alert('Saved on this phone, but group delivery was not confirmed. The event is local only until a later push succeeds.')}finally{setTimeout(()=>{btn.disabled=false;btn.textContent=old},1800)}}
const W="""
s,n=re.subn(pattern,lambda m:new_save,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit('saveEvent block not found')

p.write_text(s)
a=s.index('<script type="module">')+len('<script type="module">')
b=s.index('</script>',a)
Path('/tmp/ctd.mjs').write_text(s[a:b])
print('patched event verification + build marker')
