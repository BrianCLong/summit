# Performance & Reliability Packet: Runtime Governance Enforcement

**Owner**: Jules (Orchestrator)
**Scope**: Runtime Governance (Verdict, Kill Switch, Tenant Isolation, Evidence)
**Status**: Draft

## Objective
Define performance and reliability requirements for `GovernanceVerdict` evaluation, tenant isolation checks, kill switch evaluation, and runtime evidence artifact writing. Ensure governance checks do not degrade latency or availability, and that failures are safe and diagnosable.

## A) Performance Budget

| Component | Metric | Target (P50) | Target (P95) | Target (P99) | Max Allocations | Action if Exceeded |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Governance Verdict** | Latency per request | < 1ms (Local)<br>< 5ms (Remote) | < 5ms (Local)<br>< 20ms (Remote) | < 10ms (Local)<br>< 50ms (Remote) | Low (No heavy JSON parsing on hot path) | Log warning, sample trace. If > 100ms, fail open (if configured) or fast fail. |
| **Kill Switch** | Evaluation Latency | < 0.1ms | < 2ms (Cached) | < 5ms | Zero/Near-zero | Fallback to "Active" (Fail Safe) or Last Known Good. |
| **Tenant Isolation** | Check Latency | < 1ms | < 5ms | < 10ms | Low | 403 Forbidden. |
| **Artifact Writing** | Boot Time Impact | < 100ms | < 500ms | < 1s | N/A | Log error, continue startup (unless strict mode). |
| **Artifact Writing** | Request Path Impact | **0ms** | **0ms** | **0ms** | 0 | **STRICT FORBIDDEN**. Move to async queue. |

**Budget Enforcement:**
*   **Verdict/Kill Switch**: Instrumented via `featureFlagLatency` histogram in `OPAFeatureFlagClient`.
*   **Tenant Check**: Monitor `tenantValidator` middleware duration.
*   **Garbage Collection**: Monitor GC pause times; governance objects should be stable shapes to allow efficient inline caching.

## B) Reliability Model

### 1. Policy File Missing / Corrupt
*   **Scenario**: `GOVERNANCE_POLICY_PACK.yml` or OPA bundles are missing/corrupt on startup.
*   **Behavior**:
    *   **Startup**: **FAIL FAST**. Service must NOT start without valid policy.
    *   **Runtime Update**: Reject update, keep using **Last Known Good (LKG)** version. Log `POLICY_UPDATE_FAILED` error.
*   **Verdict**: N/A (Service Down) or Use LKG.

### 2. Policy Hash Computation Fails
*   **Scenario**: Runtime cannot compute SHA256 of loaded policy.
*   **Behavior**: Treat as Corrupt Policy (see above).
*   **Signal**: Log `POLICY_INTEGRITY_CHECK_FAILED`.

### 3. Kill Switch Config Fetch Fails (OPA/Remote)
*   **Scenario**: Connection to OPA or Feature Flag service fails.
*   **Behavior**:
    *   **Fail Closed (Default)**: Assume critical features might need protecting. However, for a *general* kill switch, "Fail Open" (allow traffic) is often preferred to avoid outage due to config plane failure, UNLESS the kill switch is strictly for safety (e.g. AI Safety).
    *   **Decision**: **Fail Safe**. Use **Last Known Good** cache. If no cache (cold boot + network fail), default to **ACTIVE** (Kill Switch ON) for high-risk modules (AI), **INACTIVE** (Kill Switch OFF) for core infra.
*   **Status Code**: `503 Service Unavailable` (if blocked).

### 4. Tenant Derivation Fails (Auth Issues)
*   **Scenario**: JWT valid but `tenantId` missing or malformed in `TenantValidator`.
*   **Behavior**: **Block Request**.
*   **Verdict**: `DENY`.
*   **Status Code**: `401 Unauthorized` or `403 Forbidden`.
*   **Signal**: `security.tenant.missing_context` metric increment.

### 5. Evidence Write Fails on Boot
*   **Scenario**: Cannot write `boot.json` or evidence artifacts to `artifacts/governance/runtime/`.
*   **Behavior**:
    *   **Strict Mode (High Assurance)**: **CRASH**. Do not start without audit trail.
    *   **Standard Mode**: Log `EVIDENCE_WRITE_FAILED` error, emit metric, **CONTINUE** startup.
    *   **Mitigation**: Alert immediately.

## C) Caching & Consistency Strategy

### 1. Caching Policy
*   **OPA/Policy Decisions**:
    *   **Location**: In-memory (LRU Cache) within `OPAFeatureFlagClient`.
    *   **TTL**: Short (e.g., 30-60 seconds) or Event-Driven (Webhooks/Bus).
    *   **Key**: `Hash(Input + Context)`.
