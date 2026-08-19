#!/usr/bin/env python3
from __future__ import annotations

import html as html_lib
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

INDEX_URL = "https://www.fs.usda.gov/r10/chugach/alerts"
OUT = Path(__file__).with_name("bear-alerts.json")
UA = "CrossTheDivide/1.0 (+https://alterx3509.github.io/cryptbound/cross-the-divide/)"
RELEVANT = re.compile(r"\bbears?\b|bear[- ]resistant|attractant|food storage", re.I)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")


def textify(raw: str) -> str:
    raw = re.sub(r"<script\b.*?</script>", " ", raw, flags=re.I | re.S)
    raw = re.sub(r"<style\b.*?</style>", " ", raw, flags=re.I | re.S)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", html_lib.unescape(raw)).strip()


def title_from(raw: str, fallback: str) -> str:
    m = re.search(r"<h1\b[^>]*>(.*?)</h1>", raw, flags=re.I | re.S)
    return textify(m.group(1)) if m else fallback


def summary_from(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    for sentence in sentences:
        if RELEVANT.search(sentence) and 20 <= len(sentence) <= 500:
            return sentence[:280].strip()
    m = RELEVANT.search(text)
    if not m:
        return "Official bear-related Forest Service notice."
    a = max(0, m.start() - 100)
    b = min(len(text), m.end() + 180)
    return text[a:b].strip(" -.,")[:280]


def candidate_links(raw: str) -> list[tuple[str, str]]:
    found = []
    seen = set()
    for href, label in re.findall(r'href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', raw, flags=re.I | re.S):
        url = urllib.parse.urljoin(INDEX_URL, html_lib.unescape(href))
        path = urllib.parse.urlparse(url).path.rstrip("/")
        if "/chugach/alerts/" not in path:
            continue
        if path.endswith("/chugach/alerts") or url in seen:
            continue
        seen.add(url)
        found.append((url, textify(label)))
    return found[:30]


def main() -> None:
    raw = fetch(INDEX_URL)
    alerts = []
    for url, fallback in candidate_links(raw):
        try:
            detail = fetch(url)
            text = textify(detail)
        except Exception:
            continue
        if not RELEVANT.search(text):
            continue
        title = title_from(detail, fallback or "Chugach National Forest alert")
        start = None
        m = re.search(r"Alert Start Date:\s*([^|]+?)(?:Alert End Date:|Order Number:|Forest Order:|Contact|Last updated|$)", text, flags=re.I)
        if m:
            start = m.group(1).strip()[:80]
        alerts.append({
            "title": title,
            "summary": summary_from(text),
            "url": url,
            "start_date": start,
        })

    data = {
        "source": "USDA Forest Service - Chugach National Forest",
        "source_url": INDEX_URL,
        "checked_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "featured_status": "No Featured Alerts at this Time" if "No Featured Alerts at this Time" in textify(raw) else "See current Forest Service alerts",
        "alerts": alerts,
    }
    OUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"checked_at": data["checked_at"], "bear_alerts": len(alerts)}))


if __name__ == "__main__":
    main()
