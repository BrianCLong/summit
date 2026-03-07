# Narrative CI (Lane 1 Fixtures)

This pipeline scaffolds deterministic narrative governance outputs for the Feb 7, 2026 situation update.
It is fixtures-first and gate-complete: adapters can replace the fixture inputs without changing the
output contracts, evidence layout, or OPA gates.

## Inputs (fixtures in this PR)

- `fixtures/feb07_2026/artifact_index.json`
- `fixtures/feb07_2026/previous_snapshot.json`
- `fixtures/feb07_2026/current_snapshot.json`
- `fixtures/feb07_2026/provenance_receipts.json`
- `intelgraph/pipelines/narrative_ci/config/tiers.yml`
- `intelgraph/pipelines/narrative_ci/config/lexicons.yml`
- `intelgraph/pipelines/narrative_ci/config/thresholds.yml`

## Deterministic outputs

- `out/delta/<hash>.json`
- `out/handoff/<hash>.json`
- `out/state/<hash>.json`
- `out/early_warning/<hash>.json`
- `out/run_manifest/<hash>.json`

## Evidence layout

- `evidence/<EVD-...>/report.json`
- `evidence/<EVD-...>/metrics.json`
- `evidence/<EVD-...>/stamp.json`
- `evidence/index.json`

## OPA gates

- Traceability
- Determinism
- Tier taxonomy

## Notes

- Deterministic payloads must never include timestamp-like keys. Time is allowed only in
  `stamp.json`.
- Adapters will swap in real artifact stores and handoff/state resolvers while preserving
  the same payload shapes.
