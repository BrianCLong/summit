# GA Security Baseline Contract

**Version:** 1.0
**Status:** Enforced
**Last Updated:** 2025-12-31

## Purpose

This document defines the authoritative security baseline contract for the Summit platform's General Availability (GA) release. Every invariant listed here is enforced in code and verified by automated checks.

---

## 1. Authentication Requirements

### 1.1 Invariant: All Non-Public Endpoints Require Authentication

**Requirement:** All API endpoints except explicitly designated public routes must enforce authentication.

**Enforcement Locations:**

- `server/src/middleware/auth.ts:ensureAuthenticated()` - Primary authentication middleware
- `server/src/config/production-security.ts` - Production JWT verification
- `server/src/middleware/opa-abac.ts:validateOIDCToken()` - OIDC/SPIFFE token validation

**Protected Route Categories:**

- `/api/*` - All API routes (global middleware chain)
- `/graphql` - GraphQL endpoint with field-level auth directives
- `/admin/*` - Admin routes (requires authentication + authorization)
- `/conductor/*` - Orchestration routes (requires workflow permissions)

**Exempt Routes (Public):**

- `/health` - Health check
- `/api/health` - API health check
- `/public/*` - Explicitly public routes

**Verification Checks:**

- `verify-auth-coverage` - Ensures all non-public routes have `ensureAuthenticated` or equivalent
- `verify-graphql-shield` - Confirms GraphQL mutations/queries require authentication

**Token Sources (in priority order):**

1. `Authorization: Bearer <token>` header
2. `x-access-token` header

**Token Validation:**

- JWT signature verification (RS256 or HS256)
- Issuer validation for OIDC tokens
- Token expiration enforcement
- User context extraction (userId, tenantId, roles)

---

## 2. Authorization & Tenant Isolation

### 2.1 Invariant: Tenant Context Required for Multi-Tenant Operations

**Requirement:** All operations on tenant-scoped resources must enforce tenant context and prevent cross-tenant data access.

**Enforcement Locations:**

- `server/src/middleware/tenant.ts:tenantContextMiddleware()` - Extracts and validates tenant context
- `server/src/tenancy/TenantIsolationGuard.ts` - Policy evaluation for cross-tenant access denial
- `server/src/auth/multi-tenant-rbac.ts` - Tenant-scoped role enforcement

**Tenant Context Sources (in priority order):**

1. `x-tenant-id` header
2. `req.user.tenantId` from authenticated token

**Protected Operations:**

- All `/api/*` routes with strict tenant context mode
- All `/graphql` queries/mutations accessing tenant data
- Database queries using tenant ID as filter
- Neo4j graph queries with tenant namespace

**Cross-Tenant Protection:**

- TenantIsolationGuard validates `resourceTenantId === requestTenantId`
- Returns 403 Forbidden for cross-tenant access attempts
- Logs policy violations to audit trail

**Verification Checks:**

- `verify-tenant-isolation` - Ensures routes accessing tenant data have tenant validation
- `verify-cross-tenant-blocks` - Confirms TenantIsolationGuard is in middleware chain

**Tenant Kill-Switch:**

- Tenants can be disabled via kill-switch configuration
- Requests to disabled tenants return 503 Service Unavailable

### 2.2 Invariant: Role-Based Access Control (RBAC)

**Requirement:** Privileged operations must enforce role and permission checks.

**Enforcement Locations:**

- `server/src/middleware/auth.ts:requirePermission()` - Permission-based access control
- `server/src/middleware/auth.ts:ensureRole()` - Role membership validation
- `server/src/conductor/auth/rbac-middleware.ts` - Conductor-specific RBAC

**Role Hierarchy:**

- `admin` - Wildcard permissions (`*`)
- `operator` - Workflow, task, evidence, policies, serving, CTI, pricing, capacity
- `analyst` - Workflow read/execute, task read/execute, evidence, policies read, serving read/execute
- `viewer` - Read-only across all resources

**Permission Format:** `resource:action` (e.g., `workflow:execute`, `api_key:create`)

**Audit Logging:**

