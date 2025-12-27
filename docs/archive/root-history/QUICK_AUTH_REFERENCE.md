# Summit Authentication & Authorization - Quick Reference

## Key Files by Category

### JWT & Token Management
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/services/AuthService.ts` | 1-438 | Main authentication service - login, token gen, verification |
| `/server/src/conductor/auth/jwt-rotation.ts` | 1-478 | Automatic JWT key rotation (24h cycle, RS256) |
| `/server/src/middleware/auth.ts` | 1-49 | Express auth middleware for Bearer tokens |

### RBAC (Role-Based Access Control)
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/conductor/auth/rbac-middleware.ts` | 1-457 | Complete RBAC manager with 4 roles (admin, operator, analyst, viewer) |
| `/server/src/middleware/rbac.ts` | 1-122 | Permission check middlewares (requirePermission, requireRole) |

### Tenant Isolation
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/middleware/withTenant.ts` | 1-118 | Higher-order resolver wrapper, tenant filtering, cache scoping |
| `/server/src/middleware/tenantValidator.ts` | 1-80+ | Tenant access validation and compartment checks |
| `/server/src/middleware/context-binding.ts` | 1-73 | Extracts X-Tenant-Id, X-Purpose, X-Legal-Basis, X-Sensitivity |

### Policy-Based Authorization (OPA)
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/middleware/opa-abac.ts` | 1-377 | ABAC/OPA integration with field-level authz, OIDC validation, residency enforcement |
| `/server/src/middleware/opa.ts` | 1-80+ | OPA middleware with caching, policy evaluation logging |
| `/server/src/middleware/opa-enforcer.ts` | 1-80+ | Budget and four-eyes approval enforcement |
| `/server/src/middleware/opa-with-appeals.ts` | 1-80+ | Appeal system for denied access (24h SLA) |
| `/server/src/middleware/withAuthAndPolicy.ts` | 1-414 | HOF resolver wrapper with compartment checks |
| `/server/src/middleware/maestro-authz.ts` | 1-80+ | Maestro-specific OPA authorization |

### Service-to-Service Auth
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/middleware/spiffe-auth.ts` | 1-493 | Zero-trust mTLS with SPIFFE/SPIRE (SVID management) |

### Advanced Auth Features
| File | Lines | Purpose |
|------|-------|---------|
| `/src/auth/webauthn/WebAuthnManager.ts` | 1-100+ | WebAuthn passwordless auth, biometric, hardware keys |
| `/src/auth/webauthn/WebAuthnMiddleware.ts` | - | WebAuthn middleware |
| `/services/common/auth/webauthn/step-up.ts` | - | Step-up authentication for sensitive operations |

### Audit & Security
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/audit/advanced-audit-system.ts` | 1-100+ | Immutable audit logs (20+ event types, 6 compliance frameworks) |
| `/server/src/middleware/audit-logger.ts` | 1-23 | HTTP audit logging middleware |
| `/server/src/pii/redactionMiddleware.ts` | 1-50+ | PII redaction with clearance levels & purpose-limiting |

### Infrastructure
| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/db/neo4j.ts` | 1-80+ | Neo4j driver with mock fallback, connectivity checks |
| `/server/src/config/production-security.ts` | 1-80+ | Complete security middleware stack (13 layers) |
| `/server/src/middleware/security.ts` | - | Helmet, CORS, rate limiting, CSP, etc. |

---

## Authentication Flows

### 1. Login Flow
```
POST /auth/login
  ↓ 
AuthService.login()
  ↓
Verify email + password (Argon2)
  ↓
generateTokens()
  ↓
Sign JWT (HS256) + Create session
  ↓
Return: token (24h) + refreshToken (7d)
```

### 2. Request Authentication
```
GET /api/endpoint Authorization: Bearer <JWT>
  ↓
ensureAuthenticated()
  ↓
Extract token → Verify signature → Check blacklist → Load user
  ↓
req.user = user → next()
```

### 3. Authorization Chain
```
Request with token
  ↓
authenticateUser() [Extract user]
  ↓
rbacManager.getUserRoles() [Get roles from groups/JWT]
  ↓
