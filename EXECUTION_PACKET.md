# Board-to-PR Execution Packet: Runtime Governance Enforcement

**Objective:** Deliver strict, evidence-backed runtime governance with "fail-closed" defaults.

---

## Phase 1: Sprint Plan (7 Days)

### Critical Path (Sequential)
1.  **Day 1: Recon & Contract Definition (PR1)**
    -   Define `GovernanceVerdict` and `SafetyLevel`.
    -   Create `server/src/types/governance.ts`.
2.  **Day 2: Verdict Core & Emitter (PR2)**
    -   Implement `VerdictEngine` to aggregate OPA/Policy/Safety inputs.
    -   Integrate into `server/src/governance/VerdictEngine.ts`.
3.  **Day 3: Tenant Isolation Middleware (PR3)**
    -   Upgrade `server/src/middleware/tenantContext.ts` to consume `GovernanceVerdict`.
    -   Enforce isolation in `server/src/tenancy/TenantIsolationGuard.ts`.
4.  **Day 4: Data Guardrails (PR4)**
    -   Inject Verdict into `server/src/services/DatabaseService.ts` and `server/src/db/neo4j.ts`.
    -   Enforce `WHERE tenant_id` clauses based on Verdict.
5.  **Day 5: Granular Kill Switch (PR5)**
    -   Refactor `server/src/middleware/safety-mode.ts`.
    -   Implement Tenant/Route-specific kill switches.
6.  **Day 6: Runtime Evidence (PR6)**
    -   Log full `GovernanceVerdict` in `server/src/middleware/audit-first.ts`.
    -   Generate NDJSON proof artifacts.
7.  **Day 7: CI Enforcement (PR7)**
    -   Add `governance-verify.yml` workflow.
    -   Block regressions.

### Parallel Lanes
*   **Lane A (Backend Logic):** PR2 -> PR3 -> PR4 -> PR5
*   **Lane B (Platform/Ops):** PR6 -> PR7 (Can start after PR1)

---

## Phase 2: PR Breakdown

### PR1: Governance Contract & Types
*   **Scope:** `server/src/types/governance.ts` (New), `server/src/governance/contracts.ts` (New)
*   **Risk:** Low
*   **Description:** Define the immutable `GovernanceVerdict` interface.
    ```typescript
    export interface GovernanceVerdict {
      allowed: boolean;
      reason: string;
      tenantId: string;
      isolationLevel: 'shared' | 'dedicated' | 'quarantined';
      features: string[];
      killSwitchActive: boolean;
      policyVersion: string;
      timestamp: number;
    }
    ```
*   **Validation:** `pnpm build`

### PR2: Verdict Core & Emitter
*   **Scope:** `server/src/governance/VerdictEngine.ts`, `server/src/middleware/verdict.ts`
*   **Risk:** Medium
*   **Description:**
    -   Create `VerdictEngine` class.
    -   Inputs: `TenantContext`, `SafetyState` (from `safety-mode.ts`), OPA results.
    -   Output: Signed `GovernanceVerdict`.
*   **Validation:** Unit tests in `server/src/governance/__tests__/VerdictEngine.test.ts`.

### PR3: Tenant Isolation Middleware Refactor
*   **Scope:** `server/src/middleware/tenantContext.ts`, `server/src/tenancy/TenantIsolationGuard.ts`
*   **Risk:** High
*   **Description:**
    -   Modify `tenantContextMiddleware` to call `VerdictEngine`.
    -   Pass `GovernanceVerdict` to `TenantIsolationGuard.assertTenantContext`.
    -   Implement `GOVERNANCE_MODE` feature flag (log vs enforce).
    -   FAIL CLOSED if verdict is missing or `allowed: false` (when enforced).
*   **Validation:** `curl -H "X-Tenant-ID: unauthorized_tenant" ...` returns 403.

### PR4: Data-Access Guardrails
*   **Scope:** `server/src/services/DatabaseService.ts`, `server/src/db/neo4j.ts`
*   **Risk:** High
*   **Description:**
    -   Modify `DatabaseService.query` to accept `GovernanceVerdict` in context.
    -   Throw error if query does not contain `tenant_id` matching the verdict.
    -   Modify Neo4j driver wrapper to inject tenant context into sessions.
