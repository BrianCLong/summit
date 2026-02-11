# RBAC Enforcement Audit

## Methodology
The audit scanned `server/src/routes/` for RBAC enforcement using `assertCan` or equivalent middleware.

## Findings
- Total Route Files: 215
- Files with explicit RBAC checks: 30
- Status: **FAILING** (Coverage < 20%)

## Remediation Plan
1. Migrate all manual tenant checks to `assertCan`.
2. Implement global RBAC middleware for all `/api` routes.
3. Add mandatory permission metadata to all route definitions.

## Evidence
Audit run at 2026-02-11T00:00:00Z.
Receipt: `server/cis-benchmarks/receipts/rbac-audit-20260211.json`
