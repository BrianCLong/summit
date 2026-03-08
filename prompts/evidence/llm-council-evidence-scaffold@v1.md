# LLM Council Evidence Scaffolding (v1)

## Objective
Create deterministic, lane-1 evidence scaffolding for the LLM council subsumption plan.

## Required Outputs
- Council evidence schemas in `evidence/schemas/`.
- Evidence validator script under `.github/scripts/`.
- CI workflow to run the validator.
- Update `required_checks.todo.md` with the new workflow name.
- Update `docs/roadmap/STATUS.json` with a new initiative entry.

## Constraints
- Deterministic outputs only; no timestamps outside evidence stamps.
- Do not modify production code paths or policy engines.
- Keep changes within declared scope and avoid dependency changes.

## Verification
- Validator checks required files exist.
- CI workflow runs the validator.
