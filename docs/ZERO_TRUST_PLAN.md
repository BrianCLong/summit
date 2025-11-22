# Zero Trust Enforcement Plan for Summit (IntelGraph)

## Executive Summary

This document outlines a comprehensive plan to transition the Summit platform's identity and authentication systems to a Zero Trust architecture. The current state relies on traditional perimeter security models (long-lived tokens, static API keys, broad network access) which are insufficient for a high-security intelligence platform.

**Key Goals:**
1.  **Continuous Verification:** Move from "verify once" to "verify everywhere."
2.  **Least Privilege:** Replace broad roles with granular, policy-driven access.
3.  **Microsegmentation:** Enforce strict boundaries between services and tenants.

## 1. Current State & Risk Analysis

| Area | Current Implementation | Risk | Severity |
|------|------------------------|------|----------|
| **Tokens** | JWT (24h expiry) + Refresh (7d). Stored in `localStorage` (Client). | Stolen tokens remain valid for 24h. XSS can exfiltrate tokens easily. | **High** |
| **API Keys** | Static list in `process.env.VALID_API_KEYS`. | Keys are shared, hard to rotate, and have full access. | **Critical** |
| **AuthZ** | Mixed hardcoded RBAC (`ROLE_PERMISSIONS`) + OPA. | Rigid roles, difficult to evolve. "Analyst" has wide capabilities. | **Medium** |
| **Step-Up** | `requireStepUp` (header check) & `WebAuthnMiddleware` (robust but usage unclear). | Header check is easily bypassed. `WebAuthnMiddleware` is not globally enforced. | **High** |
| **Network** | CORS allows localhost. No service mesh/mTLS explicitly defined in code. | Lateral movement is easy if a dev machine is compromised. | **Medium** |

## 2. Proposed Zero Trust Architecture

### A. Identity & Verification (The "Who")

**1. Short-lived Access Tokens & HttpOnly Cookies**
*   **Change:** Reduce Access Token lifetime to **15 minutes**.
*   **Change:** Store tokens in `HttpOnly`, `Secure`, `SameSite` cookies to prevent XSS exfiltration.
*   **Mechanism:** The client transparently rotates tokens using the Refresh Token (stored in a separate HttpOnly path or rotated alongside).

**2. Continuous Authentication Middleware**
*   **New Component:** `ContinuousVerificationMiddleware`.
*   **Function:** Runs on *every* sensitive request.
    *   Checks Token Revocation List (Redis-backed for speed).
    *   Checks User Status (`is_active`).
    *   Validates Device Fingerprint (User-Agent + IP hash matches session).
    *   Calculates "Risk Score" (e.g., impossible travel, new IP).

**3. Enforced WebAuthn Step-Up**
*   **Change:** Deprecate the simple `requireStepUp` header check.
*   **Enforcement:** Use `WebAuthnMiddleware` for *all* critical actions (e.g., `DELETE *`, `ADMIN *`).
*   **Policy:** Any Risk Score > 70 triggers automatic Step-Up.

### B. Access Control (The "What")

**1. Database-Backed API Keys**
*   **New Table:** `api_keys` (id, owner_id, hash, scopes[], expires_at, last_used_at).
*   **Migration:** Move static keys to DB.
*   **Feature:** UI for users to generate/revoke their own keys with specific scopes (e.g., "Ingest Only").

**2. Full OPA Policy Enforcement**
*   **Refactor:** Remove `AuthService.hasPermission` (hardcoded RBAC).
*   **Pattern:** All permission checks delegated to `OPAMiddleware`.
*   **Policy:** Write Rego policies that dynamically check `input.user.attributes` against `input.resource`.

### C. Microsegmentation (The "Where")

**1. Strict CORS & Tenant Isolation**
*   **Config:** Restrict CORS to specific production domains in Prod environment.
*   **Tenant Isolation:** Enforce `tenant_id` checks at the Row Level Security (RLS) layer in Postgres (if not already) or strictly in every Repository method.

## 3. Implementation Plan

### Phase 1: Hardening (Immediate)
1.  [ ] **API Key Migration:** Create `api_keys` table and update `security.ts` middleware to check DB.
2.  [ ] **Token Security:** Switch `AuthContext` and `AuthService` to use HttpOnly cookies.
3.  [ ] **Step-Up Standardization:** Replace `requireStepUp` usage with `WebAuthnMiddleware` in `app.ts`.

### Phase 2: Zero Trust Core (Short Term)
1.  [ ] **Continuous Verification:** Implement `ContinuousVerificationMiddleware` with Redis caching.
2.  [ ] **OPA Migration:** Port `ROLE_PERMISSIONS` logic to Rego policies and switch middleware.

### Phase 3: Advanced (Long Term)
1.  [ ] **Device Trust:** Integrate device fingerprinting into the login flow.
2.  [ ] **Service Mesh:** Implement mTLS for service-to-service communication (Ops task).

## 4. Verification & Testing

*   **Unit Tests:** Verify `ContinuousVerificationMiddleware` rejects revoked tokens immediately.
*   **Integration Tests:** Test the "Step-Up" flow: Trigger a high-risk action -> Assert 403 + Challenge -> Complete Challenge -> Assert 200.
*   **Security Scans:** Run `OWASP ZAP` against the new Cookie-based auth to ensure no leakage.

## 5. Recommended Configuration Snippets

**Nginx/Ingress (Strict Headers):**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Content-Security-Policy "default-src 'self';" always;
```

**Postgres (RLS Example):**
```sql
CREATE POLICY tenant_isolation_policy ON investigations
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```
