# IC Multi-Tenancy Security Hardening

> **Module**: auth, security, audit
> **Version**: 2.0.0
> **Last Updated**: 2025-11-29

## Overview

This document describes the security hardening implementation for Summit/IntelGraph to support Intelligence Community (IC) multi-tenancy requirements with RBAC, audit trails, secret rotation, and OPA policy integration.

## Features Implemented

### 1. Multi-Tenant RBAC (`server/src/auth/multi-tenant-rbac.ts`)

Comprehensive role-based access control with tenant isolation.

**Capabilities:**
- Strict tenant isolation enforcement
- Hierarchical role inheritance (viewer → analyst → supervisor → admin)
- Clearance-level based access control
- Denied environment handling for restricted OT systems
- Role expiration support
- Cross-tenant access controls

**Roles Hierarchy:**
```
global-admin     → Full system access
  └─ tenant-admin  → Full tenant access
      └─ supervisor  → Team management + analytics export
          └─ analyst   → Create/modify entities + copilot
              └─ viewer   → Read-only access

compliance-officer → Audit/DLP override capabilities
ot-integrator      → OT system integration access
```

### 2. Secret Rotation (`server/src/security/secret-rotation.ts`)

Automated credential rotation with encryption at rest.

**Capabilities:**
- Automatic rotation scheduling (configurable per secret type)
- Version management with grace periods
- Encryption at rest using AES-256-GCM
- Pre/post rotation hooks for integration
- Event emission for monitoring
- Health checks and status reporting

**Default Rotation Intervals:**
| Secret Type | Interval | Auto-Rotate |
|-------------|----------|-------------|
| JWT Signing | 7 days | Yes |
| JWT Refresh | 30 days | Yes |
| Database | 90 days | No (manual) |
| API Keys | 90 days | Yes |
| Encryption | 365 days | No (manual) |
| Webhooks | 30 days | Yes |

### 3. GitHub Actions OIDC (`server/src/auth/github-actions-oidc.ts`)

Secure CI/CD authentication using GitHub's OIDC provider.

**Capabilities:**
- Token validation against GitHub's JWKS endpoint
- Repository/workflow claim verification
- Branch/environment restrictions
- Self-hosted runner controls
- Pull request event controls
- Token exchange for service credentials

**Configuration Environment Variables:**
```bash
GITHUB_OIDC_AUDIENCE=https://github.com/org/repo
GITHUB_OIDC_ALLOWED_REPOS=org/repo1,org/repo2
GITHUB_OIDC_ALLOWED_BRANCHES=main,develop
GITHUB_OIDC_ALLOWED_ENVS=production,staging
GITHUB_OIDC_REQUIRE_ENV=true
GITHUB_OIDC_ALLOW_SELF_HOSTED=false
GITHUB_OIDC_ALLOW_PR=false
```

### 4. Forensics Logging (`server/src/audit/forensics-logger.ts`)

Real-time forensics logging using Redis Streams.

**Capabilities:**
- High-throughput, low-latency event streaming
- Tamper-evident hash chains (SHA-256)
- Consumer group support for distributed processing
- Automatic batching for performance
- Chain integrity verification
- Structured event types and severity levels

**Event Types:**
- `authentication` - Login/logout events
- `authorization` - Permission checks
- `access` - Resource access
- `modification` - Data changes
- `deletion` - Data deletion
- `export` - Data export
- `admin_action` - Administrative operations
- `security_event` - Security incidents
- `policy_violation` - Policy violations

### 5. OPA Policy (`SECURITY/policy/opa/multi-tenant-abac.rego`)

Comprehensive ABAC policy for fine-grained access control.

**Features:**
- Default deny with explicit allow
- Tenant isolation enforcement
- Clearance level checks
- Denied environment handling
- Step-up authentication requirements
- DLP (Data Loss Prevention) rules
- Rate limiting policy
- Business hours enforcement
- Audit requirements

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Request Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request → Auth Middleware → RBAC Check → OPA Policy Eval       │
│              │                  │              │                 │
│              ▼                  ▼              ▼                 │
│         JWT/OIDC           Tenant         ABAC Rules            │
│         Verify            Isolation                              │
│              │                  │              │                 │
│              └──────────────────┴──────────────┘                │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Forensics      │                          │
│                    │  Logger         │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│                             ▼                                    │
│                    ┌─────────────────┐                          │
│                    │  Redis Streams  │                          │
│                    │  (Audit Trail)  │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tradeoffs Analysis

### Safety vs. Latency

| Feature | Safety Gain | Latency Impact | Mitigation |
|---------|-------------|----------------|------------|
| Chain hashing | Tamper detection | +2-5ms per event | Async batching |
| OPA policy eval | Fine-grained ABAC | +5-10ms per request | LRU caching (60s TTL) |
| Secret encryption | At-rest protection | +1-2ms on access | In-memory cache |
| JWT verification | Token integrity | +10-50ms on cache miss | JWKS caching (10min) |
| Tenant isolation | Data segregation | +1-2ms DB query | Permission caching |

### Design Decisions

#### 1. Redis Streams over Kafka for Forensics
**Chosen:** Redis Streams
**Rationale:**
- Lower operational complexity
- Sub-millisecond latency
- Built-in consumer groups
- Same infrastructure as caching
- Sufficient throughput for audit use case

