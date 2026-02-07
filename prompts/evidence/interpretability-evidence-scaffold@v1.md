# Interpretability Evidence Scaffold v1

## Objective

Introduce mechanistic interpretability (MI) evidence scaffolding so Summit can store deterministic, schema-validated audit artifacts for model behavior analysis.

## Required Deliverables

- JSON Schemas under `schemas/evidence/interpretability/` for `index`, `report`, `metrics`, and `stamp`.
- Evidence index at `evidence/interpretability/index.json` (schema-valid, empty allowed).
- Fixtures under `tests/fixtures/evidence/interpretability/` with at least one valid and two invalid examples.
- GA documentation at `docs/ga/interpretability-evidence.md`.
- GA verification map update in `docs/ga/verification-map.json` and verification matrix update in `docs/ga/MVP-4-GA-VERIFICATION.md`.
- Milestone checklist entry in `.github/MILESTONES/MVP4-GA-MILESTONE.md`.
- Required checks discovery update in `required_checks.todo.md`.
- Update `docs/roadmap/STATUS.json` with a revision note for evidence scaffolding.

## Constraints

- Evidence ID format: `EVD-mechinterp-peeking-inside-llm-<AREA>-<NNN>`.
- Only `stamp.json` may contain timestamps.
- Keep changes additive; avoid refactors.

## Evidence & Governance

- All artifacts must be deterministic and ready for CI validation.
- Document governed exceptions explicitly in `report.json` when needed.
