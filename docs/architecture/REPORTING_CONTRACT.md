# Reporting Contract (v0)

Summit reports are generated only from verified claims.

## Invariants

- Every narrative statement must cite one or more `claim_cids`.
- Every report includes `claims_used` and `evidence_cids`.
- Raw retrieval context is prohibited from report artifacts.

## Enforcement

- Deterministic render path: `packages/reporting/src/render.js`.
- CI gate: `node scripts/gates/enforce_report_from_claims.mjs`.
- Runtime hard fail: renderer throws `UNVERIFIED_CLAIM_REFERENCED:<cid>` when a statement references an unverified claim.

## Pipeline Contract

1. Retrieve evidence.
2. Produce candidate claims.
3. Verify + attest claims.
4. Render report exclusively from verified claims.
