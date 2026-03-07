# Summit Security Integration Guide

## Overview

This guide provides comprehensive instructions for integrating and extending Summit's production-grade security infrastructure. The security architecture follows defense-in-depth principles with multiple layers of protection.

## Architecture

```
Request Flow:
├── Rate Limiting (Layer 1)
├── Security Headers (Layer 2)
├── CORS Validation (Layer 3)
├── Input Sanitization (Layer 4)
├── Request Validation (Layer 5)
├── Authentication/Authorization (Layer 6)
└── Application Logic
```

## Current Security Controls

### 1. Rate Limiting

**Location:** `server/src/middleware/security.ts`

#### Available Rate Limiters:

```typescript
// General API: 100 req/15min
export const createRateLimiter = (windowMs, max, message);

// Strict (sensitive endpoints): 20 req/15min
export const strictRateLimiter;

// Auth attempts: 5 req/1min
export const authRateLimiter;

// AI/ML processing: 10 req/1min
export const aiRateLimiter;

// GraphQL: 100 req/1min
export const graphqlRateLimiter;

// REST API: 1000 req/1hour
export const restApiRateLimiter;
```

**Usage:**

```typescript
import { authRateLimiter, strictRateLimiter } from "./middleware/security";

app.post("/api/auth/login", authRateLimiter, loginHandler);
app.delete("/api/admin/users/:id", strictRateLimiter, deleteUserHandler);
```

### 2. Security Headers (Helmet)

**Status:** ✅ Enhanced in PR #13815

**Current Configuration:**

- **HSTS:** 1 year max-age, includeSubDomains, preload
- **X-Frame-Options:** DENY (prevents clickjacking)
- **X-Content-Type-Options:** nosniff
- **Referrer-Policy:** strict-origin-when-cross-origin
- **X-XSS-Protection:** 1; mode=block (legacy browsers)
- **CSP:** Comprehensive directives
  - default-src: 'self'
  - script-src: 'self' (no unsafe-inline)
  - style-src: 'self', 'unsafe-inline'
  - img-src: 'self', data:, https:
  - connect-src: 'self'
  - object-src: 'none'
  - frame-src: 'none'

**Applied automatically to all routes via:**

```typescript
import { securityHeaders } from "./middleware/security";
app.use(securityHeaders);
```

### 3. Enhanced Input Sanitization

**Location:** `server/src/middleware/input-sanitization-enhanced.ts`
**Status:** ⚠️ Needs integration into app.ts

**Protection Against:**

- SQL Injection (UNION, SELECT, INSERT, UPDATE, DELETE)
- NoSQL Injection (MongoDB $operators, Cypher)
- XSS (script tags, event handlers, javascript: URIs)
- Command Injection (shell metacharacters, wget, curl)
- Path Traversal (../, %2e%2e, absolute paths)
- LDAP Injection
- XML Injection (CDATA, DOCTYPE, ENTITY)
- GraphQL abuse (introspection, oversized queries)

**Integration Required:**

```typescript
// In server/src/app.ts
import {
  enhancedSanitization,
  validateFilePath,
  sanitizeGraphQL,
  encodeOutput,
} from "./middleware/input-sanitization-enhanced";

// Apply sanitization before route handlers
app.use(enhancedSanitization);

// For GraphQL endpoint
app.use("/graphql", sanitizeGraphQL);

// For file operations
app.use("/api/files/*", validateFilePath);

// Response encoding (optional, for extra safety)
app.use(encodeOutput);
```

### 4. CORS Configuration

**Location:** `server/src/middleware/security.ts`

**Current Settings:**

```typescript
export const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://intelgraph.app",
    ];
    // Validates origin or allows no-origin requests (mobile apps)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Requested-With"],
};
```

**Usage:**

```typescript
import cors from "cors";
import { corsConfig } from "./middleware/security";
app.use(cors(corsConfig));
```

### 5. Request Validation

**Location:** `server/src/middleware/security.ts`

**Detects:**

- Path traversal patterns (../)
- XSS patterns (<script)
- SQL injection (union.\*select)
- JavaScript protocol URIs
- Code injection (eval())

**Auto-applied, logs suspicious requests**

### 6. API Key Authentication

**Location:** `server/src/middleware/security.ts`

```typescript
import { apiKeyAuth } from "./middleware/security";

// Expects X-API-Key header or api_key query param
app.get("/api/external/data", apiKeyAuth, externalDataHandler);

// Set valid keys in environment:
// VALID_API_KEYS=key1,key2,key3
```

### 7. IP Whitelisting

**Location:** `server/src/middleware/security.ts`

```typescript
import { ipWhitelist } from "./middleware/security";

// Admin endpoints
const adminIPs = (process.env.ADMIN_IPS || "").split(",");
app.use("/api/admin", ipWhitelist(adminIPs));

// Automatically allows localhost in development
```

## Environment Variables

```bash
# .env.production
ALLOWED_ORIGINS=https://summit.app,https://api.summit.app
VALID_API_KEYS=sk_prod_abc123,sk_prod_xyz789
ADMIN_IPS=203.0.113.0,198.51.100.0
ENABLE_API_VALIDATION=true
NODE_ENV=production
```

## Security Testing

### Unit Tests

```typescript
// tests/security/input-sanitization.test.ts
import { enhancedSanitization } from "@/middleware/input-sanitization-enhanced";

describe("Input Sanitization", () => {
  it("blocks SQL injection attempts", async () => {
    const req = { body: { query: "'; DROP TABLE users--" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await enhancedSanitization(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("sanitizes XSS in nested objects", () => {
    // Test recursive sanitization
  });
});
```

