# Backwards Compatibility & Client Impact Packet: Runtime Governance Enforcement

**Owner:** Jules (Orchestrator)
**Status:** DRAFT
**Scope:** Runtime Governance (Tenant Isolation, Kill Switches, Verdict Propagation)

## Objective
Define how Summit will introduce `GovernanceVerdict` propagation, strict tenant isolation, and kill switch behaviors without breaking existing clients (Web, Mobile, API integrations) while achieving fail-closed governance.

## Operating Rules
* **Additive First:** Emit verdicts and signals before enforcing blocks.
* **Fail-Safe Defaults:** Use `strictMode: false` (Permissive) initially.
* **Feature Flagged:** Tightening enforcement requires a feature flag and a rollback plan.
* **Observability:** Every enforcement decision must emit a metric and log event.

---

## A) Client Surface Inventory (Risk Assessment)

### 1. HTTP Response Headers
*   **Risk:** Low (Browsers ignore unknown headers).
*   **Change:** Injecting `X-Governance-Status`, `X-Governance-Policy-Version`, `X-Governance-Verdict`.
*   **Detection:** Check `Access-Control-Expose-Headers` if clients need to read them.
*   **Mitigation:** Ensure headers are small to avoid overflow.

### 2. Response Envelope (JSON)
*   **Risk:** Medium.
*   **Context:** `client/src/utils/data-envelope-validator.ts` enforces `DataEnvelope` structure.
*   **Change:** Populating `governanceVerdict` field (currently `any`).
*   **Potential Breakage:** If `governanceVerdict` is populated with a complex object that triggers strict validation logic (though currently `any`, future schemas might be stricter).
*   **Detection:** Client-side logs "Validation warnings".

### 3. Error Status Codes
*   **Risk:** High.
*   **Context:** `TenantContextMiddleware` (400, 403, 409) and `KillSwitchGuard` (503).
*   **Change:** Enforcing these middleware on *all* routes.
*   **Potential Breakage:**
    *   Legacy clients sending requests without `X-Tenant-Id` or `X-Purpose`.
    *   Clients not handling 503 (Kill Switch) with retries.
    *   Clients treating 403 (Policy Deny) as a generic "logout" trigger.
*   **Detection:** Spikes in 4xx/5xx rates on `/api/*`.

### 4. Governance Headers (Request)
*   **Risk:** High (if enforced).
*   **Context:** `X-Purpose`, `X-Legal-Basis`.
*   **Change:** Moving from optional -> warned -> required.
*   **Potential Breakage:** All existing `fetch` calls in `client/` currently lack these headers.
*   **Mitigation:** `strictMode: false` in `GovernanceMiddleware` applies defaults (`general_access`) instead of rejecting.

---

## B) Compatibility Strategy (Staged Rollout)

### Stage 0: Silent Emission (Current)
*   **Goal:** Validate logic without blocking.
*   **Config:** `strictMode: false`, `dryRun: true`.
*   **Behavior:**
    *   Missing headers -> Apply Default Context (Log Warning).
    *   Tenant Mismatch -> Log Warning (if safely possible) or Block (if critical).
    *   Verdict -> Calculated but not acted upon.
*   **Exit Criteria:** 100% of legitimate traffic identified; <1% "unknown" purpose logs.

### Stage 1: Additive Propagation
*   **Goal:** Clients receive governance info.
*   **Action:**
    *   Enable `X-Governance-Status` header.
    *   Populate `governanceVerdict` in Data Envelopes.
*   **Verification:** Verify `data-envelope-validator.ts` does not crash on new field.

### Stage 2: High-Risk Enforcement (Tenant Isolation)
*   **Goal:** Secure critical paths.
*   **Scope:** `/api/billing`, `/api/tenants`, `/api/admin`.
*   **Action:** Set `requireExplicitTenant: true` and `validateOwnership: true` for these routes.
*   **Observability:** Alert on `TenantValidator` denial spikes.
*   **Feature Flag:** `gov.enforce_strict_tenancy`.

### Stage 3: Universal Enforcement (Kill Switch & Strict Mode)
*   **Goal:** Full governance.
*   **Action:**
    *   Enable `strictMode: true` for `GovernanceMiddleware`.
    *   Enable `KillSwitchGuard` for all modules.
*   **Prerequisite:** All client `fetch` calls updated to send `X-Purpose`.
*   **Rollback:** Revert to `strictMode: false` via env var `GOVERNANCE_STRICT_MODE`.

---

## C) Contract Definition

