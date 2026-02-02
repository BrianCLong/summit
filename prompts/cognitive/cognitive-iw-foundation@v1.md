# Cognitive I&W Foundation (Schemas + Docs)

## Mission
Deliver the initial, pattern-first Cognitive I&W scaffolding: JSON schemas, fixtures, and standards
documentation, plus governance updates (roadmap status + repo assumptions).

## Constraints
- Defensive-only; do not adjudicate truth or intent.
- Feature-flagged OFF by default.
- Evidence artifacts and identifiers must be deterministic.
- Do not include raw content or PII in fixtures.

## Required Outputs
- `api-schemas/cognitive-iw/alert.schema.json`
- `api-schemas/cognitive-iw/event.schema.json`
- `GOLDEN/datasets/cognitive-iw/fixtures.seed.jsonl`
- `docs/standards/nato-cognitive-alerts.md`
- Update `docs/roadmap/STATUS.json`
- Update `repo_assumptions.md`

## Verification Tier
- Tier C (schema validation or unit tests optional; ensure JSON is valid and deterministic).
