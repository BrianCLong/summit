# GA Release Manifest (MVP-4-GA)

**Canonical Status:**
*   **Locked Baseline:** `docs/ga/MVP4_GA_BASELINE.md`
*   **Stabilization Plan:** `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`
*   **Active Worksheet:** `docs/ga/POST_GA_ISSUANCE_WORKSHEET.md`

This directory contains artifacts, runbooks, and checklists for the MVP-4 GA Release.
**Note:** Some files in this directory are historical/working drafts from the release preparation phase (Dec 2025). Refer to the **Locked Baseline** above for the authoritative state.

## 1. Release Runbooks
* [ ] [Deployment Runbook](DEPLOY.md)
* [ ] [Rollback Runbook](ROLLBACK.md)
* [ ] [Observability Runbook](OBSERVABILITY.md)

## 2. Acceptance Criteria
* [ ] All Critical Paths Verified
* [ ] Security Audit Clean (Exceptions Logged)
* [ ] Performance Baseline Met (p95 < 1.5s)

## 3. Known Issues & Risks
* Jest test suite is fragile; rely on `server/scripts/verify_*.ts` for critical path verification.
* OPA policies are currently in `policies/` but require strict enforcement in CI.