### Integration Tests

```bash
# Run OWASP ZAP security scan
npm run security:scan

# Manual testing with curl
curl -X POST http://localhost:4000/api/test \
  -H "Content-Type: application/json" \
  -d '{"input": "<script>alert(1)</script>"}'
# Should return 400 with sanitization error
```

### Security Headers Validation

```bash
# Check headers with curl
curl -I https://api.summit.app

# Should see:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
# X-XSS-Protection: 1; mode=block
```

## GraphQL Security

### Current Protections

1. **Query Depth Limiting:** Max depth 6 (configured in `app.ts`)
2. **Introspection Disabled:** In production
3. **Persisted Queries:** Active
4. **Rate Limiting:** 100 queries/min
5. **Field-level Authorization:** PBAC plugin

### Additional Hardening Needed

```typescript
// TODO: Add query complexity analysis
import { createComplexityLimitRule } from "graphql-validation-complexity";

const complexityLimit = createComplexityLimitRule(1000, {
  onCost: (cost) => console.log("Query cost:", cost),
});

const server = new ApolloServer({
  validationRules: [complexityLimit],
});
```

## Monitoring & Alerting

### Security Events Logged

- Rate limit exceeded (with IP, User-Agent, path)
- Invalid API keys (with key prefix)
- Unauthorized CORS origins
- Suspicious request patterns (injection attempts)
- IP whitelist violations

### Log Format

```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "ip": "203.0.113.0",
  "path": "/api/auth/login",
  "method": "POST",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-12-19T22:00:00.000Z"
}
```

### Integration with Monitoring

```typescript
// Already integrated with trackError() from monitoring middleware
import { trackError } from "../monitoring/middleware";

// Automatically tracks:
// - rate_limiting/RateLimitExceeded
// - security/RequestTooLarge
// - security/UnauthorizedIP
// - security/MissingAPIKey
// - security/InvalidAPIKey
// - security/SuspiciousRequest
// - security/UnauthorizedOrigin
```

## OWASP Top 10 Coverage

### A01: Broken Access Control ✅

- RBAC middleware on protected routes
- IP whitelisting for admin endpoints
- API key validation
- CORS origin validation

### A02: Cryptographic Failures ✅

- HTTPS enforcement (HSTS with preload)
- TLS 1.3 minimum (infrastructure level)
- Secure cookie flags
- No sensitive data in URLs

### A03: Injection ✅

- Enhanced input sanitization (SQL, NoSQL, XSS, Command, Path, LDAP, XML)
- Parameterized queries (database layer)
- GraphQL query validation
- Output encoding

### A04: Insecure Design ⚠️

- Rate limiting on resource-intensive operations ✅
- Circuit breakers needed for external services ❌
- Business logic security review needed ❌

### A05: Security Misconfiguration ✅

- Comprehensive security headers
- Error handling hides stack traces in production
- No default credentials
- Security-focused environment variables

### A06: Vulnerable Components ⚠️

- Regular `pnpm audit` required
- Dependency updates automated ✅
- SBOM generation needed ❌

### A07: Authentication Failures ✅

- JWT validation
- Rate limiting on auth endpoints (5 req/min)
- MFA support configured
- No credential stuffing vulnerabilities

### A08: Software/Data Integrity ⚠️

- SBOM generation needed ❌
- SRI for CDN resources needed ❌
- Code signing needed ❌

### A09: Logging/Monitoring ✅

- Comprehensive security event logging
- Integration with monitoring middleware
- Performance metrics included

### A10: SSRF ⚠️

- URL validation needed for external requests ❌
- Private IP blocking needed ❌
- DNS rebinding protection needed ❌

## Next Steps

### Immediate (This Sprint)

1. ✅ Merge PR #13815 (security headers)
2. ⏳ Integrate enhanced input sanitization into `app.ts`
3. ⏳ Run OWASP ZAP validation scan
4. ⏳ Add security middleware tests

### Short-term (Next Sprint)

5. Implement GraphQL query complexity analysis
6. Add Permissions-Policy header
7. Implement SSRF protections (URL validation, IP blocking)
8. Add circuit breakers for external services

### Long-term (Next Quarter)

9. SBOM generation and tracking
10. SRI for CDN resources
11. Security monitoring dashboard (Grafana)
12. Automated security regression testing
13. Penetration testing engagement

## Production Deployment Checklist

- [ ] All security middleware applied in `app.ts`
- [ ] Environment variables set correctly
- [ ] ALLOWED_ORIGINS includes only production domains
- [ ] ADMIN_IPS configured
- [ ] TLS certificates valid and auto-renewing
- [ ] Security headers validated with securityheaders.com
- [ ] OWASP ZAP scan shows no high/critical issues
- [ ] Rate limiting tested under load
- [ ] Logging configured to security SIEM
- [ ] Incident response procedures documented

## Security Contacts

Security issues should be reported via:

- GitHub Security Advisories
- Email: security@summit.app (if applicable)
- See SECURITY.md for full vulnerability disclosure policy

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limiting](https://express-rate-limit.mintlify.app/)
- Summit Issue #13598: OWASP ZAP Security Scan Findings

---

**Last Updated:** 2025-12-19  
**Version:** 1.0  
**Owner:** Security Team / @BrianCLong
