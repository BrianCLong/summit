# Threat Model: Authentication & Authorization

> **Owner**: Security Team
> **Last Updated**: 2025-12-06
> **Risk Tier**: Critical
> **Status**: Approved

## 1. Feature Overview

**Description**: The authentication and authorization system handles user identity verification, session management, JWT token lifecycle, and multi-tenant RBAC/ABAC enforcement via OPA policies.

**Scope**:
- User login/logout flows
- JWT access and refresh token management
- Multi-tenant RBAC with role hierarchy
- ABAC policy enforcement via OPA
- Session management and device tracking
- MFA/Step-up authentication
- Service-to-service authentication

**Out of Scope**:
- User registration (handled by identity provider)
- Password reset flows (delegated to IdP)
- SSO federation (separate threat model)

**Related Components**:
- `server/src/auth/*` - Core auth logic
- `server/src/conductor/auth/*` - JWT rotation, RBAC middleware
- `SECURITY/policy/opa/*` - OPA policy definitions
- `services/common/auth/*` - WebAuthn, step-up auth

---

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| User credentials | Critical | Passwords (hashed), API keys, MFA secrets |
| JWT tokens | Critical | Access tokens (15m) and refresh tokens (7d) |
| Session data | High | Active sessions, device fingerprints, IP history |
| OPA policies | Critical | Authorization rules that govern all access |
| Tenant membership | High | User-to-tenant mappings, role assignments |
| Clearance levels | Critical | Classification access (unclassified → TS/SCI) |
| Audit logs | High | Authentication events, policy decisions |

---

## 3. Entry Points

| Entry Point | Protocol | Authentication | Trust Level | Description |
|-------------|----------|----------------|-------------|-------------|
| `/api/auth/login` | HTTPS | None (credentials in body) | Unauthenticated | Initial authentication |
| `/api/auth/refresh` | HTTPS | Refresh token | Authenticated | Token refresh |
| `/api/auth/logout` | HTTPS | JWT | Authenticated | Session termination |
| `/api/auth/mfa/*` | HTTPS | Partial (during MFA) | Step-up | MFA verification |
| `/graphql` | HTTPS | JWT | Authenticated | All GraphQL operations |
| OPA sidecar | gRPC | mTLS | Internal | Policy decisions |
| Service mesh | mTLS | SPIFFE | Internal | Service-to-service auth |

---

