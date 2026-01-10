# MVP-4 GA Evidence Map

This document maps GA Security Claims to concrete evidence in the codebase.

---

## 1. Secure Authentication

**Claim:** "All external traffic is authenticated via JWT with signature verification."

*   **Evidence File:** `services/sandbox-gateway/src/middleware/auth.ts`
*   **Key Code Block:**
    ```typescript
    const decoded = jwt.verify(token, JWT_SECRET!, { ... });
    ```
*   **Verification:**
    *   `req.user` is populated ONLY after successful verification.
    *   Configuration explicitly requires `JWT_SECRET` length >= 32 chars.

## 2. Tenant Isolation

**Claim:** "Tenants cannot access each other's data."

*   **Evidence File:** `server/src/middleware/ensureTenant.ts` (Backend) & `services/sandbox-gateway/src/middleware/auth.ts` (Gateway)
*   **Mechanism:**
    *   **Gateway:** Extracts `tenantId` from verified JWT.
    *   **Backend:** Enforces RLS (Row Level Security) and logic checks based on the context.
    *   **Constraint:** Network isolation MUST prevent bypassing the Gateway (See `docs/security/SECURITY_DEFERRED_RISKS.md`).

## 3. Immutable Provenance

**Claim:** "Critical actions are logged to a tamper-evident ledger."

*   **Evidence File:** `services/prov-ledger/src/ledger.ts` (or equivalent)
*   **Mechanism:** Append-only PostgreSQL table with cryptographic linking.
*   **Evidence:** `docs/ga/RELEASE-READINESS-REPORT.md` (Audit Section) and `docs/SUMMIT_READINESS_ASSERTION.md`.

## 4. Policy Enforcement

**Claim:** "High-risk actions require policy approval."

*   **Evidence File:** `policies/mvp4_governance.rego`
*   **Mechanism:** OPA (Open Policy Agent) gate before mutation execution.

---

## Verification Traceability

To verify these claims in the codebase:

```bash
# 1. Verify Gateway Auth Fix
grep -C 5 "jwt.verify" services/sandbox-gateway/src/middleware/auth.ts

# 2. Verify Tenant Header Handling (Gateway)
grep "tenantId" services/sandbox-gateway/src/middleware/auth.ts

# 3. Verify Policy Existence
ls -l policies/mvp4_governance.rego
```
