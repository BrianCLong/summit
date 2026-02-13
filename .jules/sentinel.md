# Sentinel: Platform Security & Integrity Ledger

Sentinel is the guardian of Summit's security posture. This ledger tracks identified vulnerabilities, lessons learned, and the implementation of hardened patterns to prevent regression.

## Philosophy
1.  **Deny-by-Default**: Access must be explicitly granted, never assumed.
2.  **Fail-Closed**: If a security check cannot be completed, the operation must fail and block access.
3.  **Deterministic Integrity**: Every critical action must leave a deterministic, immutable audit trail.
4.  **Zero-Trust Subsystems**: No internal component is inherently "trusted"; cross-subsystem calls must be validated.

## Hardened Patterns

### Fail-Closed Secret Resolution
When retrieving production secrets, never provide a hardcoded default.
```typescript
// BAD: Fallback to insecure string
const secret = process.env.JWT_SECRET || 'dev-secret';

// GOOD: Fail-Closed
const secret = process.env.JWT_SECRET;
if (!secret && isProduction) {
  throw new SecurityError('JWT_SECRET missing in production');
}
```

### Deny-by-Default Routing
Administrative routers must apply authentication middleware globally before defining any endpoints.
```typescript
const router = Router();
router.use(ensureAuthenticated);
router.use(ensureRole('admin'));

// Endpoints are now protected by default
router.post('/secrets/rotate', rotateHandler);
```

## Vulnerability Log

## 2025-10-26 - [CRITICAL] Insecure JWT Secret Fallback
**Vulnerability:** The server used a hardcoded default string ('super-secret-key') for JWT signing when the `JWT_SECRET` environment variable was missing, even in production.
**Learning:** Default fallbacks for security-critical secrets are dangerous. The absence of a secret in production should be treated as a fatal configuration error, not an opportunity to use a default.
**Prevention:** Use a "Fail-Closed" pattern: Explicitly check for the existence of the secret. If missing in production, throw an error and halt the operation (or startup). Never allow a fallback to a hardcoded string in production code paths.

## 2025-10-27 - [MEDIUM] Missing Timeout in Admin Secret Rotation
**Vulnerability:** The `/admin/secrets/rotate` endpoint in `server/src/routes/admin.ts` performed `axios.get` calls to service health endpoints without a configured timeout. A malicious or hanging service could block the request indefinitely, leading to resource exhaustion (DoS).
**Learning:** `axios` defaults to no timeout. Loops over external network calls must always strictly enforce timeouts to prevent cascading failures.
**Prevention:** Enforce a default timeout on all `axios` instances or explicit timeouts on individual calls.

## 2026-01-21 - [CRITICAL] Unauthenticated Operational & Administrative Endpoints
**Vulnerability:** Several sensitive administrative and operational endpoints in `server/src/routes/ops.ts` were missing authentication and authorization middleware. This allowed unauthenticated users to trigger system maintenance, database backups, disaster recovery drills, and evidence integrity verification.
**Learning:** Defaulting to open access in administrative routers is a high-risk pattern. Operational endpoints that interact with infrastructure or sensitive data must be explicitly protected by both authentication and role-based access control.
**Prevention:** Apply `router.use(ensureAuthenticated)` at the top of all administrative route files to enforce a "deny-by-default" posture. Always verify that each endpoint has appropriate `ensureRole` checks.

## 2026-02-03 - [CRITICAL] SQL Injection in Incremental Loader
**Vulnerability:** The `IncrementalLoader` class in `packages/etl-pipelines/src/loaders/incremental-loader.ts` constructed SQL queries (`UPDATE`, `DELETE`, `SELECT` for existence check) by directly interpolating string values from input rows into the query string, enabling SQL injection.
**Learning:** Even when some methods (like `insertRow`) use parameterized queries, inconsistencies can leave other methods vulnerable. Developers might assume internal data loading tools are safe, but they process untrusted data.
**Prevention:** Always use parameterized queries (e.g., `$1`, `$2`) for all variable data in SQL statements, regardless of the source. Use `pg` driver's parameter substitution instead of template literals for values.