## 4. Trust Boundaries

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Authentication Flow                               │
│                                                                          │
│  ┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌───────────────┐  │
│  │ Browser │────▶│   WAF   │────▶│  API Server │────▶│  OPA Sidecar  │  │
│  │ (User)  │     │  (CDN)  │     │   (Auth)    │     │   (Policy)    │  │
│  └─────────┘     └─────────┘     └─────────────┘     └───────────────┘  │
│       │               │                │                    │            │
│  [Untrusted]    [DDoS/TLS]      [JWT Validation]      [Policy Check]    │
│                                        │                                 │
│                                        ▼                                 │
│                              ┌─────────────────┐     ┌───────────────┐  │
│                              │   PostgreSQL    │     │     Redis     │  │
│                              │ (Users/Roles)   │     │  (Sessions)   │  │
│                              └─────────────────┘     └───────────────┘  │
│                                  [Internal]             [Internal]       │
└──────────────────────────────────────────────────────────────────────────┘
```

| Boundary | From | To | Controls |
|----------|------|-----|----------|
| Internet → WAF | Untrusted | DMZ | TLS 1.3, rate limiting, WAF rules |
| WAF → API | DMZ | Application | CORS, CSP, request validation |
| API → OPA | Application | Policy | mTLS, localhost binding |
| API → Database | Application | Data | Connection pooling, encrypted connections |
| Service → Service | Internal | Internal | mTLS, SPIFFE identities |

---

## 5. Threats

### 5.1 STRIDE Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| T01 | Spoofing | Session hijacking | Steal JWT from XSS, network sniffing | Medium | Critical | Critical |
| T02 | Spoofing | Credential stuffing | Automated login attempts with breached credentials | High | High | Critical |
| T03 | Spoofing | JWT forgery | Weak secret, algorithm confusion attack | Low | Critical | High |
| T04 | Spoofing | Service impersonation | Compromise service identity, forge mTLS cert | Low | Critical | High |
| T05 | Tampering | Token manipulation | Modify JWT claims to escalate privileges | Low | Critical | High |
| T06 | Tampering | Policy tampering | Modify OPA policies to bypass authorization | Low | Critical | High |
| T07 | Repudiation | Auth event denial | Delete/modify audit logs to hide breach | Medium | High | High |
| T08 | Info Disclosure | Token leakage | JWT exposed in logs, URLs, or error messages | Medium | Critical | Critical |
| T09 | Info Disclosure | User enumeration | Different responses for valid vs invalid users | Medium | Medium | Medium |
| T10 | Info Disclosure | Timing attacks | Password comparison timing reveals info | Low | Medium | Low |
| T11 | DoS | Auth endpoint flooding | Overwhelm login endpoint | High | High | Critical |
| T12 | DoS | Account lockout abuse | Lock out legitimate users | Medium | Medium | Medium |
| T13 | Elevation | Horizontal privilege escalation | Access other tenant's resources | Medium | Critical | Critical |
| T14 | Elevation | Vertical privilege escalation | Gain admin from analyst role | Medium | Critical | Critical |
| T15 | Elevation | Clearance bypass | Access TS data with Secret clearance | Low | Critical | High |

### 5.2 Multi-Tenant Specific Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| M01 | Isolation | Cross-tenant data access | Manipulate tenant_id in requests | Medium | Critical | Critical |
| M02 | Isolation | Tenant enumeration | Discover other tenant IDs/names | Medium | Medium | Medium |
| M03 | Isolation | Shared resource leakage | Cache/log data visible across tenants | Low | High | Medium |

---

## 6. Mitigations

| Threat ID | Mitigation | Status | Implementation | Owner |
|-----------|------------|--------|----------------|-------|
| T01 | Short-lived tokens (15m), HttpOnly cookies | Implemented | `server/src/auth/jwt.ts` | Auth Team |
| T01 | Token binding to device fingerprint | Implemented | `server/src/auth/context.ts` | Auth Team |
| T02 | Rate limiting (5 req/min on auth) | Implemented | `server/src/middleware/rateLimit.ts` | Platform |
| T02 | Account lockout after 5 failures | Implemented | `server/src/services/AuthService.ts` | Auth Team |
| T03 | RS256 algorithm, strong secrets | Implemented | `server/src/config/owasp-security.ts` | Security |
| T03 | Algorithm allowlist in validation | Implemented | `server/src/auth/jwt.ts` | Auth Team |
| T04 | mTLS with SPIFFE identities | Implemented | Service mesh config | Platform |
| T05 | Server-side claim verification | Implemented | `server/src/middleware/auth.ts` | Auth Team |
| T06 | Policy versioning, signature verification | Implemented | `SECURITY/policy/opa-bundle.ts` | Security |
| T07 | Immutable audit logs, SIEM forwarding | Implemented | `server/src/middleware/audit-logger.ts` | Security |
| T08 | Token redaction in logs | Implemented | `server/src/middleware/pii-redaction.ts` | Platform |
| T09 | Consistent response times/messages | Implemented | `server/src/services/AuthService.ts` | Auth Team |
| T10 | Constant-time comparison | Implemented | Argon2 library | Auth Team |
| T11 | Rate limiting, WAF rules, auto-scaling | Implemented | Infrastructure | Platform |
| T12 | CAPTCHA after lockout, gradual backoff | Implemented | `server/src/services/AuthService.ts` | Auth Team |
| T13 | OPA tenant isolation policy | Implemented | `SECURITY/policy/opa/multi-tenant-abac.rego` | Security |
| T14 | Role hierarchy enforcement, JIT elevation | Implemented | `server/src/auth/multi-tenant-rbac.ts` | Auth Team |
| T15 | Clearance level checks in OPA | Implemented | `SECURITY/policy/opa/multi-tenant-abac.rego` | Security |
| M01 | Tenant ID from JWT, not request | Implemented | `server/src/middleware/auth.ts` | Auth Team |
| M02 | Tenant ID obfuscation | Implemented | UUID-based tenant IDs | Platform |
| M03 | Tenant-scoped caching | Implemented | Redis key prefixing | Platform |

### Mitigation Details

#### M-AUTH-01: JWT Security Configuration
**Addresses**: T01, T03, T05, T08
**Description**: Comprehensive JWT security with algorithm restrictions, short expiry, and secure storage.
**Implementation**:
```typescript
// server/src/config/owasp-security.ts
const jwtConfig = {
  algorithm: 'RS256',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'https://intelgraph.example.com',
  audience: 'intelgraph-api',
  clockTolerance: 30, // seconds
};
```

#### M-AUTH-02: Multi-Tenant Isolation
**Addresses**: T13, M01, M02, M03
**Description**: OPA-enforced tenant isolation with server-side tenant resolution.
**Implementation**:
```rego
# SECURITY/policy/opa/multi-tenant-abac.rego
tenant_access if {
    input.user.tenant_ids[_] == input.resource.tenant_id
}

