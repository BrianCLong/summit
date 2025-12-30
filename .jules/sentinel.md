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