*   **Kill Switch State**:
    *   **Location**: Atomic Boolean / local variable in `KillSwitchService`.
    *   **Update**: Polling (every 30s) or Push.
    *   **TTL**: Infinity (updates overwrite).
*   **Tenant Context**:
    *   **Location**: Request Context (per-request).
    *   **Session**: Validated against Redis (if stateful) with 5-minute TTL for revocation checks.

### 2. Invalidation & LKG
*   **Invalidation**:
    *   On Policy Update Event: Flush Decision Cache.
    *   On Tenant Config Change: Flush related Tenant Cache entries.
*   **Last Known Good (LKG)**:
    *   Always keep the last successfully validated Policy Bundle in memory.
    *   If a new bundle fails validation, rollback to LKG immediately.

## D) Load & Stress Test Plan

### 1. Scenarios
*   **Baseline**: 100 RPS, 0% kill switch active. Measure latency.
*   **Stress**: 1000 RPS, 50% mixed kill switch/policy checks.
*   **Denial Storm**: 5000 RPS, 100% blocked by Policy (Verify CPU usage of "Deny" path is lower than "Allow" path).
*   **Reconfiguration**: Update policy file every 1 second while under load (Verify no locking contention).

### 2. Metrics to Watch
*   `http_request_duration_seconds{middleware="governance"}`
*   `opa_client_latency_seconds`
*   `governance_decision_count{result="deny"}`
*   `process_cpu_usage` (Governance should be CPU-bound, not I/O bound)

### 3. Simulation Script (K6)
*   Create `scripts/load/governance_stress.js` using `k6`.
*   Simulate headers: `X-Tenant-ID`, `X-Purpose`.

## E) CI/Release Gates

### 1. Unit Tests
*   `server/src/governance/__tests__/PolicyService.test.ts`:
    *   Mock OPA failure -> Verify Fail Closed/LKG behavior.
    *   Mock File System failure -> Verify Boot failure (if strict).
*   `server/src/middleware/__tests__/tenantValidator.test.ts`:
    *   Verify `tenantId` injection and rejection logic.

### 2. Integration Tests (Startup)
*   **Governance Boot Check**: A test that runs `npm start` with a corrupt policy file and asserts process exit code != 0.
*   **Artifact Check**: Verify `artifacts/governance/runtime/<sha>/boot.json` exists after successful start.

### 3. Benchmark (Non-Blocking)
*   Run `k6` script against a localized staging env.
*   Warn if `p95` > 10ms increase vs main.

## F) PR Work Plan

| Issue | Title | Scope | Acceptance Criteria | Verification Commands | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Instrument Governance Middleware** | `server/src/middleware/governance.ts`, `metrics.ts` | Add Prometheus histograms for validation steps. Verify metrics appear in `/metrics`. | `curl localhost:3000/metrics \| grep governance` | N/A |
| 2 | **Implement LKG Strategy for OPA Client** | `server/src/feature-flags/opaFeatureFlagClient.ts` | Cache last successful config. On fetch error, return cached value + log warn. | `pnpm test server/src/feature-flags/__tests__/opa.test.ts` | Issue #1 |
| 3 | **Boot Evidence Generation** | `server/src/app.ts`, `EvidenceService.ts` | Write `boot.json` (SHA of policy, timestamp, env) to disk on startup. Async, non-blocking for request path. | `ls artifacts/governance/runtime/*/boot.json` | Issue #2 |
| 4 | **Strict Mode Tenant Validator** | `server/src/middleware/tenantValidator.ts` | Ensure `TenantValidator` throws 403/500 correctly on context failures. Add `failClosed` config option. | `pnpm test server/src/middleware/__tests__/tenantValidator.test.ts` | Issue #1 |
| 5 | **Async Artifact Writer Queue** | `server/src/services/ArtifactService.ts` | Create an async queue for writing runtime artifacts (e.g. decision logs) to disk/S3 to keep hot path 0ms I/O. | `pnpm test server/src/services/__tests__/ArtifactService.test.ts` | Issue #3 |
| 6 | **Governance Load Test Script** | `scripts/load/governance_stress.js` | Create K6 script for scenarios defined in Section D. | `k6 run scripts/load/governance_stress.js` | Issue #4 |
| 7 | **Docs: Governance Operations** | `docs/ops/governance_operations.md` | Document these failure modes, budgets, and recovery steps for SREs. | `grep "Governance Operations" docs/ops/governance_operations.md` | Issue #6 |
