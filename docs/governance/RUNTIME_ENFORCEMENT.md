# Runtime Governance Enforcement

**Status:** Active | **Last Reviewed:** 2025-05-12

Governance does not end at deployment. We enforce policies at runtime to ensure safety, isolation, and compliance.

## 1. Safety Mode & Kill Switches
*   **Mechanism:** `KillSwitchService` (`server/src/services/KillSwitchService.ts`)
*   **Control:** Feature flags and dynamic config.
*   **Policy:** Kill Switch Policy
*   **Action:** Can disable specific API endpoints or entire subsystems globally or per-tenant.

## 2. Tenant Isolation
*   **Mechanism:** `TenantIsolationGuard` (`server/src/tenancy/TenantIsolationGuard.ts`)
*   **Enforcement:** Middleware checks `X-Tenant-ID` and ensures data access is scoped to the verified tenant context.
*   **Verification:** `TenantPolicyDecision` types ensure code handles tenancy explicitly.

## 3. Usage & Purpose Headers
*   **Mechanism:** `governance.ts` Middleware.
*   **Requirement:** All data access requests must include:
    *   `X-Purpose`: Why the data is being accessed.
    *   `X-Legal-Basis`: The legal justification (e.g., "consent", "contract").
*   **Audit:** These headers are logged to the `governance_events.jsonl` audit trail.

## 4. Drift Detection
*   **Job:** `governance-drift-check`
*   **Purpose:** Ensures the runtime configuration matches the declared policy in the repo.
*   **Remediation:** Alerts Ops if drift exceeds the threshold.