- All permission checks logged to advanced-audit-system
- Failures logged with: userId, tenantId, requiredPermission, resourceType, outcome

**Verification Checks:**

- `verify-rbac-enforcement` - Ensures privileged routes have `requirePermission` checks
- `verify-admin-wildcard` - Confirms admin role has full access

---

## 3. Admin-Only Invariants

### 3.1 Invariant: Admin Operations Require Elevated Permissions

**Requirement:** Administrative operations must enforce authorization checks beyond basic authentication.

**Enforcement Locations:**

- `server/src/routes/admin.ts` - Global admin route protection
- `server/src/routes/admin/identity.ts` - Tenant and API key management
- `server/src/routes/admin/users.ts` - User management
- `server/src/routes/admin/roles.ts` - Role management

**Admin Route Protection Pattern:**

```typescript
router.use(ensureAuthenticated, authorize("manage_users"));
```

**Admin-Gated Operations:**

| Endpoint                      | Required Permission       | Description                    |
| ----------------------------- | ------------------------- | ------------------------------ |
| `POST /admin/ga/config`       | `administer:system`       | GA configuration updates       |
| `POST /admin/config`          | `administer:system`       | Runtime config updates         |
| `POST /admin/secrets/rotate`  | `administer:system`       | Secret rotation                |
| `POST /admin/temporal/toggle` | `administer:system`       | Temporal execution control     |
| `POST /admin/opa/reload`      | `administer:system`       | Policy reload                  |
| `GET /admin/tenants`          | `administer:system`       | List all tenants (system-wide) |
| `POST /admin/tenants`         | `administer:system`       | Create tenant                  |
| `POST /api-keys`              | `create:api_key`          | Create API key                 |
| `DELETE /api-keys/:id`        | `delete:api_key`          | Revoke API key                 |
| `POST /admin/pricing/refresh` | `ops:*` or `operations:*` | Pricing refresh                |

**Verification Checks:**

- `verify-admin-routes` - Ensures all `/admin/*` routes have authorization middleware
- `verify-system-admin-ops` - Confirms system-level operations require `administer:system`

### 3.2 Invariant: Step-Up Authentication for Sensitive Operations

**Requirement:** High-risk operations require multi-factor authentication (MFA) step-up.

**Enforcement Location:**

- `server/middleware/stepup.ts:requireStepUp()` - MFA level validation

**Step-Up Mechanism:**

- Validates `x-mfa-level` header
- Minimum level: 2 (configurable per operation)
- Returns 401 with `step_up_required` if insufficient

**Operations Requiring Step-Up:**

- User deletion
- Secret rotation
- Tenant deletion
- Dual-control approvals (when configured)

**Verification Checks:**

- `verify-stepup-sensitive-ops` - Confirms sensitive operations use `requireStepUp`

---

## 4. Rate Limiting

### 4.1 Invariant: Public Endpoints Have Rate Limits

**Requirement:** All public-facing endpoints must have rate limiting to prevent abuse.

**Enforcement Locations:**

- `server/src/middleware/rateLimiter.ts` - Express rate limiter (in-memory)
- `server/middleware/ratelimit.ts` - Redis-backed tenant rate limiter
- `server/src/middleware/TieredRateLimitMiddleware.ts` - Advanced tiered limits
- `server/src/tenancy/TenantIsolationGuard.ts` - Tenant-specific rate limits

**Rate Limit Tiers:**

| Tier          | Limit    | Window | Key        | Applied To                   |
| ------------- | -------- | ------ | ---------- | ---------------------------- |
| Public        | 100 req  | 15 min | IP address | Unauthenticated routes       |
| Authenticated | 1000 req | 15 min | User ID    | Authenticated routes         |
| API Tier      | 120 req  | 1 min  | Tenant ID  | `/api/*` routes              |
| Ingestion     | 45 req   | 1 min  | Tenant ID  | Data ingestion endpoints     |
| RAG/Semantic  | 60 req   | 1 min  | Tenant ID  | RAG operations               |
| AI/LLM        | 50 req   | 15 min | Tenant ID  | LLM inference (configurable) |

