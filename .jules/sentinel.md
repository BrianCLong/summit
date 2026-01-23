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