## 2026-02-17 - [HIGH] Missing RBAC on Internal Status Endpoints
**Vulnerability:** The `apps/intelgraph-api/src/routes/internalStatus.ts` endpoints relied solely on authentication presence (`req.auth`) without verifying user roles. This allowed any authenticated user (regardless of privilege) to access sensitive system health, governance status, and infrastructure details.
**Learning:** Checking for "is authenticated" is insufficient for internal or administrative endpoints. All internal endpoints must strictly enforce Role-Based Access Control (RBAC).
**Prevention:** Enhance authentication middleware to also validate specific roles (e.g., `admin`, `platform_admin`) for sensitive routes. Adopt a "verify-role" pattern immediately after authentication checks.

## 2026-02-18 - [HIGH] Broken Access Control on Administrative and Evidence Endpoints
**Vulnerability:** Several sensitive endpoints defined directly in `server/src/app.ts` (e.g., `/search/evidence`, `/monitoring`, and various `/api/admin` routers) were missing authentication or relied on manual, inconsistent role checks.
**Learning:** Inline routes in main application files are easily overlooked during security audits. Additionally, inconsistent casing in role names (e.g., 'admin' vs 'ADMIN') can lead to manual check bypasses or availability issues.
**Prevention:** Enforce a "deny-by-default" posture by applying `authenticateToken` and `ensureRole(['ADMIN', 'admin'])` middleware to all administrative and sensitive data endpoints. Always use standardized middleware rather than manual property checks for role validation.

## 2026-02-19 - [CRITICAL] Tenant Scoping Bypass via SQL Comments
**Vulnerability:** The `validateAndScopeQuery` function in `server/src/db/query-scope.ts` naively appended `WHERE tenant_id = ...` to the end of SQL queries. This allowed attackers to use SQL comments (`--`) to neutralize the tenant scoping clause, effectively bypassing tenant isolation.
**Learning:** Naive string concatenation for security controls is fragile. Security logic must be robust against input variations (like comments) or structural manipulation.
**Prevention:** When auto-injecting security clauses into SQL, validate that the query structure is safe (e.g., no comments) and sanitize inputs (e.g., strip trailing semicolons). Use parser-based modification or strict validation instead of simple concatenation where possible.

## 2026-03-01 - [HIGH] Hardening Evidence Search and RBAC
**Vulnerability:** The `/search/evidence` endpoint lacked tenant isolation and explicit role checks, allowing any authenticated user to search evidence across all tenants. Additionally, `ensureRole` was case-sensitive, potentially allowing bypasses if role casing was inconsistent.
**Learning:** Security-critical endpoints, especially those performing full-text search, must explicitly enforce both RBAC and multi-tenant isolation. Core security middleware like `ensureRole` should be robust against trivial variations like casing.
**Prevention:** Always apply `ensureRole` and tenant-scoping clauses in Cypher queries for any endpoint exposing sensitive graph data. Use case-insensitive comparison in authorization logic.

## 2026-03-10 - [HIGH] Broken Access Control (Header Spoofing) in Internal Middleware and Routes
**Vulnerability:** Several internal routes and middleware components (`internal-access.ts`, `support-tickets.ts`, and `ConflictUIController`) relied on client-supplied headers (e.g., `x-user-id`, `x-user-role`, `x-role`) for identity and authorization, allowing for trivial privilege escalation and impersonation.
**Learning:** Never trust client-supplied headers for sensitive security decisions. Authentication middleware must be the sole source of truth for user identity and roles, populating a verified `req.user` object.
**Prevention:** Strictly use the authenticated `req.user` object for all authorization logic. Explicitly ignore or remove any incoming identity headers from the request to prevent spoofing.
