# MVP-4 GA Evidence Map

This document maps every critical product claim to a verifiable artifact in the repository.

| Category | Claim | File Path(s) | Verification Command | Expected Output |
| :--- | :--- | :--- | :--- | :--- |
| **Governance** | **GA Readiness** | `scripts/verify-ga.sh` | `npx tsx scripts/verify-ga.sh` | `✨ Verify: PASS` |
| **Governance** | **Policy Enforcement** | `policy/` | `bash scripts/test-policies.sh` | `PASS: ... checks` |
| **Governance** | **Audit Integrity** | `server/src/provenance/ledger.ts` | `node scripts/verify-audit-chain.js` | `Chain valid.` |
| **Security** | **SLSA L3 Compliance** | `scripts/security/verify-slsa-l3.sh` | `bash scripts/security/verify-slsa-l3.sh <image>` | `SLSA Level: 3` |
| **Security** | **Tenant Isolation** | `server/src/lib/db/TenantSafePostgres.ts` | `npx tsx scripts/security/verify-tenant-isolation.ts` | `Isolation checks passed` |
| **Security** | **No Secrets** | `.pre-commit-config.yaml` | `bash scripts/security/verify_no_secrets.sh` | `No secrets found` |
| **Orchestration** | **Maestro Logic** | `server/src/maestro/` | `npx tsx scripts/validate-maestro-deployment.sh` | `Planner ready` |
| **Intelligence** | **Graph Capabilities** | `server/src/graph/` | `npx tsx scripts/verify_ga_endpoints.ts` | `200 OK` |
| **Ops** | **Golden Paths** | `docs/golden-path/` | `bash scripts/verify_goldens.sh` | `Golden path active` |
| **Ops** | **Evidence Bundle** | `scripts/compliance/generate_evidence.ts` | `npx tsx scripts/verify-evidence-bundle.ts` | `Bundle verified` |
| **Ops** | **Prometheus Metrics** | `server/src/observability/metrics.ts` | `bash scripts/ops/verify-prometheus-metrics.sh` | `metrics found` |
| **Release** | **Release Bundle** | `scripts/release/` | `node scripts/release/verify-release-bundle.mjs` | `Bundle valid` |

## Artifact Locations

*   **Policies:** `policy/`
*   **Scripts:** `scripts/`
*   **Documentation:** `docs/`
*   **Source Code:** `server/src/`, `apps/`

## Verification Strategy

All verification scripts are designed to be run in a CI environment (`CI=1`) but can be executed locally with proper environment variables (`.env`).
