from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

YEAR = datetime.now(timezone.utc).year
SOURCES = [
    {
        "id": "kenai",
        "name": "Kenai River",
        "species": "Sockeye",
        "run": "Late run",
        "method": "Sonar",
        "location_id": 40,
        "species_id": 420,
    },
    {
        "id": "kasilof",
        "name": "Kasilof River",
        "species": "Sockeye",
        "run": "Main run",
        "method": "Sonar",
        "location_id": 41,
        "species_id": 420,
    },
    {
        "id": "russian",
        "name": "Russian River",
        "species": "Sockeye",
        "run": "Late run",
        "method": "Weir",
        "location_id": 13,
        "species_id": 422,
    },
]


class RowParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows: list[list[str]] = []
        self.row: list[str] | None = None
        self.cell: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "tr":
            self.row = []
        elif tag in {"td", "th"} and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in {"td", "th"} and self.cell is not None and self.row is not None:
            text = " ".join("".join(self.cell).split())
            self.row.append(text)
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None
            self.cell = None


def as_int(value: str) -> int | None:
    value = value.replace(",", "").strip()
    if not re.fullmatch(r"-?\d+", value):
        return None
    return int(value)


def scrape(source: dict) -> dict:
    url = (
        "https://www.adfg.alaska.gov/sf/FishCounts/index.cfm?"
        f"ADFG=main.displayResults&COUNTLOCATIONID={source['location_id']}"
        f"&SPECIESID={source['species_id']}&YEAR={YEAR}"
    )
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Cross-the-Divide/1.0 (+https://alterx3509.github.io/cryptbound/cross-the-divide/)"
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        html = response.read().decode("utf-8", errors="replace")

    parser = RowParser()
    parser.feed(html)
    records = []
    for cells in parser.rows:
        if len(cells) < 3 or not re.fullmatch(r"\d{2}/\d{2}", cells[0]):
            continue
        count = as_int(cells[1])
        cumulative = as_int(cells[2])
        if count is None or cumulative is None:
            continue
        month, day = map(int, cells[0].split("/"))
        try:
            date = datetime(YEAR, month, day, tzinfo=timezone.utc)
        except ValueError:
            continue
        note = cells[-1] if len(cells) > 3 else ""
        records.append(
            {
                "date": date,
                "date_string": f"{YEAR:04d}-{month:02d}-{day:02d}",
                "count": count,
                "cumulative": cumulative,
                "note": note,
            }
        )

    if not records:
        raise RuntimeError(f"No current-year count rows found for {source['name']}")

    records.sort(key=lambda item: item["date"])
    latest = records[-1]
    last7 = records[-7:]
    last3 = records[-3:]
    status = "FINAL" if "final" in latest["note"].lower() else "LATEST"

    return {
        "id": source["id"],
        "name": source["name"],
        "species": source["species"],
        "run": source["run"],
        "method": source["method"],
        "latest_date": latest["date_string"],
        "daily_count": latest["count"],
        "cumulative": latest["cumulative"],
        "seven_day_total": sum(r["count"] for r in last7),
        "three_day_average": round(sum(r["count"] for r in last3) / len(last3)),
        "status": status,
        "note": latest["note"],
        "official_url": url,
    }


def main():
    rivers = []
    failures = []
    old_path = Path("cross-the-divide/fish-counts.json")
    old = {}
    if old_path.exists():
        try:
            old = json.loads(old_path.read_text())
        except Exception:
            old = {}
    old_by_id = {r.get("id"): r for r in old.get("rivers", [])}

    for source in SOURCES:
        try:
            rivers.append(scrape(source))
        except Exception as exc:
            failures.append(f"{source['name']}: {exc}")
            if source["id"] in old_by_id:
                stale = dict(old_by_id[source["id"]])
                stale["status"] = stale.get("status", "LATEST") + " · CACHED"
                rivers.append(stale)
            else:
                raise

    payload = {
        "source": "Alaska Department of Fish and Game",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "failures": failures,
        "rivers": rivers,
    }
    old_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
