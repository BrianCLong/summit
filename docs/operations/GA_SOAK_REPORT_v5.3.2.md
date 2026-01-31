# GA Soak Report - v5.3.2

## Summary
- **Date (UTC):** 2026-01-31
- **Modes:** Standalone stability soak + `SMOKE_MODE=full`
- **Result:** Mixed
  - **Standalone stability soak:** PASS (binary + health checks)
  - **SMOKE_MODE=full:** BLOCKED/FAIL (install blocker, missing dependency, server not running, dev stack build blocker)

## Simulation Metadata (Standalone)
- **Cycles:** 5
- **Mode:** Standalone (Server binary + Dockerized DBs)
- **Target:** `localhost:4001` (Direct Server)

## Environment Constraints (Standalone)
- **Run Mode:** Standalone server binary running on host port `4001`.
- **Dependencies:** Dockerized PostgreSQL and Redis. Neo4j and Frontend were not accessible to the test runner.
- **Auth Config:** Default production settings (requiring valid JWTs), while the harness used a dev/test token or no token.
- **Networking:** Host-to-Container isolation prevented the test runner from reaching Neo4j/Frontend ports mapped inside Docker.

## Results: Lane A — Stability Soak (Validated)
*Purpose: Detect corruption, crash loops, deadlocks, startup regressions.*

| Metric | Result | Notes |
|:---|:---|:---|
| **Binary Stability** | ✅ PASSED | Server booted successfully and process remained alive for all 5 cycles. |
| **Health Endpoint** | ✅ PASSED | `/health` consistently returned `200 OK`. |
| **Latency** | ✅ PASSED | P95 latency for health checks was ~20-40ms. |

## Results: Lane B — Functional Soak (Not Validated)
*Purpose: Validate auth, GraphQL operations, and dependency connectivity.*

| Metric | Result | Notes |
|:---|:---|:---|
| **GraphQL Access** | ❌ FAILED | HTTP `403 Forbidden`. **Expected behavior** given the harness did not inject a valid prod-signed JWT. |
| **Dependencies** | ⚠️ MIXED | Postgres healthy. Neo4j/Frontend unreachable due to harness network isolation. |

## SMOKE_MODE=full Runs (Blocked/Failed)
### Prerequisites Checklist
- [ ] `pnpm install` completed in repo root (FAILED: Cypress postinstall)
- [x] `pnpm install` completed in worktree with Cypress override (PR #17451)
- [ ] API server running on `API_URL` (default `http://localhost:4000`)
- [ ] PostgreSQL reachable
- [ ] Neo4j reachable
- [ ] Redis reachable

### Soak Cycles
| Cycle | Timestamp (UTC) | Mode | Result | Notes |
|------:|-----------------|------|--------|-------|
| 0 | 2026-01-31T07:54:23Z | full | BLOCKED | `pnpm install` failed during Cypress postinstall (`chalk.blue is not a function`) |
| 1 | 2026-01-31T07:22:38Z | full | FAIL | `MODULE_NOT_FOUND: axios` while executing `server/scripts/smoke-test.cjs` |
| 2 | 2026-01-31T09:21:09Z | full | FAIL | Smoke run from `/tmp/cypress-fix` (PR #17451). All endpoints returned `Error` (server not running). |
| 3 | 2026-01-31T10:18:51Z | full | BLOCKED | Dev stack build failed in `services/er-service` (`requirements.txt` missing). |

### Failure Details (Install Blocker)
- **Error:** `TypeError: chalk.blue is not a function`
- **Location:** `/private/tmp/soak-pr/node_modules/log-symbols/index.js:6` via Cypress postinstall
- **Action:** Investigate Cypress/chalk dependency mismatch or rerun install with compatible toolchain.

### Failure Details (Cycle 1)
- **Error:** `Cannot find module 'axios'`
- **Location:** `/private/tmp/soak-pr/server/scripts/smoke-test.cjs`
- **Exit:** `ELIFECYCLE` (exit code 1)
- **Action:** Run `pnpm install` in repo root and re-run soak loop.

### Failure Details (Cycle 2)
- **Error:** Smoke checks failed for `/health`, `/health/live`, `/health/ready`, `/healthz`, `/readyz`, `/metrics`, `/api-docs/` with `Error` responses.
- **Action:** Start the API server on `http://localhost:4000` and re-run smoke loop.

### Failure Details (Cycle 3)
- **Error:** Dev stack build failed for `services/er-service` — Dockerfile expects `requirements.txt` but file is missing in repo.
- **Action:** Fix `services/er-service/Dockerfile` or add required file, then re-run `make dev-up`.

## Root Cause Analysis (Functional Failures)
The functional failures observed in Lane B are **harness-level artifacts**, not code regressions:
1. **403 Forbidden**: The server correctly enforced authentication. The soak harness needs a mechanism to generate valid JWTs or a bypass flag (`SOAK_MODE`) to validate GraphQL logic.
2. **Network Isolation**: The test runner (on host) could not verify connectivity to dependencies running inside Docker containers that didn't expose ports or resolve via DNS as expected by the config.

## Conclusion
The **Server Binary is Stable (Lane A Passed)**.
* ✅ **Binary/runtime stability validated** (boot, sustained uptime across cycles).
* ✅ **Health endpoint validated** (consistent 200s, low latency).
* ❌ **E2E functionality not validated in this run** due to explicit local auth and container networking constraints.

**Recommendation**: The `Smoke Gate` in CI is ready to merge for Lane A. Lane B (Functional) validation should be added as a follow-up with a dedicated integration harness.

## Next Steps
1. Resolve Cypress postinstall failure (chalk API mismatch).
2. Ensure API server + dependencies are running (Postgres, Neo4j, Redis).
3. Fix dev stack build for `services/er-service` if required by the soak environment.
4. Re-run soak loop:
   ```bash
   for i in {1..5}; do SMOKE_MODE=full pnpm run test:smoke || break; done
   ```
5. Update this report with pass/fail per cycle.
