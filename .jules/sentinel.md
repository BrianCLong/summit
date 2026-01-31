## 2025-10-25 - [CRITICAL] Unauthenticated Ingestion & Search Endpoints
**Vulnerability:** Several endpoints in `server/src/routes/ingestion.ts` were missing authentication middleware (`ensureAuthenticated`), allowing unauthenticated access to sensitive operations:
  - `POST /pipelines/:key/run` (arbitrary ingestion pipeline execution)
  - `POST /search/retrieve` (arbitrary RAG retrieval)
  - `POST /search/context` (access to context)
  - `GET /pipelines` (information disclosure)
  - `GET /dlq` (sensitive data exposure)

**Learning:**
1.  **Implicit Trust in Route Parameters:** The presence of a `:key` parameter in the pipeline route might have created a false sense of security, acting as a "bearer token" without proper validation or rotation mechanisms.
2.  **Tenant Isolation Gaps:** Even if authenticated, endpoints that accept `tenantId` in the body without verifying it against the authenticated user's credentials allow for "Confused Deputy" attacks (accessing another tenant's data).
3.  **Missing Defaults:** Defaulting to open access when middleware is missing is a dangerous pattern. Routers should ideally deny by default.

**Prevention:**
1.  **Mandatory Middleware:** Apply `ensureAuthenticated` at the router level (`router.use(...)`) or use a linter rule to enforce it on all route definitions.
2.  **Authoritative Binding:** Never trust client-provided `tenantId` for authorization. Always overwrite or validate it against the trusted `req.user` context.
3.  **Strict Role Checks:** Use explicit role checks (e.g., `req.user.role === 'ADMIN'`) for sensitive administrative endpoints like DLQ.

## 2025-12-19 - [CRITICAL] Unauthenticated Export Manifest Signing
**Vulnerability:** The `POST /sign-manifest` endpoint in `server/src/routes/exports.ts` was missing authentication middleware, allowing any unauthenticated user to generate valid export manifest signatures using the server's secret key. This could potentially allow forgery of export manifests or unauthorized access to export verification systems.

**Learning:**
1.  **Utility Endpoints are Targets:** Endpoints that seem like "helpers" (e.g., signing a payload) often carry significant security weight (cryptographic operations with server secrets) and must be protected.
2.  **Test Infrastructure Fragility:** Verifying the fix revealed significant issues with the test runner environment (specifically `jest-extended` + ESM compatibility), highlighting the importance of maintaining a healthy test suite to enable security verification.

**Prevention:**
1.  **Strict Middleware Auditing:** Ensure all endpoints in route files have explicit authentication middleware unless publicly intended (e.g., login, health).
2.  **Secret Usage Review:** Any endpoint using server-side secrets (like signing keys) should automatically trigger a security review for authentication requirements.

## 2025-12-25 - [CRITICAL] Fail-Open Webhook Verification
**Vulnerability:** Jira and Lifecycle webhook endpoints (`/api/webhooks/jira`, `/api/webhooks/lifecycle`) were configured to skip secret verification if the secret environment variable was missing, even in production (logging a warning instead of blocking).

**Learning:**
1.  **Fail-Open Defaults:** Security checks that "warn and proceed" on configuration errors are dangerous in production.
2.  **Environment Assumption:** Assuming that "production will always have secrets set" is unsafe; configuration drift or errors can leave endpoints exposed.

**Prevention:**
1.  **Fail-Closed Logic:** If a required security configuration (like a secret) is missing, the system must block the request (fail closed), especially in production.
2.  **Strict Configuration Checks:** Validate critical security configuration at startup, preventing the app from even starting if secrets are missing in production.

## 2025-10-26 - [CRITICAL] Fail-Open Export Signing Secret
**Vulnerability:** The `/sign-manifest` endpoint in `server/src/routes/exports.ts` used a hardcoded fallback (`'dev-secret'`) when `EXPORT_SIGNING_SECRET` was missing, without checking the environment. This meant that a production deployment with a missing secret configuration would silently become vulnerable to signature forgery.
**Learning:** Default fallbacks for security-critical secrets are dangerous. The absence of a secret in production should be treated as a fatal configuration error, not an opportunity to use a default.
**Prevention:** Use a "Fail-Closed" pattern: Explicitly check for the existence of the secret. If missing in production, throw an error and halt the operation (or startup). Never allow a fallback to a hardcoded string in production code paths.
