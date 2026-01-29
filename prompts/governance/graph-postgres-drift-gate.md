# Prompt: Graph/Postgres Drift Gate

Implement a production-ready drift gate that compares Postgres digest views against Neo4j canonical digests.

## Requirements

- Add governance thresholds in `config/governance/drift.yml`.
- Implement `scripts/ci/graph_postgres_drift_check.mjs` to produce `report.json`, `metrics.json`, and `stamp.json`.
- Provide a JSON schema for the report in `schemas/gates/`.
- Add unit tests for core diff logic.
- Document usage in `docs/ops/`.
- Update `docs/roadmap/STATUS.json` with the execution note.

## Constraints

- Use deterministic serialization for evidence artifacts.
- Emit a failed exit code when thresholds are exceeded.
- Avoid new dependencies unless required.
