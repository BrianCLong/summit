# Reporting Contract (v0)

Summit reports are generated only from verified claims.

## Invariants

- Every narrative statement must cite one or more `claim_cids`.
- Every report includes `claims_used` and `evidence_cids`.
- Raw retrieval context is prohibited from report artifacts.
- Non-verified claim payloads are rejected before rendering.

## Enforcement

- Deterministic render path: `packages/reporting/src/render.js`.
- Schema validation API: `packages/reporting/src/validate.js`.
- CI gate: `node scripts/gates/enforce_report_from_claims.mjs`.
- Runtime hard fails:
  - `UNVERIFIED_CLAIM_INPUT` when incoming claims are not verified.
  - `UNVERIFIED_CLAIM_REFERENCED:<cid>` when statement references an unverified claim.

## Pipeline Contract

1. Retrieve evidence.
2. Produce candidate claims.
3. Verify + attest claims.
4. Render report exclusively from verified claims.
5. Validate report schema before export and attestation.

## Regression Coverage

- Reporting renderer tests: `node --test packages/reporting/test/*.test.mjs`.
- Gate tests: `node --test scripts/gates/__tests__/enforce_report_from_claims.test.mjs`.
