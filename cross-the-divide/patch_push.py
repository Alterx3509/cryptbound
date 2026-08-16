from pathlib import Path
import re

p=Path('cross-the-divide/index.html')
s=p.read_text()

new_sync="""async function syncLatestEvent(){if(!navigator.onLine)return;try{let r=await fetch(`${EVENT_URL}/json?poll=1&since=12h`,{cache:'no-store'});if(!r.ok)return;let body=await r.text();for(let line of body.split('\\n')){line=line.trim();if(!line)continue;try{eventFromMessage(JSON.parse(line))}catch{}}}catch{}}"""
s,n=re.subn(r"async function syncLatestEvent\(\)\{.*?\}\nfunction startEventPush",new_sync+"\nfunction startEventPush",s,count=1,flags=re.S)
if n!=1: raise SystemExit('syncLatestEvent marker not found')

new_start="""function startEventPush(){if(!navigator.onLine||eventStream)return;try{eventStream=new EventSource(`${EVENT_URL}/sse?since=10m`);eventStream.onmessage=e=>{try{eventFromMessage(JSON.parse(e.data))}catch{}};eventStream.onerror=()=>{eventStream?.close();eventStream=null;clearTimeout(eventReconnect);eventReconnect=setTimeout(()=>{syncLatestEvent();startEventPush()},15000)}}catch{eventStream=null}}"""
s,n=re.subn(r"function startEventPush\(\)\{.*?\}\nfunction stopEventPush",new_start+"\nfunction stopEventPush",s,count=1,flags=re.S)
if n!=1: raise SystemExit('startEventPush marker not found')

s=s.replace("if(rec?.type==='ctd_event')storeEvent(rec)","if(rec?.type==='ctd_event'&&rec?.text!=='transport diagnostic')storeEvent(rec)")

new_save="""async function publishGroupEvent(rec){let body=JSON.stringify(rec),firstError=null;try{let r=await fetch(EVENT_URL,{method:'POST',body,cache:'no-store'});if(r.ok)return'confirmed';firstError=new Error(`Push server returned ${r.status}`)}catch(e){firstError=e}try{await fetch(EVENT_URL,{method:'POST',body,mode:'no-cors',cache:'no-store'});return'sent'}catch{}try{if(navigator.sendBeacon&&navigator.sendBeacon(EVENT_URL,body))return'queued'}catch{}throw firstError||new Error('Push transport unavailable')}
async function saveEvent(){let text=$('eventInput').value.trim().slice(0,240);if(!text)return $('eventInput').focus();let rec={type:'ctd_event',text,updated_at:new Date().toISOString()};storeEvent(rec);closeEventEditor();$('saveEvent').disabled=true;try{let state=await publishGroupEvent(rec);setTimeout(syncLatestEvent,800);if(state!=='confirmed')console.info('Cross the Divide group event sent using Safari fallback:',state)}catch(e){alert('Saved on this phone, but the group service could not be reached. This is a push-service connection problem, not a cellular-signal test.')}finally{$('saveEvent').disabled=false}}"""
s,n=re.subn(r"async function saveEvent\(\)\{.*?\}\nconst W=",new_save+"\nconst W=",s,count=1,flags=re.S)
if n!=1: raise SystemExit('saveEvent marker not found')

p.write_text(s)
a=s.index('<script type="module">')+len('<script type="module">')
b=s.index('</script>',a)
Path('/tmp/ctd.mjs').write_text(s[a:b])
print('patched')
