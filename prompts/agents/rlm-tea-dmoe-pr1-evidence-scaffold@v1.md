# RLM-TEA-DMOE PR1 Evidence Scaffold Prompt (v1)

You are implementing the PR1 lane-1 evidence scaffold for RLM/TEA/DMoE.

## Objectives
- Add evidence schemas under `src/agents/evidence/schemas/`.
- Add deterministic evidence writer utilities in `src/agents/evidence/`.
- Add a CI validation hook via `.github/scripts/evidence-validate.mjs` and `pnpm evidence:validate`.
- Update `required_checks.todo.md` and `docs/roadmap/STATUS.json` to reflect the new gate.
- Add unit tests under `tests/agents/evidence/`.

## Constraints
- No refactors. Additive changes only.
- Do not introduce timestamps outside `stamp.json`.
- Keep deterministic outputs and deny-by-default policies intact.

## Evidence IDs
- EVD-RLM-TEA-DMOE-EVID-001

## Required Artifacts
- Evidence schema JSON files
- Deterministic validator script
- Unit tests proving determinism
