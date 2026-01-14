# Test Strategy & Coverage Matrix: Runtime Governance Enforcement

## A) Requirements List (Canonical)

These requirements define the "hard" governance gates. Failure in any of these must block deployment and runtime request fulfillment.

### 1. GovernanceVerdict Contract & Propagation
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **RG-001** | **Verdict Existence**: Every `DataEnvelope` MUST contain a valid `GovernanceVerdict` object. | **P0** |
| **RG-002** | **Verdict Integrity**: `GovernanceVerdict` fields (`verdictId`, `result`, `evaluator`, `decidedAt`) MUST NOT be null or undefined. | **P0** |
| **RG-003** | **Data Tamper-Proofing**: The `dataHash` in the envelope MUST match the SHA-256 hash of the `data` payload. | **P1** |
| **RG-004** | **Simulated Data Flag**: If data is synthetic, `isSimulated` MUST be `true` and correctly propagated to consumers. | **P1** |
| **RG-005** | **Audit Trail**: Every verdict generation MUST trigger an audit log entry referencing the `verdictId` and `policyId`. | **P2** |

### 2. Tenant Isolation Enforcement
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **RG-006** | **Context Resolution**: Every request MUST resolve a valid `TenantContext` (tenantId, environment, privilegeTier) or fail (400/403). | **P0** |
| **RG-007** | **Cross-Tenant Blocking**: Requests attempting to access resources of Tenant A with a context of Tenant B MUST be rejected (403). | **P0** |
| **RG-008** | **Environment Isolation**: Tenant context environment (e.g., `prod`) MUST match the requested resource environment. | **P1** |
| **RG-009** | **Privilege Hardening**: `break-glass` or `elevated` privileges MUST auto-downgrade to `standard` if not explicitly required by policy. | **P2** |

### 3. Kill Switch Modes & Break-Glass
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **RG-010** | **Global Kill Switch**: When engaged, ALL non-admin requests MUST be rejected immediately (503/403). | **P0** |
| **RG-011** | **Tenant Kill Switch**: When active for Tenant T, all requests for T MUST be rejected (423 Locked). | **P1** |
| **RG-012** | **Configuration Safety**: If the tenant kill-switch configuration is missing in Production, ALL tenant requests MUST fail-closed (500). | **P0** |
| **RG-013** | **Break-Glass Bypass**: `break-glass` tier requests MAY bypass standard blocks if authorized, but MUST generate a high-severity audit event. | **P1** |

### 4. Runtime Evidence Artifacts
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **RG-014** | **Evidence Generation**: The release process MUST generate a signed evidence bundle via `scripts/compliance/generate_evidence.ts`. | **P1** |
| **RG-015** | **License Compliance**: Export bundles MUST include a valid `licenseCheck` result. | **P2** |

---

## B) Coverage Matrix

| Req ID | Test Type | Proposed Test Name | Location | Setup/Fixtures | Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| RG-001 | Unit | `should_block_creation_without_verdict` | `server/src/governance/__tests__/governance-bypass-regression.test.ts` | None | • `createDataEnvelope` throws Error<br>• Error msg contains "GovernanceVerdict is required" |
| RG-002 | Unit | `should_fail_validation_incomplete_verdict` | `server/src/governance/__tests__/governance-bypass-regression.test.ts` | Invalid `GovernanceVerdict` object | • `validateDataEnvelope` returns `valid: false`<br>• Errors list contains "Missing verdict ID/evaluator" |
| RG-003 | Unit | `should_detect_tampered_data` | `server/src/governance/__tests__/governance-bypass-regression.test.ts` | Modified envelope data post-creation | • `validateDataEnvelope` returns `valid: false`<br>• Errors list contains "Data hash mismatch" |
| RG-006 | Integration | `should_reject_missing_tenant_context` | `server/src/middleware/__tests__/tenant-context.test.ts` | Mock Request without headers/claims | • Status: 400<br>• Body.error: "tenant_required" |
| RG-007 | Unit | `should_block_cross_tenant_access` | `server/src/tenancy/__tests__/TenantIsolationGuard.test.ts` | `TenantContext` (T1), `PolicyInput` (T2) | • `evaluatePolicy` returns `allowed: false`<br>• Status: 403<br>• Reason: "Cross-tenant access denied" |
| RG-008 | Unit | `should_enforce_environment_match` | `server/src/tenancy/__tests__/TenantIsolationGuard.test.ts` | Context (dev), Input (prod) | • `evaluatePolicy` returns `allowed: false`<br>• Reason: "Tenant environment mismatch" |
| RG-010 | Unit | `should_enforce_global_kill_switch` | `server/src/services/__tests__/KillSwitchService.test.ts` | `KillSwitchService` state: global=true | • `checkSystemHealth` returns `allowed: false`<br>• Reason: "Global Kill Switch is Active" |
| RG-011 | Unit | `should_enforce_tenant_kill_switch` | `server/src/tenancy/__tests__/TenantIsolationGuard.test.ts` | Mock `TenantKillSwitch.isDisabled` = true | • `evaluatePolicy` returns `allowed: false`<br>• Status: 423<br>• Reason: "Tenant kill switch active" |
| RG-012 | Unit | `should_fail_closed_on_missing_config` | `server/src/tenancy/__tests__/TenantIsolationGuard.test.ts` | Mock `hasConfig` = false, Env = 'prod' | • `evaluatePolicy` returns `allowed: false`<br>• Status: 500<br>• Reason: "Kill-switch configuration missing" |
| RG-014 | Smoke | `should_generate_evidence_bundle` | `scripts/compliance/__tests__/evidence-generation.test.ts` | Mock Environment Vars | • Output file exists<br>• JSON content contains `provenance`<br>• `licenseCheck.valid` exists |

