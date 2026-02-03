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

## 2026-02-15 - [CRITICAL] SQL Injection in Incremental Loader
**Vulnerability:** The `IncrementalLoader` class in `packages/etl-pipelines/src/loaders/incremental-loader.ts` constructed SQL queries (`UPDATE`, `DELETE`, `SELECT` for existence check) by directly interpolating string values from input rows into the query string, enabling SQL injection.
**Learning:** Even when some methods (like `insertRow`) use parameterized queries, inconsistencies can leave other methods vulnerable. Developers might assume internal data loading tools are safe, but they process untrusted data.
**Prevention:** Always use parameterized queries (e.g., `$1`, `$2`) for all variable data in SQL statements, regardless of the source. Use `pg` driver's parameter substitution instead of template literals for values.
