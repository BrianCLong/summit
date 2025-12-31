# Security Assertions

This document defines the security assertions that must be true for the GA release.
Verification is performed by `server/tests/verification/verify_security_claims.ts`.

## 1. Route Protection
All API routes must have authentication middleware applied, unless explicitly exempted (e.g., login, health).

*   **Assertion:** `server/src/routes/*.ts` files must import and use `ensureAuthenticated` or equivalent.
*   **Assertion:** No "any" type bypasses in critical auth logic.

## 2. Rate Limiting
Global rate limiting must be enabled.

*   **Assertion:** `server/src/app.ts` (or main entry) must use `rateLimit` middleware.

## 3. Policy Enforcement
OPA or Policy enforcement points must be present.

*   **Assertion:** `server/src/middleware/opa.ts` or similar must exist.
