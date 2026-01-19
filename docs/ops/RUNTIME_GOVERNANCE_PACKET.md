# Ops & Observability Packet: Runtime Governance Enforcement

**Objective**: Define minimum viable observability and operational controls for safe operation of GovernanceVerdict propagation, Tenant isolation, Kill switches, and Runtime evidence artifacts.

---

## A) Telemetry Contract

### 1. Log Event: `governance.verdict`
This event captures every policy enforcement decision at the edge and internal gates.

*   **Structure**:
    ```json
    {
      "event": "governance.verdict",
      "timestamp": "2023-10-27T10:00:00.123Z",
      "request_id": "req-123-abc",
      "tenant_id": "tenant-001",
      "actor_id": "user-456",
      "route": "/api/v1/investigations/123",
      "method": "POST",
      "status": "deny",
      "reason_codes": ["policy_violation_geo_fence", "insufficient_clearance"],
      "policy_version": "v1.2.3",
      "capability": "investigation:write",
      "duration_ms": 45,
      "error_code": "403_FORBIDDEN"
    }
    ```
*   **Field Definitions**:
    *   `status`: Enum `['allow', 'deny', 'degrade', 'escalate']`.
    *   `reason_codes`: Array of stable strings (e.g., `CROSS_TENANT_ACCESS_DENIED`, `KILL_SWITCH_ACTIVE`).
    *   `policy_version`: The active OPA bundle version or policy git SHA.

### 2. Log Event: `governance.kill_switch_change`
This event records changes to the kill switch state, whether triggered by admin action or automated circuit breaking.

*   **Structure**:
    ```json
    {
      "event": "governance.kill_switch_change",
      "timestamp": "2023-10-27T10:05:00.000Z",
      "actor_id": "admin-super-1",
      "change_source": "admin_console",
      "mode_before": "OFF",
      "mode_after": "READ_ONLY",
      "scope": "global",
      "tenant_id": null,
      "route_pattern": null,
      "policy_version": "v1.2.4",
      "reason": "Emergency maintenance due to DB load"
    }
    ```
*   **Modes**: `OFF`, `DENY_ALL`, `READ_ONLY`, `ROUTE_DENY`.

### 3. Log Event: `governance.break_glass_use`
This event captures the use of high-privilege overrides.

*   **Structure**:
    ```json
    {
      "event": "governance.break_glass_use",
      "timestamp": "2023-10-27T10:10:00.000Z",
      "request_id": "req-999-xyz",
      "tenant_id": "tenant-001",
      "actor_id": "user-789",
      "route": "/api/admin/reset",
      "approved": true,
      "reason_codes": ["emergency_override"],
      "justification": "Fixing stuck transaction",
      "policy_version": "v1.2.4"
    }
    ```

### 4. Metric Recommendations
*   **Counters**:
    *   `governance_verdicts_total{status="allow|deny", route_group="investigations"}`: High-level volume.
    *   `governance_denies_total{reason_code="CROSS_TENANT"}`: Alerting signal for specific policy failures.
    *   `governance_kill_switch_changes_total{scope="global", mode="READ_ONLY"}`: Auditing frequency of safety mechanisms.
*   **Histograms**:
    *   `governance_decision_duration_ms{route_group="investigations", status="allow"}`: Latency overhead of governance.
*   **Gauges**:
    *   `governance_kill_switch_active{module="all", scope="global"}`: 1 if active, 0 if inactive.

**Route Group Normalization**:
To prevent high cardinality, map specific paths (e.g., `/api/v1/users/123`) to groups (e.g., `api_users_detail`). Do not use raw paths in metric labels.

---

## B) Operational Procedures

### 1. Verifying Tenant Isolation
**Objective**: Confirm that a user from Tenant A cannot access resources in Tenant B.

1.  **Preconditions**: Two active tenants (A and B) and a user in Tenant A with a valid token.
2.  **Action**:
    *   Make a request to a Tenant B resource using Tenant A's token.
    *   Example: `GET /api/v1/tenants/tenant-b/investigations` with `Authorization: Bearer <token-tenant-a>`.
