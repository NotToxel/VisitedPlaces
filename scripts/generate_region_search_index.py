"""Generate the small, lazy-loaded worldwide sub-region search list.

Run from the repository root with Python 3. The source is the same Natural
Earth admin-1 GeoJSON used by the map. Use --geojson to regenerate offline.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson"
SINGAPORE = "https://raw.githubusercontent.com/yinshanyang/singapore/master/maps/2-planning-area.geojson"
OUTPUT = ROOT / "src" / "data" / "regionSearchIndex.json"


def slug(value: str) -> str:
    plain = "".join(char for char in unicodedata.normalize("NFD", value.lower()) if unicodedata.category(char) != "Mn")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", plain))


def load_json(path: Path | None, url: str) -> dict:
    if path:
        return json.loads(path.read_text(encoding="utf-8"))
    with urllib.request.urlopen(url, timeout=90) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--geojson", type=Path, help="Previously downloaded Natural Earth admin-1 GeoJSON")
    parser.add_argument("--singapore", type=Path, help="Previously downloaded Singapore planning areas GeoJSON")
    args = parser.parse_args()

    countries_source = (ROOT / "src" / "data" / "countries.ts").read_text(encoding="utf-8")
    countries = json.loads(countries_source.split("export const COUNTRIES: Country[] = ", 1)[1].split(";", 1)[0])
    country_ids = {country["id"] for country in countries}
    features_by_country: dict[str, list[dict]] = defaultdict(list)
    for feature in load_json(args.geojson, SOURCE)["features"]:
        props = feature.get("properties") or {}
        name = props.get("name")
        if not name:
            continue
        country = props.get("adm0_a3")
        if country == "IMN":
            country = "GBR"
        elif country in {"KOS", "XKX"}:
            country = "XKX"
        if country not in country_ids or country in {"SGP", "SOL"}:
            continue
        if country == "SRB" and any(props.get(key) == "Kosovo" or props.get(key) in {"KOS", "XKX"} for key in ("admin", "geounit", "adm0_a3", "gu_a3", "sov_a3")):
            continue
        if country == "SOM" and any(props.get(key) == "Somaliland" or props.get(key) == "SOL" for key in ("admin", "geounit", "adm0_a3", "gu_a3", "sov_a3")):
            continue
        iso = props.get("iso_3166_2") or ""
        if country == "FRA" and (props.get("type_en") == "Overseas department" or props.get("type") == "Overseas département"):
            continue
        if country == "ESP" and iso in {"ES-TF", "ES-GC", "ES-CE", "ES-ML"}:
            continue
        if country == "PRT" and iso in {"PT-20", "PT-30", "PT-20R", "PT-30R"}:
            continue
        if country == "NZL" and (any(term in name for term in ("Chatham", "Kermadec", "Area Outside")) or iso in {"NZ-CIT", "NZ-CHA", "NZ-KER"}):
            continue
        if country == "CHL" and (any(term in name for term in ("Pascua", "Easter", "Fernández", "Desventuradas")) or iso == "CL-EA"):
            continue
        if country == "MUS" and (props.get("type_en") == "Dependency" or props.get("type") == "Dependency"):
            continue
        features_by_country[country].append(props)

    rows: list[list[str]] = []
    for country, features in features_by_country.items():
        iso_counts = Counter(("IM" if props.get("adm0_a3") == "IMN" else props.get("iso_3166_2") or "") for props in features)
        name_counts = Counter(props["name"] for props in features)
        seen: set[str] = set()
        for props in features:
            name = props["name"]
            iso = "IM" if props.get("adm0_a3") == "IMN" else props.get("iso_3166_2") or ""
            region_id = iso or f"{country}-{slug(name)}"
            region_name = name
            type_name = props.get("type_en") or ""
            if (iso and iso_counts[iso] > 1 or name_counts[name] > 1) and type_name:
                region_id += f"-{slug(type_name)}"
                region_name += f" ({type_name})"
            if region_id not in seen:
                rows.append([country, f"{country}-{region_id}", region_name])
                seen.add(region_id)

    rows.extend(["SOL", f"SOL-{code}", name] for code, name in [
        ("SOL-AW", "Awdal"), ("SOL-WO", "Maroodi Jeex (Woqooyi Galbeed)"),
        ("SOL-SH", "Sahil"), ("SOL-TO", "Togdheer"),
        ("SOL-SA", "Sanaag"), ("SOL-SO", "Sool"),
    ])
    singapore = load_json(args.singapore, SINGAPORE)
    rows.extend(["SGP", f"SGP-{slug(feature['properties']['name'])}", feature["properties"]["name"].title()]
                for feature in singapore["features"])

    territories = (ROOT / "src" / "data" / "territoriesRegistry.ts").read_text(encoding="utf-8")
    for identifier, name, parent in re.findall(r"id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*parent:\s*'([^']+)'", territories):
        rows.append([parent, identifier, name])

    rows.sort(key=lambda row: (row[2].casefold(), row[0], row[1]))
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(rows):,} regions ({OUTPUT.stat().st_size:,} bytes) to {OUTPUT}")


if __name__ == "__main__":
    main()
