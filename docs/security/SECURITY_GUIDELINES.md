# Security Guidelines

## Overview

This document outlines the comprehensive security measures and guidelines for the IntelGraph platform, implementing OWASP Top 10 2021 protections and industry best practices.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [OWASP Top 10 Compliance](#owasp-top-10-compliance)
3. [Authentication & Authorization](#authentication--authorization)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Input Validation](#input-validation)
7. [Security Headers](#security-headers)
8. [Rate Limiting](#rate-limiting)
9. [Secrets Management](#secrets-management)
10. [Security Monitoring](#security-monitoring)
11. [Incident Response](#incident-response)
12. [Security Testing](#security-testing)
13. [Developer Guidelines](#developer-guidelines)

---

## Security Architecture

### Defense in Depth

IntelGraph implements multiple layers of security controls:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Network Security (TLS 1.3, Firewall, WAF)    │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Application Security (Headers, CORS, CSP)    │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Authentication (JWT, Token Rotation)         │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Authorization (RBAC, ABAC, OPA)              │
├─────────────────────────────────────────────────────────┤
│  Layer 5: Input Validation (Sanitization, Type Check)  │
├─────────────────────────────────────────────────────────┤
│  Layer 6: Data Protection (Encryption, PII Redaction)  │
├─────────────────────────────────────────────────────────┤
│  Layer 7: Monitoring & Logging (SIEM, Audit Logs)      │
└─────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Zero Trust**: Never trust, always verify
2. **Least Privilege**: Minimal access rights by default
3. **Defense in Depth**: Multiple security layers
4. **Fail Secure**: Fail closed, not open
5. **Security by Design**: Baked in, not bolted on

---

## OWASP Top 10 Compliance

### A01:2021 – Broken Access Control

**Status**: ✅ Implemented

**Controls**:
- Role-Based Access Control (RBAC) - 4 roles: ADMIN, ANALYST, OPERATOR, VIEWER
- Attribute-Based Access Control (ABAC) via Open Policy Agent (OPA)
- JWT token-based authentication with short expiration (15 minutes)
- Token blacklist/revocation support
- Session management with device tracking
- Horizontal privilege escalation prevention

**Implementation**:
```typescript
// server/src/middleware/auth.ts
// server/src/middleware/rbac.ts
// server/src/middleware/opa-enforcer.ts
```

**Testing**:
```bash
npm run test:security:access-control
```

---

### A02:2021 – Cryptographic Failures

**Status**: ✅ Implemented

**Controls**:
- TLS 1.3 enforcement in production
- Argon2id password hashing (OWASP recommended)
- AES-256-GCM for data encryption
- RS256 JWT signature algorithm
- Secure random token generation
- Key rotation every 90 days
- No hardcoded secrets

**Implementation**:
```typescript
// server/src/services/AuthService.ts (Argon2 hashing)
// server/src/config/owasp-security.ts (Crypto config)
```

**Environment Variables**:
```bash
JWT_SECRET=<strong-secret-key>
JWT_REFRESH_SECRET=<strong-refresh-secret>
ENCRYPTION_KEY=<aes-256-key>
```

---

### A03:2021 – Injection

**Status**: ✅ Implemented

**Controls**:
- SQL injection prevention via parameterized queries
- NoSQL injection prevention
- XSS protection via input sanitization and CSP
- Command injection prevention
- LDAP injection prevention
- GraphQL query depth limiting (max: 6)
- GraphQL complexity analysis

**Implementation**:
```typescript
// server/src/middleware/input-validation.ts
// server/src/middleware/sanitize.ts
// server/src/middleware/graphql-hardening.ts
```

**Example - SQL Injection Prevention**:
```typescript
// ✅ Correct - Parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ Wrong - String concatenation
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

---

### A04:2021 – Insecure Design

**Status**: ✅ Implemented

**Controls**:
- Threat modeling integrated into design process
- Secure SDLC practices
- Business logic validation
- Resource consumption limits
- Circuit breaker patterns
- Backpressure handling

**Implementation**:
```typescript
// server/src/middleware/backpressure.ts
// server/src/middleware/validation.ts
```

---

### A05:2021 – Security Misconfiguration

**Status**: ✅ Implemented

**Controls**:
- Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
- CORS whitelist enforcement
- Error handling without information leakage
- Server version hiding
- Directory listing disabled
- Default accounts disabled in production
- Introspection disabled in production

**Implementation**:
```typescript
// server/src/security/security-headers.ts
// server/src/config/production-security.ts
```

**Security Headers**:
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

### A06:2021 – Vulnerable and Outdated Components

**Status**: ✅ Implemented

**Controls**:
- Automated dependency scanning (npm audit, Dependabot, Snyk)
- Daily security updates via Dependabot
- Software Bill of Materials (SBOM) generation
- License compliance checking
- Vulnerability age limit (7 days max in production)
- Automated patching for critical vulnerabilities

**CI/CD Integration**:
```yaml
# .github/workflows/security-audit.yml
# .github/workflows/nightly-cve-scan.yml
# .github/dependabot.yml (enhanced)
```

**Commands**:
```bash
npm audit --audit-level=critical
npm audit fix
npm outdated
```

---

### A07:2021 – Identification and Authentication Failures

**Status**: ✅ Implemented

**Controls**:
- JWT with short-lived access tokens (15 min in prod)
- Refresh token rotation on use
- Token blacklist for revocation
- Strong password requirements (min 12 chars, complexity)
- Password history (prevent reuse of last 5)
- Multi-factor authentication (MFA) ready
- Rate limiting on auth endpoints (5 req/min)
- Session management with device tracking
- Geo-fencing capabilities
- Brute force protection

**Implementation**:
```typescript
// server/src/services/AuthService.ts
// server/src/config/owasp-security.ts
// server/migrations/007_add_token_security.sql
```

**Authentication Flow**:
```
1. Login → Generate access token (15m) + refresh token (7d)
2. Access protected resource → Validate access token
3. Token expires → Use refresh token to get new pair
4. Old refresh token invalidated (rotation)
5. Logout → Revoke all tokens for user
```

**Password Requirements**:
- Minimum length: 12 characters
- Must include: uppercase, lowercase, number, special character
- Cannot reuse last 5 passwords
- Must change every 90 days (production)

---

### A08:2021 – Software and Data Integrity Failures

**Status**: ✅ Implemented

**Controls**:
- Code signing for releases
- Subresource Integrity (SRI) for CDN resources
- Content Security Policy (CSP)
- Dependency verification
- Integrity checks for critical files
- Trusted repository enforcement

**Implementation**:
```typescript
// server/src/config/owasp-security.ts
```

---

### A09:2021 – Security Logging and Monitoring Failures

**Status**: ✅ Implemented

**Controls**:
- Comprehensive security logging (Pino)
- Audit trail for all privileged actions
- Failed login attempt tracking
- SIEM integration ready
- Real-time alerting for critical events
- Sensitive data redaction in logs
- Log retention (90 days in production)
- Correlation IDs for request tracing

**Implementation**:
```typescript
// server/src/middleware/audit-logger.ts
// server/src/middleware/requestId.ts
// server/src/middleware/siemMiddleware.ts
```

**Critical Events Logged**:
- Failed authentication attempts
- Privilege escalation attempts
- Token revocation
- Security header violations
- Rate limit exceeded
- Suspicious patterns detected (SQL injection, XSS)
- Data access by privileged users
- Configuration changes

**Log Format**:
```json
{
  "timestamp": "2025-11-20T10:30:00Z",
  "level": "warn",
  "event": "failed_login",
  "userId": "user_123",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "correlationId": "req_abc123",
  "details": {
    "attempts": 3,
    "lockout": false
  }
}
```

---

### A10:2021 – Server-Side Request Forgery (SSRF)

**Status**: ✅ Implemented

**Controls**:
- URL validation and sanitization
- Allowed protocol whitelist (https only in prod)
- Domain whitelist enforcement
- Private network blocking
- DNS rebinding protection

**Implementation**:
```typescript
// server/src/middleware/validation.ts
// server/src/config/owasp-security.ts
```

---

## Authentication & Authorization

### JWT Token Security

**Access Tokens**:
- Expiration: 15 minutes (production), 24 hours (development)
- Algorithm: RS256 (asymmetric)
- Claims: userId, email, role, permissions
- Storage: Memory/SessionStorage (never localStorage)

**Refresh Tokens**:
- Expiration: 7 days (production), 30 days (development)
- Rotation: New token generated on each refresh
- Revocation: Old token invalidated immediately
- Storage: Database (user_sessions table)

**Token Blacklist**:
- Hashed tokens (SHA-256) stored in token_blacklist table
- Automatic cleanup of expired entries
- Used for logout and security incidents

### Role-Based Access Control (RBAC)

**Roles**:
1. **ADMIN**: Full system access
2. **ANALYST**: Create, read, update investigations and entities
3. **OPERATOR**: Read and execute investigations
4. **VIEWER**: Read-only access

**Permission Matrix**:

| Action | ADMIN | ANALYST | OPERATOR | VIEWER |
|--------|-------|---------|----------|--------|
| investigation:create | ✅ | ✅ | ❌ | ❌ |
| investigation:read | ✅ | ✅ | ✅ | ✅ |
| investigation:update | ✅ | ✅ | ❌ | ❌ |
| investigation:delete | ✅ | ❌ | ❌ | ❌ |
| entity:create | ✅ | ✅ | ❌ | ❌ |
| entity:read | ✅ | ✅ | ✅ | ✅ |
| entity:update | ✅ | ✅ | ❌ | ❌ |
| entity:delete | ✅ | ✅ | ❌ | ❌ |
| admin:* | ✅ | ❌ | ❌ | ❌ |

---

## Data Protection

### Encryption

**Data at Rest**:
- Database: AES-256-GCM encryption
- File storage: Server-side encryption
- Backups: Encrypted with separate keys

**Data in Transit**:
- TLS 1.3 minimum
- Perfect Forward Secrecy (PFS)
- Certificate pinning (production)

### PII Handling

**Automatic Redaction**:
- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- API keys and secrets

**Implementation**:
```typescript
// server/src/middleware/pii-redaction.ts
// server/src/middleware/privacy.ts
// server/src/middleware/dlpMiddleware.ts
```

### Data Retention

- Logs: 90 days (production), 30 days (development)
- Audit trails: 1 year
- User sessions: 7 days after revocation
- Token blacklist: 24 hours after token expiry

---

## API Security

### GraphQL Security

**Query Depth Limiting**:
```typescript
maxDepth: 6 (production)
maxDepth: 10 (development)
```

**Query Complexity Analysis**:
```typescript
maxComplexity: 1000 (production)
maxComplexity: 5000 (development)
```

**Persisted Queries**:
- Enabled in production
- Pre-approved query enforcement
- Query hash validation

**Introspection**:
- Disabled in production
- Enabled in development/staging

**Rate Limiting**:
- 100 requests per minute (production)
- 200 requests per minute (development)

### REST API Security

**Rate Limiting**:
- 1000 requests per hour (production)
- 2000 requests per hour (development)

**Request Size Limits**:
- Max request size: 10MB
- Max upload size: 50MB
- Allowed file types: whitelist

### WebSocket Security

**Authentication**:
- JWT token in connection handshake
- Token validation on connect
- Automatic disconnect on token expiry

**Rate Limiting**:
- 50 messages per minute
- Connection limit per user

---

## Input Validation

### Validation Layers

1. **Schema Validation**: TypeScript types + Zod schemas
2. **Type Checking**: Runtime type validation
3. **Sanitization**: XSS, SQL injection, path traversal
4. **Business Logic**: Domain-specific rules

### Validation Rules

**Email**:
```typescript
z.string().email().max(255)
```

**Password**:
```typescript
z.string()
  .min(12)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
```

**ID**:
```typescript
z.string().uuid()
```

**File Upload**:
```typescript
allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
maxSize: 50MB
```

---

## Security Headers

### Required Headers (Production)

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
Permissions-Policy: camera=(), microphone=(), geolocation=(), ...
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

### Content Security Policy (CSP)

**Production CSP**:
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.intelgraph.com wss://graphql.intelgraph.com;
font-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

### Permissions Policy

Restricts browser features:
```
camera=(), microphone=(), geolocation=(),
payment=(), usb=(), magnetometer=(),
gyroscope=(), accelerometer=()
```

---

## Rate Limiting

### Endpoint-Specific Limits (OWASP Compliant)

**Authentication** (`/api/auth/*`):
- Window: 1 minute
- Limit: 5 requests
- Response: 429 Too Many Requests

**GraphQL** (`/graphql`):
- Window: 1 minute
- Limit: 100 requests
- Response: 429 Too Many Requests

**REST API** (`/api/*`):
- Window: 1 hour
- Limit: 1000 requests
- Response: 429 Too Many Requests

**File Upload**:
- Window: 1 hour
- Limit: 10 uploads
- Response: 429 Too Many Requests

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
Retry-After: 60
```

### Implementation

```typescript
// server/src/middleware/rateLimit.ts (Redis-backed)
// server/src/middleware/security.ts (In-memory)
```

---

## Secrets Management

### Environment Variables

**Required Secrets**:
```bash
# JWT
JWT_SECRET=<strong-secret-256-bit>
JWT_REFRESH_SECRET=<strong-secret-256-bit>

# Database
POSTGRES_PASSWORD=<strong-password>
NEO4J_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>

# Encryption
ENCRYPTION_KEY=<aes-256-key>

# Third-party APIs
OPENAI_API_KEY=<api-key>
```

### Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for all secrets
3. **Rotate secrets** every 90 days
4. **Use different secrets** for each environment
5. **Audit secret access** regularly
6. **Use secret managers** (AWS Secrets Manager, HashiCorp Vault)

### Secret Rotation

```bash
# Generate new JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update environment variables
# Restart services
# Invalidate old tokens
```

---

## Security Monitoring

### Metrics

**Security Metrics Tracked**:
- Failed login attempts
- Token revocations
- Rate limit hits
- Suspicious patterns detected
- Privilege escalation attempts
- Data access by role

### Alerts

**Critical Alerts** (Immediate notification):
- Multiple failed login attempts (5+)
- Privilege escalation detected
- SQL injection attempt
- XSS attempt
- Token blacklist evasion
- Unauthorized data access

**Warning Alerts** (Daily digest):
- Rate limit exceeded
- Unusual access patterns
- Failed authorization
- Certificate expiration (30 days)

### Monitoring Tools

- **Application**: Pino logging
- **Infrastructure**: Prometheus + Grafana
- **Security**: SIEM integration
- **Uptime**: Status page monitoring

---

## Incident Response

### Incident Severity Levels

**P0 - Critical**:
- Active data breach
- Complete service outage
- Privilege escalation in production
- Response time: Immediate

**P1 - High**:
- Security vulnerability exploited
- Partial service outage
- Data integrity issue
- Response time: 1 hour

**P2 - Medium**:
- Suspicious activity detected
- Performance degradation
- Non-critical vulnerability
- Response time: 4 hours

**P3 - Low**:
- Minor security issue
- Non-urgent maintenance
- Response time: 24 hours

### Response Playbook

1. **Detect**: Automated alerts + manual reporting
2. **Contain**: Isolate affected systems, revoke tokens
3. **Investigate**: Analyze logs, identify root cause
4. **Remediate**: Apply fixes, patch vulnerabilities
5. **Recover**: Restore services, verify integrity
6. **Document**: Post-mortem, lessons learned
7. **Improve**: Update security controls

### Contact Information

- **Security Team**: security@intelgraph.com
- **On-Call**: +1-XXX-XXX-XXXX
- **Escalation**: CTO/CISO

---

## Security Testing

### Automated Testing

**CI/CD Integration**:
```yaml
# .github/workflows/security.yml (CodeQL)
# .github/workflows/security-audit.yml (npm audit)
# .github/workflows/owasp-zap-scan.yml (ZAP scanning)
# .github/workflows/trivy.yml (Container scanning)
```

**Test Types**:
1. Static Application Security Testing (SAST) - CodeQL
2. Dependency Scanning - npm audit, Dependabot
3. Dynamic Application Security Testing (DAST) - OWASP ZAP
4. Container Scanning - Trivy
5. Secret Scanning - Gitleaks

### Manual Testing

**Penetration Testing**:
- Frequency: Quarterly
- Scope: Full application
- Tools: Burp Suite, OWASP ZAP, Metasploit
- Report: Findings + remediation plan

**Security Code Review**:
- All PRs reviewed for security issues
- Focus areas: Auth, input validation, data access
- Mandatory for high-risk changes

### Testing Commands

```bash
# Run security audit
npm run security:audit

# Run OWASP ZAP baseline scan
npm run security:zap:baseline

# Run all security tests
npm run security:test:all

# Check for secrets
npm run security:secrets:scan
```

---

## Developer Guidelines

### Secure Coding Practices

**1. Input Validation**
```typescript
// ✅ Correct
const validateEmail = (email: string) => {
  return z.string().email().max(255).safeParse(email).success;
};

// ❌ Wrong
const validateEmail = (email: string) => {
  return email.includes('@');
};
```

**2. SQL Injection Prevention**
```typescript
// ✅ Correct - Parameterized query
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ Wrong - String concatenation
await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```

**3. XSS Prevention**
```typescript
// ✅ Correct - Sanitize output
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);

// ❌ Wrong - Direct rendering
dangerouslySetInnerHTML={{ __html: userInput }}
```

**4. Authentication**
```typescript
// ✅ Correct - Check authentication
if (!req.user) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// ❌ Wrong - Trust client data
const userId = req.body.userId; // Never trust client!
```

**5. Error Handling**
```typescript
// ✅ Correct - Generic error
return res.status(500).json({ error: 'Internal server error' });

// ❌ Wrong - Detailed error
return res.status(500).json({ error: error.stack });
```

### Security Checklist (PR Review)

- [ ] All inputs validated and sanitized
- [ ] Authentication required for protected routes
- [ ] Authorization checked (RBAC/ABAC)
- [ ] SQL queries use parameterized statements
- [ ] No secrets in code or logs
- [ ] Error messages don't leak information
- [ ] Rate limiting applied where needed
- [ ] Sensitive data encrypted
- [ ] Security headers configured
- [ ] Tests include security scenarios
- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit)

### Git Hooks

**Pre-commit**:
```bash
# Check for secrets
npm run security:secrets:scan

# Run linter
npm run lint

# Run type check
npm run typecheck
```

**Pre-push**:
```bash
# Run security audit
npm audit --audit-level=critical

# Run tests
npm test
```

---

## Compliance & Standards

### Frameworks

- **OWASP Top 10 2021**: ✅ Full compliance
- **NIST Cybersecurity Framework**: Implemented
- **SOC 2 Type II**: In progress
- **ISO 27001**: Planned

### Certifications

- **OWASP Application Security Verification Standard (ASVS)**: Level 2
- **CWE/SANS Top 25**: Mitigated

### Audits

- **Internal**: Quarterly
- **External**: Annual
- **Penetration Testing**: Quarterly

---

## Additional Resources

### Documentation

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### Internal Documentation

- [API Security](./API_SECURITY.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [Security Architecture](./ARCHITECTURE.md)

### Training

- OWASP Top 10 Training (Required for all developers)
- Secure Coding Practices (Quarterly)
- Security Awareness (Monthly)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-20 | Security Team | Initial OWASP-compliant guidelines |

---

**Document Owner**: Security Team
**Last Reviewed**: 2025-11-20
**Next Review**: 2026-02-20