**Rate Limit Headers (RFC 6585):**

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Timestamp when limit resets

**Adaptive Behavior:**

- Tenant-specific overrides via plan configuration
- Environment variable overrides:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX_REQUESTS`
  - `AI_RATE_LIMIT_MAX_REQUESTS`

**Verification Checks:**

- `verify-rate-limit-public` - Ensures public routes have rate limiting
- `verify-rate-limit-sensitive` - Confirms auth, ingestion, execution routes have explicit limits
- `verify-rate-limit-headers` - Validates rate limit headers are set

### 4.2 Invariant: High-Risk Endpoints Have Strict Rate Limits

**Requirement:** Authentication, execution, and admin endpoints must have stricter rate limits.

**High-Risk Endpoints:**

- `/auth/login` - Authentication (prevents brute force)
- `/auth/refresh` - Token refresh (prevents token abuse)
- `/conductor/orchestrate` - Workflow execution
- `/api/ingestion/*` - Data ingestion
- `/admin/*` - Admin operations
- `/internal/command-console` - Command execution

**Verification Checks:**

- `verify-strict-rate-limits` - Confirms high-risk endpoints have tenant or stricter limits

---

## 5. Input Validation

### 5.1 Invariant: All User Input Must Be Validated

**Requirement:** All request payloads must pass schema validation before processing.

**Enforcement Locations:**

- `server/src/middleware/request-schema-validator.ts` - Zod and Joi schema validation
- `server/src/middleware/sanitization.ts` - mongo-sanitize for NoSQL injection prevention
- `server/src/middleware/pii-guard.ts` - PII detection and redaction

**Validation Strategy:**

1. **Schema Validation** (First Line)
   - Zod schemas for type safety and runtime validation
   - Joi schemas for legacy compatibility
   - Aborts on first validation error (returns 400)
   - Strips unknown properties by default

2. **Sanitization** (Second Line)
   - `mongo-sanitize` removes keys starting with `$` or `.`
   - Prevents NoSQL injection attacks
   - Applied globally via middleware chain

3. **Security Validation** (Third Line)
   - `SanitizationUtils.sanitizeUserInput()` - XSS prevention
   - `SecurityValidator.validateInput()` - Additional security checks

**PII Guard:**

- `HybridEntityRecognizer` detects PII patterns
- Redaction policies: `pii`, `financial`, `sensitive`
- Tenant-aware redaction
- Logs PII findings without blocking requests

**Production Secret Guards:**

- Config validation ensures no test secrets in production
- JWT secrets must be >= 32 characters
- Detects insecure tokens: `devpassword`, `changeme`, `secret`

**Verification Checks:**

- `verify-schema-validation` - Ensures routes use `validateRequest` middleware
- `verify-sanitization` - Confirms mongo-sanitize is in global middleware chain
- `verify-pii-guard` - Validates PII guard is active on input routes

---

## 6. Logging & Redaction

### 6.1 Invariant: No Secrets in Logs

**Requirement:** All logs must redact sensitive information (tokens, passwords, PII).

**Enforcement Locations:**

- `server/src/middleware/logging.ts` - Pino HTTP middleware with redaction paths
- `server/src/config/logger.js` - Application logger configuration
- `server/src/middleware/pii-guard.ts` - PII redaction service

**Redacted Fields:**

- `req.headers.authorization` - Bearer tokens
- `req.headers.cookie` - Session cookies
- `req.body.password` - User passwords
- `req.body.secret` - API secrets
- Any field containing PII (email, SSN, phone, credit card)

**Correlation Tracking:**

- `correlationId` - Request correlation (from header or generated)
- `traceId` - OpenTelemetry trace ID
- `spanId` - OpenTelemetry span ID
- `requestId` - Unique request identifier (from `x-request-id` or generated)
- `userId` - Authenticated user ID
- `tenantId` - Tenant context

**Log Levels:**

- ERROR: Response status >= 500 or uncaught errors
- WARN: Response status >= 400 (client errors)
- INFO: Successful responses
- DEBUG: Verbose operational logs (dev only)

**Audit Trail:**

- Advanced audit system logs policy violations
- Immutable audit log with cryptographic stamping (audit-first middleware)
- Includes: eventType, action, outcome, userId, tenantId, resourceType, resourceId

**Verification Checks:**

- `verify-log-redaction` - Ensures sensitive fields are in redaction paths
- `verify-audit-logging` - Confirms policy violations are logged

---

## 7. Security Headers & CORS

### 7.1 Invariant: Security Headers on All Responses

**Requirement:** All HTTP responses must include security headers to prevent common web attacks.

**Enforcement Location:**

- `server/src/security/security-headers.ts` - Helmet and custom headers

**Implemented Headers:**

| Header                         | Value (Production)                                                                                                                                       | Purpose                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `Content-Security-Policy`      | `default-src 'self'; script-src 'self'; style-src 'self' https: 'unsafe-inline'; img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'` | Prevents XSS, clickjacking     |
| `Strict-Transport-Security`    | `max-age=31536000; includeSubDomains; preload`                                                                                                           | Enforces HTTPS                 |
| `X-Frame-Options`              | `DENY`                                                                                                                                                   | Prevents clickjacking          |
| `X-Content-Type-Options`       | `nosniff`                                                                                                                                                | Prevents MIME sniffing         |
| `X-XSS-Protection`             | `1; mode=block`                                                                                                                                          | Legacy XSS protection          |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`                                                                                                                        | Limits referrer leakage        |
| `Permissions-Policy`           | `geolocation=(), microphone=(), camera=()`                                                                                                               | Disables sensitive APIs        |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                                                                                                                            | Isolates browsing context      |
| `Cross-Origin-Embedder-Policy` | `require-corp` (prod)                                                                                                                                    | Enables cross-origin isolation |
| `Cross-Origin-Resource-Policy` | `cross-origin`                                                                                                                                           | Controls resource loading      |

**GraphQL-Specific Headers:**

- `Cache-Control: no-cache, no-store, must-revalidate`
- Introspection disabled in production (`__schema` query blocked)

**Custom Headers:**

- `Server: IntelGraph` (hides implementation details)
- `X-API-Version: <version>` - API version tracking
- `X-Request-ID: <uuid>` - Request tracking

**Verification Checks:**

- `verify-security-headers` - Confirms all required headers are set
- `verify-csp` - Validates CSP policy is strict in production
- `verify-hsts` - Ensures HSTS is enabled in production

### 7.2 Invariant: Strict CORS Policy

**Requirement:** CORS must only allow trusted origins in production.

**Enforcement Location:**

- `server/src/config/cors-options.ts` - CORS configuration

**CORS Settings:**

- **Allowed Origins:** From `CORS_ORIGIN` environment variable (comma-separated)
- **Development:** All origins allowed (for local development)
- **Production:** Whitelist only
- **Credentials:** true (allows cookies)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Max Age:** 86400 (24 hours)

**Allowed Headers:**

- `Content-Type`
- `Authorization`
- `X-Requested-With`
- `x-tenant-id`
- `x-correlation-id`
- `x-trace-id`

**Exposed Headers:**

- `x-request-id`
- `x-correlation-id`

**Verification Checks:**

- `verify-cors-production` - Ensures CORS whitelist is enforced in production
- `verify-cors-credentials` - Confirms credentials are handled securely

---

## 8. GraphQL-Specific Security

### 8.1 Invariant: GraphQL Field-Level Authorization

**Requirement:** All GraphQL mutations and non-public queries must enforce authentication and authorization.

**Enforcement Location:**

- `server/src/graphql/apollo-v5-server.ts` - Apollo Server v5 with graphql-shield

**GraphQL Shield Rules:**

- **Public Queries:** `health`, `version` (no auth required)
- **All Other Queries:** Require authentication
- **All Mutations:** Require authentication
- **Field-Level Auth:** `@auth` directive for granular control

**Query Complexity Limiting:**

- Maximum query depth enforcement
- Complexity cost calculation
- Prevents DoS via complex queries

**Introspection:**

- Disabled in production (prevents schema enumeration)
- Enabled in development only

**Verification Checks:**

- `verify-graphql-auth` - Ensures shield rules cover all mutations/queries
- `verify-graphql-complexity` - Confirms complexity limits are set
- `verify-graphql-introspection` - Validates introspection is disabled in production

---

## 9. Data Residency & Compliance

### 9.1 Invariant: Data Residency Enforcement

**Requirement:** Data must remain in the configured residency region for compliance.

**Enforcement Location:**

- Residency enforcement middleware (applied to `/api` and `/graphql`)

**Residency Checks:**

- Validates tenant residency configuration
- Blocks cross-region data access
- Logs residency violations to audit trail

**Supported Regions:**

- `us` - United States
- `eu` - European Union
- `uk` - United Kingdom
- `au` - Australia
- Additional regions configurable

**Verification Checks:**

- `verify-residency-enforcement` - Confirms residency middleware is in place

---

## 10. OPA/ABAC Policy Integration

### 10.1 Invariant: Policy-Based Access Control (Optional but Recommended)

**Requirement:** When OPA is enabled, all access decisions must be evaluated against ABAC policies.

**Enforcement Location:**

- `server/src/middleware/opa-abac.ts` - OPA policy evaluation middleware

**Policy Input Structure:**

```json
{
  "subject": {
    "id": "user-id",
    "tenantId": "tenant-id",
    "roles": ["role1", "role2"],
    "residency": "us",
    "clearance": "secret",
    "entitlements": []
  },
  "resource": {
    "type": "workflow",
    "id": "resource-id",
    "tenantId": "tenant-id",
    "residency": "us",
    "classification": "confidential"
  },
  "action": "read" | "write" | "delete",
  "context": {
    "ip": "1.2.3.4",
    "userAgent": "...",
    "time": "2025-12-31T12:00:00Z",
    "currentAcr": 1,
    "dualControlApprovals": []
  }
}
```

**Obligations Handling:**

- `step_up` - Triggers MFA/step-up authentication requirement
- `dual_control` - Requires approvals before execution

**Clearance Levels:**

- `unclassified`, `confidential`, `secret`, `top-secret`, `top-secret-sci`

**Verification Checks:**

- `verify-opa-integration` - Confirms OPA middleware is configured when enabled

---

## 11. CI/CD Pipeline Security

### 11.1 Invariant: Strictly Anchored CI Triggers

**Requirement:** All regex-based filters in CI/CD pipelines (GitHub Actions, CodeBuild, etc.) must be anchored with `^` and `$`.

**Standards Doc:** [CI/CD Security Standards](./CI-CD-SECURITY-STANDARDS.md)

**Enforcement Locations:**

- `.github/workflows/workflow-lint.yml` - Static analysis of workflow files
- `scripts/security/baseline-check.sh` - Grep-based audit for unanchored patterns

**Verification Checks:**

- `verify-anchored-regex` - Ensures all security-sensitive regex matches are anchored
- `verify-action-pinning` - Confirms all third-party actions use commit SHAs

---

## Verification Suite

All invariants above are verified by the automated security verification suite:

**Execution:**

```bash
pnpm verify
# or
npm run verify
# or
node --loader tsx server/scripts/verify-ga-security.ts
```

**CI Integration:**

- Verification suite runs on every pull request
- Blocks merge if verification fails
- Runs in GitHub Actions workflow

**Verification Reports:**

- Console output with pass/fail status
- Error details for each failed check
- File paths and line numbers for violations

---

## Security Contact

For security concerns or to report vulnerabilities:

- Email: security@example.com (update with actual contact)
- Process: Follow responsible disclosure policy

---

## Maintenance

This baseline must be updated whenever:

1. New authentication mechanisms are added
2. Authorization rules change
3. New admin operations are introduced
4. Rate limiting policies are modified
5. Input validation requirements change
6. Logging or redaction rules are updated
7. Security headers or CORS policies change

**Review Cadence:** Quarterly or before each major release

**Owner:** Security Engineering Team

**Last Review:** 2025-12-31
