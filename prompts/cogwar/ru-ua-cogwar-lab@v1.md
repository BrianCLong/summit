# RU-UA CogWar Lab Prompt (v1)

## Objective

Create deterministic Cognitive Campaign artifacts for the RU-UA cogwar lab, including schema,
examples, compilation outputs, tests, and documentation aligned with governance requirements.

## Scope

- `schemas/cogwar/campaign.v1.schema.json`
- `examples/cogwar/ru-ua/*.campaign.json`
- `scripts/cogwar/*.mjs`
- `dist/cogwar/*`
- `tests/cogwar/*`
- `docs/standards/ru-ua-cogwar-lab.md`
- `docs/security/data-handling/ru-ua-cogwar-lab.md`
- `docs/ops/runbooks/ru-ua-cogwar-lab.md`
- `docs/roadmap/STATUS.json`

## Constraints

- Deterministic outputs only (no timestamps in `metrics.json`).
- Feature-flag default OFF for any ingestion/scoring changes.
- No modification to governance policy files.

## Evidence Requirements

- Schema validation tests must pass.
- Packs must compile deterministically with stable hashing.
