# SSDF v1.2 Subsumption Bundle Scaffold Prompt (v1)

Use this prompt to create or update the SSDF v1.2 subsumption bundle scaffold,
including the manifest, claim registry, control map, fixtures, evidence bundle,
and roadmap status update.

## Required outputs

- Subsumption manifest, claim registry, and control map under `subsumption/ssdf-v1-2/`.
- Allow/deny fixtures under `subsumption/ssdf-v1-2/fixtures/`.
- Evidence bundle under `evidence/ssdf-v1-2/` with report, metrics, and stamp.
- Evidence index update in `evidence/index.json`.
- Roadmap status update in `docs/roadmap/STATUS.json`.
- Backlog entry in `backlog/ssdf-v1-2.yaml`.

## Constraints

- No production API changes.
- Deterministic outputs for report and metrics (no timestamps).
- Stamp may include a fixed timestamp.
