# Korea Ride

Open the app: https://alterx3509.github.io/cryptbound/korea-ride/

The deployed index.html is self-contained. No ChatGPT account is needed.

Personal passports, riders, attendance and transport details are stored only in browser localStorage. The Shared day details panel publishes only the selected day's title and notes through ntfy. Anyone using the app can edit public day notes. Received notes persist locally. The service retains recent messages for a limited period, so this is not a durable shared database: use Save & share again for a late-joining device that missed an older update. Failed publishing keeps the editor open; it never reports success based on an opaque response.

Weather and place lookup call Open-Meteo and Overpass directly from the browser. Catalog and Naver search fallbacks remain available if those services fail. Distances in the 200 km filter are straight-line distances.

## Rebuild

The editable source is preserved in source-snapshot.json, a mapping of relative file paths to UTF-8 contents. Extract into an empty directory:

```python
import json
from pathlib import Path
for name, content in json.loads(Path('source-snapshot.json').read_text()).items():
    target = Path('source') / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)
```

In source, run pnpm install and pnpm build. Publish dist contents to this directory, preserving relative asset paths. The snapshot includes existing dependency versions and lockfile. Original server-hosted app and its records are separate and were not deleted or migrated.