3.  **Expected Signal**:
    *   HTTP 403 Forbidden (or 404 Not Found if strict isolation hides existence).
    *   Log event `governance.verdict` with `status="deny"` and `reason_codes=["CROSS_TENANT_ACCESS_DENIED"]`.
    *   Metric increment `governance_denies_total{reason_code="CROSS_TENANT_ACCESS_DENIED"}`.

### 2. Engaging Kill Switch
**Objective**: Immediately stop traffic or restrict operations during an incident.

#### Scenario: READ_ONLY (Global)
1.  **Action**: Update the OPA policy or feature flag configuration to set `kill_switch.global.mode = "READ_ONLY"`.
    *   *(Specific command depends on config store, e.g., OPA API or env var update)*.
2.  **Expected Signal**:
    *   POST/PUT/DELETE requests return 503 Service Unavailable.
    *   Log event `governance.kill_switch_change` appears.
    *   Gauge `governance_kill_switch_active{module="global"}` sets to 1.
3.  **Verification**: Attempt a POST request; expect 503 and a JSON body citing the kill switch.

### 3. Using Break-Glass Safely
**Objective**: Bypass restrictions for emergency fixes.

1.  **Prerequisites**: Actor must have `SUPER_ADMIN` or `SYSTEM` role.
2.  **Action**:
    *   Include a specific header or claim, e.g., `X-Summit-Privilege: break-glass`.
    *   *Note*: Ensure `privilegeTier` in `TenantContext` resolves to `break-glass`.
3.  **Audit Expectations**:
    *   Every request is logged with `governance.break_glass_use`.
    *   Alert "Break Glass Usage Detected" fires immediately to the Security Operations Center.

### 4. Disengaging Kill Switch
1.  **Action**: Revert the configuration change (set mode to `OFF`).
2.  **Verification**:
    *   Gauge `governance_kill_switch_active` drops to 0.
    *   Traffic returns to normal success rates.

### 5. Emergency Rollback Decision Tree
*   **If denials spike > 10%**:
    1.  Check `governance_denies_total` by `reason_code`.
    2.  If `reason_code` is `OPA_ERROR` or `POLICY_EVAL_FAILED`: **Disable Enforcement** (Fail Open) if safe, otherwise rollback deployment.
    3.  If `reason_code` is valid (e.g., `CROSS_TENANT`): Investigate potential attack or client bug. Do NOT disable enforcement.
*   **If Kill Switch engages unexpectedly**:
    1.  Check `governance.kill_switch_change` for the source.
    2.  If source is `system` (automated), investigate trigger (e.g., error rate threshold).
    3.  If source is `unknown`, treat as compromise.

---

## C) Incident Diagnostics Playbook

### 1. "Sudden spike in tenant isolation denials"
*   **Symptom**: `governance_denies_total` spikes for `reason_code="CROSS_TENANT_ACCESS_DENIED"`.
*   **Probable Causes**:
    *   Client bug sending wrong Tenant ID.
    *   New deployment changing route parameter logic.
    *   Malicious scanning.
*   **Mitigation**:
    *   Identify the `actor_id` or `IP` driving the spike.
    *   If single actor: Block user/IP.
    *   If widespread: Check recent frontend/client releases.
*   **Evidence**:
    *   Query: `json.event:"governance.verdict" AND json.status:"deny"`
    *   Artifacts: `artifacts/governance/runtime/<sha>/` logs.

### 2. "Client reports missing governance headers"
*   **Symptom**: API returns 400/403 with `Invalid governance context`.
*   **Probable Causes**:
    *   Frontend not sending `X-Purpose`, `X-Legal-Basis`.
    *   Middleware configuration changed to `strictMode: true` unexpectedly.
*   **Mitigation**:
    *   Temporarily disable `strictMode` in `GovernanceConfig` if it blocks critical traffic.
*   **Evidence**:
    *   Logs with `message: "Invalid governance context"`.

### 3. "Kill switch engaged unexpectedly"
*   **Symptom**: 503 errors on specific routes or globally.
*   **Probable Causes**:
    *   Automated circuit breaker false positive.
    *   Admin error.
    *   OPA policy sync issue (defaulting to safe mode).
*   **Mitigation**:
    *   Force override via env var `KILL_SWITCH_OVERRIDE=OFF` if available.
    *   Restart OPA/Policy agents.

