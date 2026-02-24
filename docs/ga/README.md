# GA Release Manifest (MVP-4-GA)

This directory contains the required artifacts for the GA Release.

## 1. Release Runbooks
* [ ] [Deployment Runbook](../DEPLOY.md)
* [ ] [Rollback Runbook](ROLLBACK.md)
* [ ] [Observability Runbook](OBSERVABILITY.md)

## 2. Acceptance Criteria
* [ ] All Critical Paths Verified
* [ ] Security Audit Clean (Exceptions Logged)
* [ ] Performance Baseline Met (p95 < 1.5s)

## 3. Known Issues & Risks
* Jest test suite is fragile; rely on `server/scripts/verify_*.ts` for critical path verification.
* OPA policies are currently in `policies/` but require strict enforcement in CI.
