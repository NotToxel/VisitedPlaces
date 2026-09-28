# Offline place search data

The 256 JSON files in this directory are generated from the GeoNames
`cities500` gazetteer, downloaded on 2026-09-28. GeoNames data is licensed
under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
Source and documentation: [GeoNames download](https://download.geonames.org/export/dump/).

The generated index contains populated places with more than 500 residents and
administrative seats, limited to the countries and territories represented by
VisitedPlaces. Sections of cities, historic places, abandoned places, and
destroyed places are excluded. It does not include every hamlet, landmark, or
natural feature. The hand-curated aliases in `src/data/placeSearch.ts` cover
selected holiday destinations that are not populated places.

To regenerate the index from the current GeoNames export, run:

```bash
python scripts/generate_place_index.py
```

The generator uses only Python's standard library. Search requests fetch one
JSON bucket from this app's own origin after three characters; no query is sent
to GeoNames or another geocoding service.
