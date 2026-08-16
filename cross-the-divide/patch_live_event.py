from pathlib import Path
import re

p = Path('cross-the-divide/index.html')
s = p.read_text()

s, n = re.subn(
    r'<section class="eventSetter"><button id="setEvent".*?</section>',
    '<section class="eventSetter"><button id="setEvent" type="button">PUSH EVENT OF THE DAY</button><div class="fishnote">Intended for the group leader. Saving pushes the replacement event to everyone who has Cross the Divide open; phones catch up when they reopen online and keep the last event offline.</div></section>',
    s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('event setter marker not found')

old_modal = '<div class="modal" id="eventModal" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="eventDialogTitle"><p class="kicker">GROUP LEADER</p><h2 id="eventDialogTitle">Event of the day</h2><textarea id="eventInput" maxlength="240" placeholder="Example: Russian River at 0600. Wheels roll 0515. Bring waders and lunch."></textarea><div class="sheetActions"><button class="cancel" id="cancelEvent" type="button">CANCEL</button><button class="save" id="saveEvent" type="button">SAVE &amp; SHARE</button></div><div class="sheetHint">Saving replaces the previous event on this phone. The Share sheet sends a Cross the Divide link that replaces it for anyone who opens the link.</div></div></div>'
new_modal = '<div class="modal" id="eventModal" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="eventDialogTitle"><p class="kicker">GROUP LEADER</p><h2 id="eventDialogTitle">Event of the day</h2><textarea id="eventInput" maxlength="240" placeholder="Example: Russian River at 0600. Wheels roll 0515. Bring waders and lunch."></textarea><div class="sheetActions"><button class="cancel" id="cancelEvent" type="button">CANCEL</button><button class="save" id="saveEvent" type="button">PUSH TO GROUP</button></div><div class="sheetHint">The new entry replaces the old Event of the Day. Open group apps update automatically; the latest event is stored on each phone for offline use.</div></div></div>'
if old_modal not in s:
    raise SystemExit('event modal marker not found')
s = s.replace(old_modal, new_modal, 1)

event_js = r'''const EVENT_KEY='ctd_event_v2';
const EVENT_TOPIC='ctd-GC5u9SeY2eNe1OWNd5jzq9';
const EVENT_URL=`https://ntfy.sh/${EVENT_TOPIC}`;
let eventStream=null,eventReconnect=null;
function eventRecord(){try{return JSON.parse(localStorage.getItem(EVENT_KEY)||'null')}catch{return null}}
function eventTime(rec){let t=Date.parse(rec?.updated_at||0);return Number.isFinite(t)?t:0}
function storeEvent(rec){let text=String(rec?.text||'').trim().slice(0,240);if(!text)return false;let clean={text,updated_at:rec?.updated_at||new Date().toISOString()};let cur=eventRecord();if(cur&&eventTime(cur)>eventTime(clean))return false;localStorage.setItem(EVENT_KEY,JSON.stringify(clean));renderEvent(clean);return true}
function renderEvent(rec=eventRecord()){let text=String(rec?.text||'').trim();$('eventBanner').hidden=!text;$('eventText').textContent=text;if(!text)return;let d=rec?.updated_at?new Date(rec.updated_at):null;$('eventMeta').textContent=d&&!isNaN(d)?'Group update · '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d):'Group update'}
function eventFromMessage(msg){if(msg?.event!=='message'||!msg.message)return;try{let rec=JSON.parse(msg.message);if(rec?.type==='ctd_event')storeEvent(rec)}catch{}}
async function syncLatestEvent(){if(!navigator.onLine)return;try{let r=await fetch(`${EVENT_URL}/json?poll=1&since=latest`,{cache:'no-store'});if(!r.ok)return;let body=await r.text();for(let line of body.split('\n')){line=line.trim();if(!line)continue;try{eventFromMessage(JSON.parse(line))}catch{}}}catch{}}
function startEventPush(){if(!navigator.onLine||eventStream)return;try{eventStream=new EventSource(`${EVENT_URL}/sse?since=latest`);eventStream.onmessage=e=>{try{eventFromMessage(JSON.parse(e.data))}catch{}};eventStream.onerror=()=>{eventStream?.close();eventStream=null;clearTimeout(eventReconnect);eventReconnect=setTimeout(startEventPush,15000)}}catch{eventStream=null}}
function stopEventPush(){eventStream?.close();eventStream=null;clearTimeout(eventReconnect);eventReconnect=null}
function openEventEditor(){$('eventInput').value=eventRecord()?.text||'';$('eventModal').hidden=false;setTimeout(()=>$('eventInput').focus(),50)}
function closeEventEditor(){$('eventModal').hidden=true}
async function saveEvent(){let text=$('eventInput').value.trim().slice(0,240);if(!text)return $('eventInput').focus();let rec={type:'ctd_event',text,updated_at:new Date().toISOString()};storeEvent(rec);closeEventEditor();$('saveEvent').disabled=true;try{let r=await fetch(EVENT_URL,{method:'POST',body:JSON.stringify(rec)});if(!r.ok)throw Error()}catch{alert('Saved on this phone, but the group push did not go through. Try again when you have service.')}finally{$('saveEvent').disabled=false}}
'''
s, n = re.subn(r"const EVENT_KEY='ctd_event_v1';.*?(?=const W=)", event_js, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('event JS marker not found')

reg_js = r'''function regTarget(lat,lon){
 const SC='https://www.adfg.alaska.gov/index.cfm?adfg=fishregulations.sc_sportfish',EO='https://www.adfg.alaska.gov/sf/EONR/';
 const spots=[{name:'Russian River / Upper Kenai',section:'Kenai River',lat:60.486,lon:-149.990},{name:'Kenai River',section:'Kenai River',lat:60.486,lon:-151.060},{name:'Kasilof River / Kenai Peninsula',section:'Kenai Peninsula',lat:60.315,lon:-151.270}].map(x=>({...x,miles:hav(lat,lon,x.lat,x.lon)})).sort((a,b)=>a.miles-b.miles);
 if(spots[0].miles<55)return{...spots[0],url:SC,sub:`2026 ${spots[0].section} section · ${spots[0].miles.toFixed(0)} mi from GPS`,eo:EO};
 if(lat>=58.4&&lat<=63.2&&lon>=-154&&lon<=-141.2)return{name:'Southcentral Alaska',url:SC,sub:'2026 Southcentral sport-fishing regulations',eo:EO};
 if(lon<-153.5)return{name:'Southwest Alaska',url:'https://www.adfg.alaska.gov/index.cfm?adfg=fishregulations.sw_sportfish',sub:'2026 Southwest sport-fishing regulations',eo:EO};
 if(lon>-141.7&&lat<60.8)return{name:'Southeast Alaska',url:'https://www.adfg.alaska.gov/index.cfm?adfg=fishregulations.se_sportfish',sub:'2026 Southeast sport-fishing regulations',eo:EO};
 return{name:'Northern Alaska',url:'https://www.adfg.alaska.gov/index.cfm?adfg=fishregulations.no_sportfish',sub:'2026 Northern sport-fishing regulations',eo:EO}
}
function renderRegs(lat,lon){let r=regTarget(lat,lon);$('regName').textContent=r.name;$('regSub').textContent=r.sub;$('regLink').href=r.url;$('regLink').textContent='OPEN ADF&G ↗';$('eoLink').href=r.eo}
'''
start = s.find('function regTarget(lat,lon){')
end = s.find('async function tideStations(){', start)
if start < 0 or end < 0:
    raise SystemExit('reg section markers not found')
s = s[:start] + reg_js + s[end:]

tail = r'''window.addEventListener('online',()=>{setOfflineStatus('ONLINE · refreshing saved data');loadFishCounts();syncLatestEvent();startEventPush()});
window.addEventListener('offline',()=>{setOfflineStatus('OFFLINE · using saved weather/tide reserve',true);stopEventPush()});
$('setEvent').onclick=openEventEditor;$('cancelEvent').onclick=closeEventEditor;$('saveEvent').onclick=saveEvent;$('eventModal').onclick=e=>{if(e.target===$('eventModal'))closeEventEditor()};
renderEvent();syncLatestEvent();startEventPush();
$('refresh').onclick=load;$('retry').onclick=load;loadFishCounts();load();'''
s, n = re.subn(r"window\.addEventListener\('online'.*?\$\('refresh'\)\.onclick=load;\$\('retry'\)\.onclick=load;loadFishCounts\(\);load\(\);", tail, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('tail marker not found')

p.write_text(s)
print('patched index.html')
