from pathlib import Path
import json,re

root=Path('cross-the-divide')
BUILD='2026.08.18.1728'

# Integrate official bear intelligence module into the page.
p=root/'index.html'
s=p.read_text()
needle='<script src="./bear.js" defer></script>'
if '<script src="./official-bear.js" defer></script>' not in s:
    if needle not in s: raise SystemExit('bear.js script tag not found')
    s=s.replace(needle, needle+'\n<script src="./official-bear.js" defer></script>',1)
s=re.sub(r'Build \d{4}\.\d{2}\.\d{2}\.\d{4}', f'Build {BUILD}', s, count=1)
p.write_text(s)

# Bump version beacon.
(root/'version.json').write_text(json.dumps({'build':BUILD},indent=2)+'\n')

# Teach updater what build it is running.
p=root/'updater.js'; s=p.read_text()
s=re.sub(r"const BUILD='[^']+';",f"const BUILD='{BUILD}';",s,count=1)
p.write_text(s)

# Cache the official bear module/feed for offline display.
p=root/'service-worker.js'; s=p.read_text()
s=re.sub(r"const CACHE='ctd-shell-v\d+';","const CACHE='ctd-shell-v11';",s,count=1)
line="const SHELL=['./','./index.html','./manifest.json','./recover.html','./bear.js','./updater.js','./version.json'];"
replacement="const SHELL=['./','./index.html','./manifest.json','./recover.html','./bear.js','./official-bear.js','./bear-alerts.json','./updater.js','./version.json'];"
if line in s:s=s.replace(line,replacement,1)
elif "'./official-bear.js'" not in s: raise SystemExit('service-worker shell marker not found')
p.write_text(s)

# Update manifest version/description without changing the permanent start URL.
p=root/'manifest.json'; m=json.loads(p.read_text()); m['version']='1.4'; m['description']='A current-location Alaska camping and fishing dashboard with weather, light, tides, fishing windows, fish-passage counts, group events, and nearby group/official bear activity.'; p.write_text(json.dumps(m,indent=2)+'\n')

# Extract inline module for syntax checking.
s=(root/'index.html').read_text(); marker='<script type="module">'; a=s.index(marker)+len(marker); b=s.index('</script>',a); Path('/tmp/ctd.mjs').write_text(s[a:b])
print('integrated official bear layer',BUILD)
