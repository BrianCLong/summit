# Prompt: Tidemark Evidence Scaffold (v1)

## Intent

Scaffold evidence artifacts, schemas, fixtures, and verification gates for the tidemark temporal
community tracking initiative while keeping all feature flags default OFF.

## Scope

- Evidence bundle files under `evidence/`.
- Trajectory schemas under `schemas/trajectory/`.
- Deterministic fixture data under `fixtures/temporal_graph/`.
- Required checks discovery notes under `docs/`.
- CI verification script under `tools/`.
- Feature flags under `src/temporal_graph/config.py`.
- Roadmap status update under `docs/roadmap/STATUS.json`.
- Dependency delta ledger update under `docs/dependency_delta.md`.

## Guardrails

- No runtime pipeline implementation.
- No dependency additions without explicit ledger entry.
- Evidence files must exclude raw identifiers and only allow timestamps in `stamp.json`.