deny if {
    not tenant_access
    input.resource.tenant_id != ""
}
```

---

## 7. Residual Risk

| Threat ID | Residual Risk | Severity | Acceptance Rationale | Accepted By | Date |
|-----------|---------------|----------|---------------------|-------------|------|
| T01 | Token valid until expiry if stolen | Medium | 15m window acceptable; detection via anomaly | Security Lead | 2025-12-06 |
| T02 | Sophisticated attackers may evade rate limits | Low | Defense in depth with WAF, monitoring | Security Lead | 2025-12-06 |
| T07 | Log tampering by root-level compromise | Low | Requires infrastructure breach; external SIEM mitigates | CISO | 2025-12-06 |
| T11 | Distributed attacks may overwhelm defenses | Medium | Auto-scaling + WAF; accept degradation during attack | Platform Lead | 2025-12-06 |

---

## 8. Security Controls Summary

### Preventive Controls
- [x] RS256 JWT with strong key rotation
- [x] Short-lived access tokens (15m)
- [x] Refresh token rotation on use
- [x] Rate limiting on auth endpoints
- [x] Account lockout with gradual backoff
- [x] OPA policy enforcement
- [x] Tenant isolation at policy layer
- [x] Clearance level verification
- [x] mTLS for internal services

### Detective Controls
- [x] Failed login monitoring
- [x] Anomaly detection for session behavior
- [x] Cross-tenant access attempt alerts
- [x] Policy decision audit logging
- [x] SIEM integration
- [x] Token usage tracking

### Responsive Controls
- [x] Automatic token revocation
- [x] Session termination API
- [x] Emergency tenant isolation
- [x] Incident response playbooks

---

## 9. Testing Requirements

| Threat ID | Test Type | Test Description | Automation |
|-----------|-----------|------------------|------------|
| T01 | Pentest | Session fixation, token theft scenarios | Manual |
| T02 | Integration | Rate limiting validation | Yes |
| T03 | Unit | JWT validation with various attack tokens | Yes |
| T05 | Unit | Claim manipulation detection | Yes |
| T13 | Integration | Cross-tenant access attempts | Yes |
| T14 | Integration | Role escalation prevention | Yes |
| T15 | Integration | Clearance boundary tests | Yes |

---

## 10. References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Security Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [IntelGraph Security Guidelines](../SECURITY_GUIDELINES.md)
- [Multi-Tenant ABAC Policy](../../../SECURITY/policy/opa/multi-tenant-abac.rego)
- [AI Agent Risk Audit](../../../security/ai-agent-risk-audit.md)

---

## 11. Review History

| Date | Reviewer | Changes | Version |
|------|----------|---------|---------|
| 2025-12-06 | Security Team | Initial threat model | 1.0 |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | Security Team | 2025-12-06 | Approved |
| Security Review | Security Lead | 2025-12-06 | Approved |
| Tech Lead | Platform Lead | 2025-12-06 | Approved |
