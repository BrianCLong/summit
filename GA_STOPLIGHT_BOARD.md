# Summit GA "Stoplight Board"

This document serves as the authoritative GA Gate checklist for the Summit platform. Every item requires a "prove-it" artifact.

| # | GA Gate Item | Status | Proof of Life (Artifact) | Owner |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **GA Definition Freeze** | 🟡 YELLOW | `GA_STOPLIGHT_BOARD.md` (This document) | Release Captain |
| 2 | **Branch Protection & Required Checks** | 🟢 GREEN | `.tmp.protection.json` (Strict checks: CI, CodeQL, SBOM, Trivy) | DevEx |
| 3 | **Security Gates (Clean Scans)** | 🟢 GREEN | `.github/workflows/ga-gate.yml`, `ci-security.yml` | Security Pod |
| 4 | **RBAC & Permissions Verification** | 🟢 GREEN | `server/src/auth/__tests__/multi-tenant-rbac.test.ts` | Auth Pod |
| 5 | **Audit Logging (Who/What/When)** | 🟢 GREEN | `server/src/maestro/store/orchestrator-store.ts` | Audit Pod |
| 6 | **Test Posture (≥85% Coverage)** | 🟡 YELLOW | `jest.coverage.config.cjs` (Threshold set to 85% - verification in progress) | QA Pod |
| 7 | **Performance & Capacity Verification** | 🟡 YELLOW | `capacity.json` (Baseline budgets and limits established) | Perf Pod |
| 8 | **Reliability/Ops (DR/BCP Drill)** | 🟡 YELLOW | `docs/dr/LATEST_DRILL_SUMMARY.md` (Partial drill results documented) | SRE Pod |
| 9 | **Product Surface Completeness** | 🟢 GREEN | `connectors/s3csv/` (CSV reference connector shipped) | Product Pod |
| 10 | **Release Readiness (Tag/Notes/Rollback)** | 🟢 GREEN | `rollback-plan.md`, `.github/workflows/release-ga.yml` | Release Pod |

---

## 🛑 Top 3 GA Blockers

1.  **Performance & Capacity Verification**: While `capacity.json` establishes the baseline, we need a final k6 run in the production-like environment to confirm we stay within these budgets under peak load.
2.  **Test Coverage Verification**: The global coverage threshold has been raised to 85% in `jest.coverage.config.cjs`. We must ensure the CI pipeline stays green with this strict gate.
3.  **DR Restore Drill (Full)**: The latest drill summary in `docs/dr/LATEST_DRILL_SUMMARY.md` shows partial success. A follow-up drill for Neo4j index reconstruction is required to achieve full confidence.

## 🟢 Ready for GA Sign-off

- **Security & Supply Chain**: Trivy, Grype, and SBOM gates are fully integrated into the authoritative GA gate.
- **RBAC**: Multi-tenant isolation and ABAC policies are verified via automated test suites.
- **Audit**: PostgreSQL-backed audit logging is implemented for all Maestro orchestrator actions.
- **Product Surface**: The CSV reference connector is fully implemented and tested.
