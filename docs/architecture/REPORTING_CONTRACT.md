# Reporting Contract (v0)

Reports are rendered ONLY from verified claims.

## Invariants
- Every statement cites claim CIDs (`claim_cids[]`).
- Every report includes `claims_used[]` and `evidence_cids[]`.
- No raw retrieval context is embedded into report artifacts.

## Enforcement
The gate `scripts/gates/enforce_report_from_claims.mjs` blocks patterns
that indicate report generation from raw context dumps.

## Migration guidance
Any existing report generator must be refactored to:
1) retrieve evidence
2) produce claims
3) verify claims
4) render report from claims only
