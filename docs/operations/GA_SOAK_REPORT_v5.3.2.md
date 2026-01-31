# GA Soak Report - v5.3.2

## Overview
This report summarizes the performance and stability of the Summit Platform v5.3.2 GA release under a 5-cycle "soak" simulation.

## Simulation Metadata
- **Date**: 2026-01-31
- **Cycles**: 5
- **Mode**: Standalone (Server binary + Dockerized DBs)
- **Target**: `localhost:4001` (Direct Server)

## Environment Constraints
- **Run Mode**: Standalone server binary running on host port `4001`.
- **Dependencies**: Dockerized PostgreSQL and Redis. Neo4j and Frontend were not accessible to the test runner.
- **Auth Config**: Default production settings (requiring valid JWTs), while the harness used a dev/test token or no token.
- **Networking**: Host-to-Container isolation prevented the test runner from reaching Neo4j/Frontend ports mapped inside Docker.

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

## Root Cause Analysis (Functional Failures)
The functional failures observed in Lane B are **harness-level artifacts**, not code regressions:
1.  **403 Forbidden**: The server correctly enforced authentication. The soak harness needs a mechanism to generate valid JWTs or a bypass flag (`SOAK_MODE`) to validate GraphQL logic.
2.  **Network Isolation**: The test runner (on host) could not verify connectivity to dependencies running inside Docker containers that didn't expose ports or resolve via DNS as expected by the config.

## Conclusion
The **Server Binary is Stable (Lane A Passed)**.
*   ✅ **Binary/runtime stability validated** (boot, sustained uptime across cycles).
*   ✅ **Health endpoint validated** (consistent 200s, low latency).
*   ❌ **E2E functionality not validated in this run** due to explicit local auth and container networking constraints.

**Recommendation**: The `Smoke Gate` in CI is ready to merge. It correctly enforces Lane A (Stability) which is the prerequisite for deployment. Lane B (Functional) validation should be added as a follow-up with a dedicated integration harness.
