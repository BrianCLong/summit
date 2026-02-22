# Trust Paradox PR1 Evidence Scaffold (v1)

## Objective
Establish deterministic Trust Paradox evidence artifacts, schemas, fixtures, and CI verification gates.

## Required Outputs
- Evidence bundle under `evidence/trustparadox/` with report, metrics, stamp, and index.
- JSON schemas for the Trust Paradox evidence bundle under `evidence/schemas/`.
- CI verifier scripts for evidence and policy fixtures under `ci/verifier/`.
- Fixtures under `fixtures/evidence/` and `fixtures/policy/`.
- Required checks discovery updates in `required_checks.todo.md`.
- Roadmap status update in `docs/roadmap/STATUS.json`.

## Constraints
- Deterministic evidence: timestamps only in `stamp.json`.
- Deny-by-default alignment for policy fixtures.
- No dependency drift without `deps/delta.md` entry.

## Verification
- `python ci/verifier/verify_evidence.py`
- `python ci/verifier/verify_policy_fixtures.py`
- `node scripts/check-boundaries.cjs`

## Rollback
Revert the commit to remove the Trust Paradox evidence scaffold and CI verifier.