### Headers
| Header Name | Type | Description |
|---|---|---|
| `X-Governance-Status` | Response | `allow` \| `deny` \| `warn` |
| `X-Governance-Reason` | Response | Code explaining the verdict (e.g., `POLICY_VIOLATION`) |
| `X-Tenant-Id` | Both | The resolved tenant context |
| `X-Purpose` | Request | **REQUIRED** in Stage 3. Default: `general_access`. |

### Error Mapping Rules

| Condition | HTTP Status | Reason Code | Client Action |
|---|---|---|---|
| Missing Tenant Context | 400 Bad Request | `TENANT_REQUIRED` | Re-auth or prompt user |
| Cross-Tenant Access | 403 Forbidden | `CROSS_TENANT` | Show permission error |
| Policy Violation (Runtime) | 403 Forbidden | `POLICY_DENY` | Show "Action Blocked by Policy" toast |
| Kill Switch Active | 503 Service Unavailable | `KILL_SWITCH` | Retry with backoff / Show Maintenance Mode |
| Read-Only Mode | 405 Method Not Allowed | `READ_ONLY` | Disable write UI elements |

---

## D) Client-Test Matrix

| Test Name | Location | Type | Assertions |
|---|---|---|---|
| `Governance Header Emission` | `e2e/governance.spec.ts` | Integration | Verify `X-Governance-Status` exists in response |
| `Envelope Compatibility` | `client/src/utils/data-envelope-validator.test.ts` | Unit | `validateDataEnvelope` passes with populated `governanceVerdict` |
| `Missing Purpose Fallback` | `server/src/middleware/__tests__/governance.test.ts` | Unit | `strictMode: false` allows request & logs warning |
| `Kill Switch Behavior` | `e2e/kill-switch.spec.ts` | E2E | Active switch returns 503; Client shows maintenance banner |
| `Tenant Isolation Block` | `e2e/tenancy.spec.ts` | E2E | Cross-tenant request returns 403 |

---

## E) Communications & Migration Notes

**Migration Note for Developers:**
> "We are enabling Runtime Governance. Phase 1 is additive. Please ensure your local environment has `GOVERNANCE_STRICT_MODE=false`. If you see 'Invalid governance context' errors, ensure your API requests include `X-Purpose` header or rely on the default `general_access` fallback."

**Breaking Change Checklist:**
- [ ] Audit all `fetch` calls in `client/` for `X-Purpose`.
- [ ] Verify `validateDataEnvelope` ignores extra fields.
- [ ] Set `GOVERNANCE_STRICT_MODE=false` in all environments.

---

## F) PR Work Plan

### 1. `feat(gov): Add Governance Response Headers`
*   **Scope:** `server/src/middleware/governance.ts`
*   **Action:** Inject `X-Governance-Status`, `X-Governance-Policy-Version`.
*   **Verification:** `curl -I localhost:3000/api/health` shows headers.

### 2. `feat(client): Global Governance Header Injection`
*   **Scope:** `client/src/lib/api.ts` (or create wrapper)
*   **Action:** Create a centralized `fetch` wrapper that injects `X-Purpose: general_access` (default) and handles 503/403 standardized errors.
*   **Note:** This is critical for Stage 3.

### 3. `test(gov): Envelope Compatibility Tests`
*   **Scope:** `client/src/utils/data-envelope-validator.test.ts`
*   **Action:** Add test case where `governanceVerdict` is fully populated. Ensure no regression.

### 4. `chore(gov): Configure Strict Mode Flag`
*   **Scope:** `server/src/config.ts`, `server/src/middleware/governance.ts`
*   **Action:** Bind `strictMode` to `process.env.GOVERNANCE_STRICT_MODE`. Default to `false`.

### 5. `feat(gov): Enforce Tenant Isolation (Stage 2)`
*   **Scope:** `server/src/middleware/tenantValidator.ts`
*   **Action:** Set `requireExplicitTenant: true` for billing and admin routes.
*   **Flag:** `gov.enforce_strict_tenancy` (feature flag).

### 6. `feat(gov): Enable Global Kill Switch (Stage 3)`
*   **Scope:** `server/src/middleware/kill-switch.ts`
*   **Action:** Wire `killSwitchGuard` to all `/api/*` routes.
*   **Verification:** Verify 503 response when switch is active.

### 7. `ops(gov): Strict Mode Rollout (Stage 3)`
*   **Scope:** `k8s/deployment.yaml` / `.env`
*   **Action:** Set `GOVERNANCE_STRICT_MODE=true` in staging, then prod.
*   **Pre-req:** All clients using `apiClient` or sending headers.

### 8. `docs(gov): Publish Compatibility Packet`
*   **Scope:** `docs/governance/RUNTIME_GOVERNANCE_COMPATIBILITY.md`
*   **Action:** Commit this document.
