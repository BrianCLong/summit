# Prompt: CI coverage and contract/fuzz hardening

## Objective

Strengthen test and CI quality gates by aligning coverage artifacts with Codecov, ensuring consistent
status endpoint naming, and tightening contract/fuzz test typing to avoid brittle behavior.

## Scope

- .github/workflows/ci-core.yml
- server/src/http/status.ts
- server/src/api/scopeGuard.ts
- server/tests/contracts/status.contract.test.ts
- server/tests/fuzz/scope-guard.fuzz.test.ts
- docs/roadmap/STATUS.json

## Requirements

- Keep changes production-safe and aligned to existing patterns.
- Ensure coverage outputs are compatible with Codecov uploads.
- Ensure status service naming is consistent across endpoints and contracts.
- Remove test type escapes and use explicit typing for fuzz/contract tests.
- Update roadmap status note and timestamp.

## Verification

- Run scripts/check-boundaries.cjs.
- Run targeted Jest tests for the updated contract and fuzz suites.