---

## C) CI Gate Definition

**Job Name:** `governance-enforcement`

**Execution Steps:**
1.  **Unit & Integration Tests:**
    ```bash
    pnpm test:governance
    ```
    *Where `test:governance` runs `node --test` on `server/src/governance/__tests__/**/*.test.ts`, `server/src/tenancy/__tests__/**/*.test.ts`, and `server/src/services/__tests__/KillSwitchService.test.ts`.*

2.  **Evidence Generation Verification:**
    ```bash
    export EVIDENCE_OUTPUT_DIR=./artifacts/evidence
    pnpm tsx scripts/compliance/generate_evidence.ts --dry-run
    if [ ! -f "$EVIDENCE_OUTPUT_DIR/compliance-bundle.json" ]; then exit 1; fi
    ```

**Artifacts Required:**
*   `test-results/governance-report.json`
*   `artifacts/evidence/compliance-bundle.json`

**Flake Controls:**
*   **Retries:** 0 (Security tests must fail closed immediately).
*   **Isolation:** Run in a clean container; no shared persistence.
*   **Timeouts:** 30s per test file (fast-fail).

---

## D) Minimal "Golden Test Suite"

This suite must run on every PR (blocking).

**Fast Mode (PR Validation):**
1.  `BYPASS-001`: Create envelope without verdict (Expect: Throw).
2.  `BYPASS-007`: Data tampering check (Expect: Invalid).
3.  `RG-007`: Cross-tenant access check (Expect: 403).
4.  `RG-011`: Tenant Kill Switch active (Expect: 423).
5.  `RG-012`: Missing Kill Switch config in PROD (Expect: 500).
6.  `RG-006`: Request without Tenant ID (Expect: 400).

**Full Mode (Nightly/Main):**
*   All Fast Mode tests.
*   Full permutation of `TenantIsolationGuard` policies (all privilege tiers x environments).
*   `KillSwitchService` global lock scenarios.
*   `generate_evidence.ts` actual execution (non-dry-run) and artifact inspection.

---

## E) Implementation Checklist

### 1. Test Helpers & Fixtures
*   [ ] **`createMockTenantContext(id, env, tier)`**: Helper to generate valid `TenantContext` objects quickly.
*   [ ] **`MockKillSwitch`**: A partial implementation of `TenantKillSwitch` to control `isDisabled` and `hasConfig` returns without file I/O.
*   [ ] **`MockRateLimiter`**: In-memory implementation of `RateLimiterLike` to test quota logic without Redis.

### 2. New Test Files
*   [ ] `server/src/tenancy/__tests__/TenantIsolationGuard.test.ts`: Focus on RG-007, RG-008, RG-011, RG-012.
*   [ ] `server/src/services/__tests__/KillSwitchService.test.ts`: Focus on RG-010.

### 3. Existing Test Updates
*   [ ] Ensure `server/src/governance/__tests__/governance-bypass-regression.test.ts` is running in the new `test:governance` script.
*   [ ] Update `package.json` to include the `test:governance` script.

### 4. Implementation Rules
*   **No Snapshots for Reason Codes**: Use explicit string matching for reason codes (e.g., `expect(result.reason).toBe('Cross-tenant access denied')`) to ensure exact error messaging is preserved for API clients.
*   **Fail Closed**: If a mock setup fails, the test must fail. Do not default to "allowed" in test helpers.
