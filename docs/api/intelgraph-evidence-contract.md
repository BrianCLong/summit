# IntelGraph Evidence Contract

## Required fields
- `evidence_id`
- `entity_refs[]`
- `edge_refs[]`
- `provenance.source_type`
- `provenance.source_ref`
- `provenance.collection_method`
- `confidence`

## Determinism
- `report.json` and `metrics.json` must be content-stable.
- `stamp.json` must not contain wall-clock timestamps.
