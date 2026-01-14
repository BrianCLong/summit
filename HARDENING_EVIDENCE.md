# Hardening Controls Evidence

## 1. Security Headers (Phase 1)
- **Control**: Strict CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- **Verification**: `server/tests/security/headers.test.ts`
- **Configuration**: `server/src/middleware/securityHeaders.ts` (configured in `server/src/app.ts`)

## 2. SSRF Protection (Phase 2)
- **Control**: `SafeAxios` wrapper enforces IP/Host filtering.
- **Verification**: `server/tests/security/ssrf.test.ts`
- **Implementation**: `server/src/lib/security/outbound-client.ts`
- **Adoption**: `server/src/notifications/providers/WebhookProvider.ts` modified to use `safeAxios`.

## 3. Tenant Isolation (Phase 3)
- **Control**: Middleware enforces tenant context consistency between header, route, and token.
- **Verification**: `server/tests/security/isolation.test.ts`
- **Implementation**: `server/src/middleware/tenantContext.ts`

## 4. Rate Limiting (Phase 4)
- **Control**: `trust proxy` enabled for correct IP resolution; IP and User-based limiting.
- **Verification**: `server/tests/security/rate-limit.test.ts`
- **Implementation**: `server/src/middleware/rateLimiter.ts` & `server/src/app.ts`

## 5. Supply Chain Security (Phase 5)
- **Control**: Dependency Allowlist check.
- **Verification**: `scripts/security/check-new-deps.ts`
- **Baseline**: `security/allowed-deps.json`

## Reproduction Steps

```bash
# Verify Headers
npx tsx server/tests/security/headers.test.ts

# Verify SSRF Protection
npx tsx server/tests/security/ssrf.test.ts

# Verify Tenant Isolation
export DATABASE_URL="postgresql://mock:mock@localhost:5432/mock"
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="password"
export JWT_SECRET="mock-secret-32-chars-long-string-value"
export JWT_REFRESH_SECRET="mock-refresh-secret-32-chars-long-string"
export NODE_ENV="test"
npx tsx server/tests/security/isolation.test.ts

# Verify Rate Limiting
npx tsx server/tests/security/rate-limit.test.ts

# Verify Dependencies
npx tsx scripts/security/check-new-deps.ts
```