*   **Validation:** Integration tests attempting cross-tenant queries must fail.

### PR5: Granular Kill Switch
*   **Scope:** `server/src/middleware/safety-mode.ts`, `server/src/tenancy/killSwitch.ts`
*   **Risk:** Medium
*   **Description:**
    -   Update `safetyModeMiddleware` to check `killSwitchService.isBlocked(tenantId, route)`.
    -   Add "Break Glass" header logic (requires specific secret).
*   **Validation:** Verify blocking a specific route for a specific tenant.

### PR6: Runtime Evidence Artifacts
*   **Scope:** `server/src/middleware/audit-first.ts`, `server/src/governance/EvidenceDroid.ts`
*   **Risk:** Low
*   **Description:**
    -   Ensure `auditFirstMiddleware` captures the final `GovernanceVerdict`.
    -   Write to `audit_log` with `verdict_hash`.
*   **Validation:** Check generated logs for `verdict` field.

### PR7: CI Governance Gate
*   **Scope:** `.github/workflows/governance-verify.yml`, `scripts/verify-governance.ts`
*   **Risk:** Low
*   **Description:**
    -   New CI job that runs a "Red Team" script.
    -   Script attempts to bypass isolation and asserts 403.
*   **Validation:** Job passes on clean branch, fails if middleware is disabled.

---

## Phase 3: Merge Plan (Golden Path)

1.  **PR1 & PR2** (Foundational) - Merge First.
2.  **PR3** (Enforcement) - Merge with `GOVERNANCE_MODE=log_only` feature flag initially.
    -   Monitor logs for 24h.
    -   Flip to `enforce` (fail-closed).
3.  **PR4** (Data Layer) - Merge after PR3 is stable.
4.  **PR5, PR6, PR7** - Can be merged independently after PR3.

---

## Phase 4: Risk Register

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **False Positives** | Legitimate traffic blocked (403) | Deploy PR3 in `log_only` mode first. Analyze logs for false flags. |
| **Performance** | Latency increase per request | Cache `GovernanceVerdict` in Redis (60s TTL) for hot tenants. |
| **Admin Lockout** | Kill switch blocks Admin API | Implement physical "Break Glass" token (env var `BREAK_GLASS_TOKEN`). |
| **Legacy Compat** | V1 API breaks under strict rules | Exempt `/api/v1` temporarily OR auto-grant "Legacy" isolation level. |

---

## Phase 5: Codex Prompts (Hand-off)

### Prompt for PR1 (Contracts)
```text
Create `server/src/types/governance.ts` defining the `GovernanceVerdict` interface:
{ allowed: boolean; reason: string; tenantId: string; isolationLevel: 'shared' | 'dedicated' | 'quarantined'; features: string[]; killSwitchActive: boolean; policyVersion: string; timestamp: number; }
Also create `server/src/governance/contracts.ts` with a Zod schema validation for this interface.
Run `pnpm build` to verify types are correct.
```
**Post-Merge Follow-up:** None.

### Prompt for PR2 (Verdict Engine)
```text
Create `server/src/governance/VerdictEngine.ts`.
It should have a method `generateVerdict(context: TenantContext): Promise<GovernanceVerdict>`.
Logic:
1. Check SafetyMode (global kill switch).
2. Check TenantIsolationGuard (policy).
3. Return allowed=false if any check fails.
Write unit tests in `server/src/governance/__tests__/VerdictEngine.test.ts` covering both allow and deny scenarios.
```
**Post-Merge Follow-up:** Verify test coverage metrics.

### Prompt for PR3 (Middleware)
```text
Refactor `server/src/middleware/tenantContext.ts`.
Import `VerdictEngine`.
In `tenantContextMiddleware`, generate a verdict.
Check `process.env.GOVERNANCE_MODE`:
- If 'enforce': If `verdict.allowed` is false, return 403 immediately.
- If 'audit' (default): Log a warning if `verdict.allowed` is false but proceed.
Attach `verdict` to `req.tenantContext`.
Use `TenantIsolationGuard` to validate the verdict consistency.
```
**Post-Merge Follow-up:** Set `GOVERNANCE_MODE=audit` in staging environment.