requirePermission() [Check RBAC]
  ↓
tenantValidator.validateTenantAccess() [Validate tenant]
  ↓
contextBindingMiddleware() [Extract purpose/legal basis]
  ↓
opaAuthzMiddleware() [Call OPA for ABAC decision]
  ↓
addTenantFilter() [Filter DB queries by tenant]
  ↓
executeResolver()
  ↓
auditLogger() [Log action]
```

---

## Roles & Permissions

### RBAC Tiers

| Role | Permissions | Use Case |
|------|------------|----------|
| **ADMIN** | `['*']` wildcard | Full system access |
| **OPERATOR** | workflow:*, task:*, evidence:*, serving:* | Workflow execution & management |
| **ANALYST** | workflow:read/exec, task:read/exec, evidence:*, serving:* | Analysis execution |
| **VIEWER** | :read only | Read-only access |

### Permission Format
- `resource:action` (e.g., `investigation:read`, `workflow:create`)
- Wildcard support: `resource:*` matches all actions
- Admin `*` matches everything

---

## Database Isolation

### Tenant Filtering (Neo4j)
```typescript
// Original query
MATCH (n:Entity) RETURN n

// Auto-enhanced with tenant filter
MATCH (n:Entity) WHERE n.tenantId = $tenantId RETURN n
```

### PostgreSQL Schema
```sql
users (id, email, password_hash, role, is_active)
user_sessions (user_id, refresh_token, expires_at, is_revoked)
token_blacklist (token_hash, revoked_at, expires_at)
```

---

## Configuration

### Environment Variables

```bash
# JWT
JWT_SECRET=your-secret-key
JWT_ISSUER=maestro-conductor
JWT_AUDIENCE=intelgraph-platform

# RBAC
RBAC_ENABLED=true
RBAC_ROLES_CLAIM=groups
RBAC_DEFAULT_ROLE=viewer

# OPA
OPA_URL=http://localhost:8181
OPA_ENFORCEMENT=true

# SPIFFE
SPIRE_TRUST_DOMAIN=intelgraph.local
ZERO_TRUST_ENABLED=true

# Databases
NEO4J_URI=bolt://neo4j:7687
REDIS_URL=redis://localhost:6379
```

---

## Critical Gaps & Recommendations

### Priority 1 (Critical)
1. Complete OIDC implementation (Line 161 in opa-abac.ts: TODO)
2. Enable database encryption at rest
3. Implement immutable audit log (append-only storage)
4. Add HSM/KMS integration for keys

### Priority 2 (High)
1. Make MFA mandatory for admin role
2. Add field-level redaction to GraphQL
3. Implement per-user rate limiting
4. Add anomaly detection & fraud scoring

### Priority 3 (Medium)
1. Create dynamic role management API
2. Implement attribute inheritance
3. Add request signing (HMAC)
4. Policy-as-code framework for OPA

---

## Testing Files

```
/server/tests/socket-auth-rbac.test.ts        - WebSocket auth with RBAC
/server/tests/compartment-isolation.test.ts   - Tenant isolation
/server/tests/abac-entity-visibility.test.ts  - ABAC visibility
/tests/unit/policy.test.ts                    - Policy engine
/tests/unit/dlp.test.ts                       - Data loss prevention
```

---

## Quick Lookup

**How to check if user has permission?**
→ `/server/src/middleware/rbac.ts` `requirePermission()` function

**How to add tenant scoping to a resolver?**
→ `/server/src/middleware/withTenant.ts` `withTenant()` HOF

**How to log an audit event?**
→ Call `writeAudit()` from audit service with AuditEvent interface

**How to enforce OPA policy?**
→ `/server/src/middleware/opa-abac.ts` `opaAuthzMiddleware()` or `createAuthzDirective()`

**Where are tokens verified?**
→ `/server/src/services/AuthService.ts` `verifyToken()` method

**How to add new role?**
→ `/server/src/conductor/auth/rbac-middleware.ts` add to `this.config.roles` object

---

## Full Documentation
See: `/home/user/summit/AUTH_ARCHITECTURE_DOCUMENTATION.md` (1644 lines)