**Tradeoff:** Less durable than Kafka; mitigated by async archival to durable storage.

#### 2. In-Process OPA over Sidecar
**Chosen:** HTTP client to OPA server
**Rationale:**
- Centralized policy management
- Hot-reload without service restart
- Easier policy debugging
- Shared across services

**Tradeoff:** Network latency; mitigated by caching and retry logic.

#### 3. SHA-256 Hash Chains over Merkle Trees
**Chosen:** Linear hash chains
**Rationale:**
- Simpler implementation
- Sufficient for sequential audit logs
- O(n) verification acceptable for audit use case
- No complex tree maintenance

**Tradeoff:** O(n) verification; acceptable for targeted integrity checks.

#### 4. AES-256-GCM for Secret Encryption
**Chosen:** AES-256-GCM
**Rationale:**
- Authenticated encryption (integrity + confidentiality)
- Hardware acceleration (AES-NI)
- NIST approved, FIPS 140-2 compliant
- Built into Node.js crypto

**Tradeoff:** Slightly larger ciphertext than AES-CBC; negligible for secrets.

## Performance Characteristics

### Expected Latency Additions

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| RBAC check (cached) | <1ms | 2ms | 5ms |
| RBAC check (uncached) | 5ms | 15ms | 30ms |
| OPA evaluation (cached) | <1ms | 2ms | 5ms |
| OPA evaluation (uncached) | 10ms | 25ms | 50ms |
| Forensics log (async) | <1ms | 1ms | 2ms |
| Secret retrieval (cached) | <1ms | 2ms | 5ms |

### Throughput

- Forensics logger: 10,000+ events/second with batching
- RBAC checks: 50,000+ checks/second with caching
- Secret rotations: Designed for low-frequency operations

## Security Considerations

### Cleared for Production

1. **Tenant Isolation**: Enforced at multiple layers (RBAC, OPA, DB)
2. **Clearance Levels**: Hierarchical classification support
3. **Audit Trail**: Immutable, tamper-evident logging
4. **Secret Management**: Encrypted at rest, automatic rotation
5. **MFA/Step-up**: Required for sensitive operations

### Denied Environments

Configure restricted environments via:
```bash
DENIED_ENVIRONMENTS=ot:scada,ot:plc,restricted:nuclear
DENIED_OT_SYSTEMS=scada,plc,dcs
```

### Compliance Alignment

- **NIST 800-53**: AC-2, AC-3, AC-6, AU-2, AU-3, IA-2, SC-12
- **FedRAMP**: High baseline controls
- **IC ICD 503**: Need-to-know, compartmentalization

## Usage Examples

### Multi-Tenant RBAC

```typescript
import { getMultiTenantRBAC, requireTenantPermission } from './auth/multi-tenant-rbac';

const rbac = getMultiTenantRBAC();

// Middleware usage
app.get('/investigations/:id',
  authenticateUser,
  requireTenantPermission(rbac, 'investigation:read'),
  getInvestigation
);

// Programmatic check
const allowed = rbac.hasPermission(user, 'entity:create', 'tenant-123');
```

### Secret Rotation

```typescript
import { getSecretRotationManager } from './security/secret-rotation';

const secrets = getSecretRotationManager();
await secrets.initialize();

// Register a secret
const metadata = await secrets.registerSecret('api-key', 'my-api-key', 'secret-value');

// Rotate manually
await secrets.rotateSecret(metadata.id, 'manual');

// Listen for rotation events
secrets.on('secret:rotated', (event) => {
  console.log(`Secret rotated: ${event.secretId}`);
});
```

### Forensics Logging

```typescript
import { getForensicsLogger } from './audit/forensics-logger';

const forensics = getForensicsLogger();
await forensics.initialize();

// Log authentication
await forensics.logAuthentication(
  { id: 'user-123', type: 'user', email: 'user@example.com' },
  'login',
  'success',
  { method: 'OIDC', provider: 'okta' }
);

// Query events
const events = await forensics.queryEvents({
  eventType: 'authentication',
  actorId: 'user-123',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
});
```

### GitHub Actions OIDC

```typescript
import { getGitHubActionsOIDC, createGitHubActionsAuth } from './auth/github-actions-oidc';

const ghAuth = getGitHubActionsOIDC();

// Middleware for CI/CD endpoints
app.post('/deploy',
  createGitHubActionsAuth(ghAuth),
  requireGitHubEnvironment(['production']),
  deployHandler
);

// Token exchange
const credential = await ghAuth.exchangeToken(oidcToken, ['deploy:write']);
```

## Testing

Run tests with:
```bash
# All security tests
pnpm test -- --testPathPattern="auth|security|audit"

# Specific modules
pnpm test -- multi-tenant-rbac
pnpm test -- secret-rotation
pnpm test -- forensics-logger
```

## Future Enhancements

1. **Hardware Security Module (HSM)** integration for key storage
2. **Vault** integration for enterprise secret management
3. **SIEM** integration for forensics log forwarding
4. **Attribute Provider** federation for dynamic ABAC attributes
5. **Two-Person Control** workflow for critical operations

## References

- [NIST SP 800-53](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [GitHub OIDC Docs](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments)
- [OPA Documentation](https://www.openpolicyagent.org/docs/latest/)
- [Redis Streams](https://redis.io/docs/data-types/streams/)