### 4. "Break-glass approvals failing"
*   **Symptom**: Super admins getting 403s.
*   **Probable Causes**:
    *   `privilegeTier` logic broken in `TenantValidator`.
    *   Identity provider claims missing `roles: ["SUPER_ADMIN"]`.
*   **Mitigation**:
    *   Use database-direct access if API is unreachable.
    *   Check JWT claims.

---

## D) Evidence & Audit Linkage

*   **Runtime Boot Snapshot**:
    *   Path: `artifacts/governance/runtime/<sha>/boot.json`
    *   Key Fields: `policy_version`, `env_vars_hash`, `start_time`.
*   **Runtime Reports**:
    *   `TelemetryLayer` writes to `governance_events.jsonl`.
    *   This file is the authoritative audit trail.
*   **Correlation**:
    *   The `request_id` in `governance_events.jsonl` matches the `X-Request-Id` header in the HTTP response.
    *   This ID links the `GovernanceVerdict` (log) to the `Trace` (Jaeger) and the `Audit` (database).
*   **Preservation**:
    *   On incident, archive `governance_events.jsonl` and `server/logs/*.log`.
    *   Tag with Incident ID.

---

## E) PR Work Plan

### PR 1: Implement Canonical Telemetry Logger
*   **Title**: `feat(observability): Implement canonical governance telemetry logger`
*   **Why**: Current logging is unstructured or disparate. We need a unified `logVerdict` and `logKillSwitch` helper.
*   **Scope**: Create `server/src/governance/logger.ts`. Integrate into `middleware/governance.ts`.
*   **Files**: `server/src/governance/logger.ts`, `server/src/middleware/governance.ts`.

### PR 2: Add Governance Metrics
*   **Title**: `feat(metrics): Add Prometheus metrics for governance verdicts`
*   **Why**: No real-time visibility into denial rates or reasons.
*   **Scope**: Add counters/histograms to `server/src/monitoring/metrics.ts`. Instrument `GovernanceMiddleware`.
*   **Files**: `server/src/monitoring/metrics.ts`, `server/src/middleware/governance.ts`.

### PR 3: Instrument Kill Switch Logging
*   **Title**: `feat(kill-switch): Add structured logging and metrics to kill switch`
*   **Why**: Kill switch activation is currently just a 503. We need an audit trail (`governance.kill_switch_change`).
*   **Scope**: Update `OPAFeatureFlagClient` to use the new telemetry logger.
*   **Files**: `server/src/feature-flags/opaFeatureFlagClient.ts`.

### PR 4: Enhance Tenant Validator logging
*   **Title**: `feat(tenancy): structured logging for tenant isolation events`
*   **Why**: Tenant denials need to match the standard `governance.verdict` format.
*   **Scope**: Update `TenantValidator.ts` to log via the new helper instead of raw `logger.error`.
*   **Files**: `server/src/middleware/tenantValidator.ts`.

### PR 5: Break-Glass Audit
*   **Title**: `feat(security): Audit log for break-glass usage`
*   **Why**: High-privilege access must be auditable.
*   **Scope**: Detect `privilegeTier === 'break-glass'` in middleware and emit `governance.break_glass_use`.
*   **Files**: `server/src/middleware/tenantValidator.ts` or `server/src/middleware/tenantContext.ts`.

### PR 6: Documentation & Runbooks
*   **Title**: `docs(ops): Add Runtime Governance Runbooks`
*   **Why**: Ops team needs the manual.
*   **Scope**: Commit `docs/ops/RUNTIME_GOVERNANCE_PACKET.md` (this file) and link from `docs/README.md`.
*   **Files**: `docs/ops/RUNTIME_GOVERNANCE_PACKET.md`.

### PR 7: Secrets Leak Prevention Test
*   **Title**: `test(security): Add regression test for secret leakage in logs`
*   **Why**: Ensure `reason_codes` or payloads don't accidentally contain tokens.
*   **Scope**: Add a test that mocks the logger and verifies no sensitive patterns (Bearer, eyJ...) appear in governance logs.
*   **Files**: `server/src/governance/__tests__/logger.test.ts`.
