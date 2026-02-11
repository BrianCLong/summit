# GA RC1 Go/No-Go Ticket

**Release Candidate:** `v1.0.0-rc.1`
**Branch:** `release/ga`
**Status:** ❌ NO-GO (Blocked by multiple failures)

## RC1 Gate Suite

| Gate | Status | Evidence/Log |
| :--- | :--- | :--- |
| **CI Required Checks** | ❌ FAIL | Outdated lockfile, 1232 linter errors, Jest setup missing. |
| **Security Scans** | ❌ FAIL | 12 vulnerabilities found (5 HIGH). |
| **Golden-path E2E** | ❌ FAIL | Journey disabled in script; manual run failed due to missing modules. |
| **RBAC Deny/Allow** | ❌ FAIL | Jest setup missing (`tests/utils/jest-setup.cjs`). |
| **Audit Logging E2E** | ❌ FAIL | Missing `bc` command in environment. |
| **Smoke + Basic Perf** | ❌ FAIL | `.env` missing; connection refused on localhost:4000. |

## Deployment Info
- **Internal Environment:** `dev`
- **Target Tag:** `v1.0.0-rc.1`
- **Deployment Status:** ✅ SUCCESS (Simulated via mocked helm)

## Instructions
1. Create `release/ga` from `main` and freeze it.
2. Tag `v1.0.0-rc.1` from `release/ga`.
3. Deploy `rc.1` to internal.
4. Run the RC1 gate suite.
5. If any gate is red: file a single “RC1 blocker” issue per failure, fix on `release/ga`, retag `rc.2`, repeat internal.

## Blockers Filed
- `issues/rc1-blockers/CI_LINT_JEST_FAIL.md`
- `issues/rc1-blockers/SECURITY_VULN_HIGH.md`
- `issues/rc1-blockers/AUDIT_VERIFY_BC_MISSING.md`
- `issues/rc1-blockers/SMOKE_PERF_ENV_CONNECT_FAIL.md`
