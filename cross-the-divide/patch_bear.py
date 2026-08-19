from pathlib import Path

p=Path('cross-the-divide/index.html')
s=p.read_text()

script='<script src="./bear.js" defer></script>\n'
marker='<script type="module">'
if script not in s:
    if marker not in s:
        raise SystemExit('module script marker not found')
    s=s.replace(marker,script+marker,1)

s=s.replace('Build 2026.08.16.1308','Build 2026.08.18.1657',1)
p.write_text(s)

a=s.index('<script type="module">')+len('<script type="module">')
b=s.index('</script>',a)
Path('/tmp/ctd-main.mjs').write_text(s[a:b])
print('integrated bear module')
