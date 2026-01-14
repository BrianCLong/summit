# Prompt: ga-gate-composite-check (v1)

## Mission

Create a single, stable composite check named `ga / gate` that aggregates all GA-critical
CI signals for branch protection. Ensure missing or skipped signals fail the composite, update
required check policy/docs to center on `ga / gate`, and document the gate.

## Requirements

- Add job `ga_gate` with name `ga / gate` in the primary PR workflow.
- Aggregate lint, typecheck, unit/integration tests, build, governance, provenance,
  schema validation, and Golden Path smoke.
- Treat missing/skipped/cancelled results as failure.
- Update branch protection policy to require `ga / gate`.
- Update required checks policy/docs to reflect the composite gate.
- Add workflow validation tests and update branch protection drift validation.
- Update `docs/roadmap/STATUS.json` in the same change.
