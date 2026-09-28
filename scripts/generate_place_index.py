"""Build small, on-demand search buckets from GeoNames cities500.

Run from the repository root with Python 3:
    python scripts/generate_place_index.py

GeoNames source: https://download.geonames.org/export/dump/cities500.zip
License: CC BY 4.0. See public/place-index/README.md for attribution.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from io import BytesIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://download.geonames.org/export/dump/cities500.zip"
ADMIN_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"
OUTPUT = ROOT / "public" / "place-index"


def normalized_words(value: str) -> list[str]:
    text = "".join(char for char in unicodedata.normalize("NFD", value.lower()) if unicodedata.category(char) != "Mn")
    return [word for word in re.split(r"[^\w]+", text) if len(word) >= 3]


def bucket_for(word: str) -> int:
    key = word[:3]
    value = 0
    for char in key:
        value = (value * 31 + ord(char)) % 256
    return value


def load_countries() -> dict[str, str]:
    source = (ROOT / "src" / "data" / "countries.ts").read_text(encoding="utf-8")
    literal = source.split("export const COUNTRIES: Country[] = ", 1)[1].split(";", 1)[0]
    return {country["cca2"]: country["id"] for country in json.loads(literal)}


def load_territories() -> dict[str, tuple[str, str]]:
    source = (ROOT / "src" / "data" / "territoriesRegistry.ts").read_text(encoding="utf-8")
    result: dict[str, tuple[str, str]] = {}
    for identifier, parent, code in re.findall(
        r"id:\s*'([^']+)'[^\n]*parent:\s*'([^']+)'[^\n]*flagCode:\s*'([^']+)'", source
    ):
        if len(code) == 2:
            result[code.upper()] = (parent, identifier)
    return result


def read_source(local_path: Path | None, url: str) -> bytes:
    return local_path.read_bytes() if local_path else urllib.request.urlopen(url, timeout=90).read()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cities-zip", type=Path, help="Use a previously downloaded cities500.zip")
    parser.add_argument("--admin-codes", type=Path, help="Use a previously downloaded admin1CodesASCII.txt")
    args = parser.parse_args()

    countries = load_countries()
    territories = load_territories()
    admin_bytes = read_source(args.admin_codes, ADMIN_URL)
    admin_names = {}
    for line in admin_bytes.decode("utf-8").splitlines():
        columns = line.split("\t")
        if len(columns) >= 2:
            admin_names[columns[0]] = columns[1]

    buckets: dict[int, list[list[object]]] = defaultdict(list)
    total = 0
    covered_countries: set[str] = set()
    with zipfile.ZipFile(BytesIO(read_source(args.cities_zip, SOURCE_URL))) as archive:
        for raw_line in archive.open("cities500.txt"):
            columns = raw_line.decode("utf-8").rstrip("\n").split("\t")
            if len(columns) < 15 or columns[6] != "P" or columns[7] in {"PPLX", "PPLH", "PPLQ", "PPLW"}:
                continue
            country_code = columns[8]
            country_id = countries.get(country_code)
            # VisitedPlaces tracks Somaliland separately from Somalia. These
            # GeoNames admin divisions correspond to its displayed regions.
            if country_code == "SO" and columns[10] in {"12", "19", "20", "21", "22"}:
                country_id = "SOL"
            territory_id = ""
            if not country_id and country_code in territories:
                country_id, territory_id = territories[country_code]
            if not country_id:
                continue

            identifier, name, ascii_name = columns[:3]
            if not name or not identifier:
                continue
            admin_name = admin_names.get(f"{country_code}.{columns[10]}", "")
            # Compact on-disk record: id, name, ASCII name, country, area,
            # latitude, longitude, population, territory target.
            record: list[object] = [
                int(identifier), name, ascii_name if ascii_name != name else "",
                country_id, admin_name, round(float(columns[4]), 5),
                round(float(columns[5]), 5), int(columns[14] or 0), territory_id,
            ]
            keys = {bucket_for(word) for value in (name, ascii_name) for word in normalized_words(value)}
            if not keys:
                continue
            for key in keys:
                buckets[key].append(record)
            total += 1
            covered_countries.add(country_id)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for key in range(256):
        entries = buckets.get(key, [])
        entries.sort(key=lambda entry: (-int(entry[7]), str(entry[1]), int(entry[0])))
        (OUTPUT / f"{key:02x}.json").write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    manifest = {
        "source": SOURCE_URL,
        "generatedAt": dt.datetime.now(dt.timezone.utc).date().isoformat(),
        "places": total,
        "countries": len(covered_countries),
        "buckets": 256,
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {total:,} places to 256 search buckets in {OUTPUT}")


if __name__ == "__main__":
    main()