### Prompt for PR4 (DB Guardrails)
```text
Modify `server/src/services/DatabaseService.ts` and `server/src/db/neo4j.ts`.
Update `query()` methods to accept an optional `GovernanceVerdict`.
For Postgres: Ensure the SQL query string contains `$1` (assumed tenant_id) AND the first parameter matches `verdict.tenantId`.
For Neo4j: Ensure the session or query parameters inject `tenantId` and verify the query uses it.
Throw `SecurityError` if mismatch or missing tenant ID.
```
**Post-Merge Follow-up:** Monitor DB error logs for `SecurityError`.

### Prompt for PR5 (Kill Switch)
```text
Refactor `server/src/middleware/safety-mode.ts`.
Update the logic to support granular targeting.
Check `killSwitchService.isBlocked(tenantId, route)` in addition to global switch.
Implement "Break Glass": If `X-Break-Glass-Token` header matches `process.env.BREAK_GLASS_TOKEN`, bypass the kill switch but log a high-severity audit event.
```
**Post-Merge Follow-up:** Rotate `BREAK_GLASS_TOKEN` in secrets manager.

### Prompt for PR6 (Evidence)
```text
Refactor `server/src/middleware/audit-first.ts`.
Extract the `GovernanceVerdict` from `req.tenantContext`.
Include the full verdict object (or a hash of it) in the structured audit log entry.
Ensure the `verdict.reason` is captured clearly for rejected requests.
```
**Post-Merge Follow-up:** Verify NDJSON logs in the logging aggregator.

### Prompt for PR7 (CI Gate)
```text
Create `.github/workflows/governance-verify.yml`.
It should run `scripts/verify-governance.ts`.
Create `scripts/verify-governance.ts`:
- Start the server in `GOVERNANCE_MODE=enforce`.
- Send a request with a valid token but invalid tenant context (spoofing).
- Assert that the response is 403.
- Send a request to a kill-switched route.
- Assert that the response is 503.
```
**Post-Merge Follow-up:** Add this workflow to the "Required Checks" list in GitHub branch protection.

---

## Phase 6: Reviewer Checklists

**PR1 Checklist (Contracts)**
- [ ] Interface matches the design (includes `timestamp`, `policyVersion`).
- [ ] Zod schema strictly matches the TypeScript interface.
- [ ] No runtime logic in this PR, only types/schemas.

**PR2 Checklist (Verdict Engine)**
- [ ] Unit tests cover "Global Kill Switch Active" scenario.
- [ ] Unit tests cover "Policy Deny" scenario.
- [ ] `generateVerdict` is deterministic (same inputs = same output).

**PR3 Checklist (Middleware)**
- [ ] **Crucial:** Verify `GOVERNANCE_MODE` logic. Does it default to 'audit' or 'log_only' if unset?
- [ ] Verify that 403 responses include the `verdict.reason` (unless in production where it might leak info).
- [ ] Ensure `next()` is NOT called when mode is 'enforce' and verdict is deny.

**PR4 Checklist (DB Guardrails)**
- [ ] Verify SQL regex/parser correctly identifies the tenant ID parameter.
- [ ] Verify Neo4j logic prevents Cypher injection of tenant IDs.
- [ ] Check performance impact of the query parsing logic.

**PR5 Checklist (Kill Switch)**
- [ ] Verify "Break Glass" token is not logged in plaintext.
- [ ] Verify that the kill switch is checked *before* any business logic.
- [ ] Ensure tenant-specific kill switch doesn't affect other tenants.

**PR6 Checklist (Evidence)**
- [ ] Verify `verdict` field is present in audit logs.
- [ ] Ensure sensitive data in verdict (if any) is redacted.

**PR7 Checklist (CI Gate)**
- [ ] Verify the script uses a fresh/clean environment.
- [ ] Ensure the test fails if the server returns 200 OK (false negative).
- [ ] Check execution time (should be fast).

---

## Appendix: Jules Daily Standup Driver

**Prompt:**
```text
Jules, run the Daily Standup for the Governance Sprint.
1. Check the status of the current PR in the sequence.
2. Run its specific verification command (e.g., `pnpm test ...`).
3. If Pass: Mark as "Ready to Merge" and output the `submit` tool call.
4. If Fail: List the specific errors and switch to "Fix Mode".
5. Update the Risk Register if new issues were found.
Stoplight Report: [Green/Yellow/Red]
```
