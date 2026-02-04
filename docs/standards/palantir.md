# Palantir Interop & Standards Mapping

## Import Matrix (Foundry/Gotham -> Summit)

| Palantir Concept | Summit Concept | Lossiness |
| ---------------- | -------------- | --------- |
| Ontology Object  | Graph Node     | Low (Schema mapping required) |
| Ontology Link    | Graph Edge     | None |
| Action Type      | Tool Definition| Medium (Logic needs porting) |
| Workshop App     | React Component| High (UI logic differs) |
| Data Lineage     | Provenance DAG | None (Summit is strictly superset) |

## Export Matrix (Summit -> Standard Schemas)

| Summit Artifact | Schema Version | Description |
| --------------- | -------------- | ----------- |
| Report          | v1.0.0         | `report.json` (Summary & Findings) |
| Metrics         | v1.0.0         | `metrics.json` (Runtime perf & costs) |
| Stamp           | v1.0.0         | `stamp.json` (Deterministic provenance) |
| Graph Snapshot  | v1.0.0         | JSONL Node/Edge list |

## Non-Goals
- **Pixel-perfect UI replication**: Summit uses its own React/Vite UI.
- **Proprietary Protocol Support**: Only open standard imports (JSON, CSV, SQL, Parquet).

## Backward Compatibility
- Summit guarantees schema compatibility for `metrics.json` and `report.json` for major versions.
