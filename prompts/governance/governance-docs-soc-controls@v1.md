# Governance Docs + SOC Controls Gate (v1)

## Intent

Establish governance documentation consolidation and SOC control verification as deterministic CI gates, with traceable evidence and admin handoff notes.

## Scope

- docs/governance/\*\*
- docs/ci/REQUIRED_CHECKS_POLICY.yml
- docs/SOC_CONTROL_UNIT_TESTS_PLAN.md
- scripts/ci/\*\*
- .github/workflows/\*\*
- server/tests/\*\*
- server/src/\*\*
- server/scripts/\*\*
- compliance/\*\*

## Requirements

1. Governance docs index + required headers + deterministic verifier with artifacts.
2. SOC control test mapping + unit tests + CI wiring (SOC Controls job).
3. Admin handoff note for branch protection checks.
4. Deterministic GA verify lane: no flaky coverage gating in GA verify mode.
5. Maintain evidence artifacts and document how to run gates locally.

## Constraints

- Zero new runtime dependencies.
- Deterministic outputs; stable ordering.
- No false claims about unimplemented gates.

## Verification

- `pnpm ci:docs-governance`
- `pnpm release:ready`
- CI workflow validation via `scripts/ci/validate-workflow-filters.sh`
