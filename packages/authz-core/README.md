# @intelgraph/authz-core

Comprehensive multi-tenant authorization library for IntelGraph platform with warrant tracking and license enforcement.

## Overview

This package provides a complete authorization system that enforces:

- **Multi-tenant isolation** - Strict separation between tenants
- **RBAC (Role-Based Access Control)** - Permission checks based on user roles
- **ABAC (Attribute-Based Access Control)** - Fine-grained attribute-based policies via OPA
- **Warrant enforcement** - Legal authority validation for sensitive actions
- **License compliance** - Data license restrictions and TOS acceptance
- **Comprehensive auditing** - Immutable audit trail of all authorization decisions

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Authorization Service                      │
│  (Central isAllowed() API - Side-effect free)               │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼───────┐  ┌────────▼─────────┐
│ Warrant Service│  │License Service│  │  OPA Policies    │
│  - Creation    │  │  - Registry   │  │  - warrant.rego  │
│  - Validation  │  │  - Assignment │  │  - license.rego  │
│  - Expiration  │  │  - Validation │  │  - abac.rego     │
└────────────────┘  └───────────────┘  └──────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                    ┌────────▼─────────┐
│   PostgreSQL   │                    │  Audit Streaming │
│  - Warrants    │                    │  - Event Store   │
│  - Licenses    │                    │  - Compliance    │
│  - Audit Log   │                    │  - Analytics     │
└────────────────┘                    └──────────────────┘
```

## Installation

```bash
pnpm add @intelgraph/authz-core
```

## Quick Start

### 1. Initialize Services

```typescript
import {
  AuthorizationService,
  WarrantService,
  LicenseService
} from '@intelgraph/authz-core';

// Initialize authorization service
const authz = new AuthorizationService({
  databaseUrl: process.env.DATABASE_URL,
  opaUrl: process.env.OPA_URL || 'http://localhost:8181',
  failSecure: process.env.NODE_ENV === 'production',
  requirePurpose: true,
  requireWarrantFor: ['EXPORT', 'SHARE', 'DISTRIBUTE'],
  requireLicenseFor: ['EXPORT', 'SHARE', 'DOWNLOAD'],
  auditEnabled: true,
});

// Initialize warrant service
const warrantService = new WarrantService(process.env.DATABASE_URL);

// Initialize license service
const licenseService = new LicenseService(process.env.DATABASE_URL);
```

### 2. Check Authorization

```typescript
import type { AuthorizationInput, Subject, Resource, Action } from '@intelgraph/authz-core';

// Define subject (user/service)
const subject: Subject = {
  id: 'user-123',
  type: 'user',
  tenantId: 'tenant-001',
  email: 'analyst@example.com',
  roles: ['ANALYST'],
  permissions: ['entity:read', 'entity:query'],
  clearance: 'SECRET',
  clearanceLevel: 4,
  mfaVerified: true,
};

// Define resource
const resource: Resource = {
  type: 'entity',
  id: 'entity-456',
  tenantId: 'tenant-001',
  classification: 'SECRET',
  classificationLevel: 4,
  ownerId: 'user-789',
  investigationId: 'inv-001',
};

// Define action
const action: Action = 'EXPORT';

// Check authorization
const decision = await authz.isAllowed({
  subject,
  action,
  resource,
  context: {
    requestTime: new Date(),
    environment: 'production',
    purpose: 'Export entity data for case analysis',
    ip: '192.168.1.100',
    requestId: 'req-abc123',
    warrantId: 'warrant-xyz',  // Required for exports
  },
});

if (decision.allowed) {
  console.log('✅ Access granted:', decision.reason);

  // Check for obligations
  if (decision.obligations && decision.obligations.length > 0) {
    console.log('📋 Obligations:');
    decision.obligations.forEach(obl => {
      console.log(`  - ${obl.type}: ${obl.description}`);
    });
  }

  // Proceed with operation...
} else {
  console.error('❌ Access denied:', decision.reason);

  // Show appeal information if available
  if (decision.appealable) {
    console.log('📧 Appeal process:', decision.appealProcess);
  }
}
```

### 3. Create and Bind Warrant

```typescript
import { CreateWarrantInput } from '@intelgraph/authz-core';

// Create warrant
const warrantInput: CreateWarrantInput = {
  tenantId: 'tenant-001',
  warrantNumber: 'SW-2025-12345',
  warrantType: 'WARRANT',
  issuingAuthority: 'District Court of Eastern District',
  jurisdiction: 'US-Federal',
  legalBasis: '18 U.S.C. § 2703',
  scope: {
    entities: ['entity-456', 'entity-789'],
    relationships: true,
  },
  scopeDescription: 'Search warrant for fraud investigation',
  permittedActions: ['READ', 'QUERY', 'EXPORT'],
  issuedDate: new Date('2025-01-01'),
  effectiveDate: new Date('2025-01-01'),
  expiryDate: new Date('2025-06-01'),
  caseNumber: 'CASE-2025-001',
  requiresApproval: true,
  createdBy: 'admin@example.com',
};

const warrant = await warrantService.createWarrant(warrantInput);
console.log('Warrant created:', warrant.warrantId);

// Bind warrant to resource
const bindingId = await warrantService.bindWarrant({
  warrantId: warrant.warrantId,
  tenantId: 'tenant-001',
  resourceType: 'entity',
  resourceId: 'entity-456',
  boundBy: 'admin@example.com',
});
console.log('Warrant bound to resource:', bindingId);
```

### 4. Assign License to Data

```typescript
import { CreateLicenseInput, AssignLicenseInput } from '@intelgraph/authz-core';

// Create license
const licenseInput: CreateLicenseInput = {
  tenantId: 'tenant-001',
  licenseKey: 'INTERNAL-ONLY-V1',
  licenseName: 'Internal Use Only',
  licenseType: 'INTERNAL_ONLY',
  permissions: {
    read: true,
    copy: true,
    modify: true,
    distribute: false,
    commercialUse: false,
    createDerivatives: true,
  },
  restrictions: {
    nonCommercial: true,
  },
  requiresAttribution: false,
  createdBy: 'admin@example.com',
};

const license = await licenseService.createLicense(licenseInput);
console.log('License created:', license.licenseId);

// Assign license to resource
const assignmentId = await licenseService.assignLicense({
  licenseId: license.licenseId,
  tenantId: 'tenant-001',
  resourceType: 'entity',
  resourceId: 'entity-456',
  appliesToDerivatives: true,
  assignedBy: 'admin@example.com',
  assignmentReason: 'Proprietary data from external source',
});
console.log('License assigned:', assignmentId);
```

## Authorization Decision Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Validate Input                                            │
│    ✓ Subject has tenant, ID, roles                          │
│    ✓ Resource has type, ID, tenant                          │
│    ✓ Purpose is provided (if required)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 2. Check Tenant Isolation                                    │
│    ✓ Subject.tenantId == Resource.tenantId                  │
│    ❌ DENY if mismatch                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 3. RBAC Check                                                │
│    ✓ User has required role                                 │
│    ✓ User has explicit permission                           │
│    ❌ DENY if no role/permission                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 4. ABAC Check (via OPA)                                      │
│    ✓ Clearance level sufficient                             │
│    ✓ Compartment access                                     │
│    ✓ Mission tag overlap                                    │
│    ❌ DENY if policy fails                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 5. Warrant Validation (if required)                          │
│    ✓ Warrant exists and active                              │
│    ✓ Warrant permits action                                 │
│    ✓ Warrant not expired                                    │
│    ❌ DENY if invalid                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 6. License Validation (if required)                          │
│    ✓ License exists and active                              │
│    ✓ License permits action                                 │
│    ✓ No export control violations                           │
│    ✓ TOS accepted (if required)                             │
│    ❌ DENY if restrictions violated                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 7. Step-Up Authentication (if required)                      │
│    ✓ MFA verified                                            │
│    ✓ Level of Assurance sufficient                          │
│    ⚠️  CHALLENGE if step-up needed                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 8. ALLOW with Obligations                                    │
│    ✅ Return decision + obligations + conditions             │
│    📝 Log to audit trail                                     │
│    💾 Cache decision (if enabled)                            │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Run Migrations

```bash
# Apply warrant lifecycle management migration
psql $DATABASE_URL -f server/db/migrations/postgres/2025-11-24_warrant_lifecycle_management.sql

# Apply license registry migration
psql $DATABASE_URL -f server/db/migrations/postgres/2025-11-24_license_registry.sql

# Apply authorization audit log migration
psql $DATABASE_URL -f server/db/migrations/postgres/2025-11-24_authorization_audit_log.sql
```

### Key Tables

#### Warrants
- `warrants` - Core warrant registry
- `warrant_bindings` - Resource authorizations
- `warrant_usage_log` - Immutable usage audit
- `warrant_expiration_alerts` - Expiration monitoring
- `warrant_approval_workflow` - Approval process tracking

#### Licenses
- `licenses` - License registry
- `data_license_assignments` - Resource assignments
- `license_lineage` - Inheritance tracking
- `tos_acceptances` - TOS compliance
- `license_enforcement_log` - Enforcement audit
- `license_compatibility_matrix` - Compatibility rules

#### Audit
- `authorization_audit_log` - Authorization decisions
- `mv_authz_denials_summary` - Denial analytics (materialized view)

## OPA Policy Integration

### Deploy Policies

```bash
# Bundle and deploy policies to OPA
opa build -b policies/opa/warrant_authorization.rego policies/opa/license_enforcement.rego

# Load into OPA
curl -X PUT http://localhost:8181/v1/policies/warrant \
  --data-binary @policies/opa/warrant_authorization.rego

curl -X PUT http://localhost:8181/v1/policies/license \
  --data-binary @policies/opa/license_enforcement.rego
```

### Policy Endpoints

- `POST /v1/data/intelgraph/authz/allow` - ABAC policy evaluation
- `POST /v1/data/intelgraph/warrant/allow` - Warrant validation
- `POST /v1/data/intelgraph/license/allow` - License enforcement

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/intelgraph
DB_POOL_SIZE=20

# OPA
OPA_URL=http://localhost:8181
OPA_TIMEOUT=5000
OPA_CACHE_ENABLED=true
OPA_CACHE_TTL=300000

# Behavior
NODE_ENV=production
REQUIRE_PURPOSE=true
FAIL_SECURE=true

# Audit
AUDIT_ENABLED=true
AUDIT_STREAM_URL=http://localhost:9000/audit

# Cache
CACHE_ENABLED=true
CACHE_TTL=60000

# Monitoring
METRICS_ENABLED=true
TRACING_ENABLED=true
```

### Configuration Object

```typescript
const config: AuthorizationConfig = {
  opaUrl: 'http://localhost:8181',
  opaTimeout: 5000,
  opaCacheEnabled: true,
  opaCacheTtl: 300000,
  databaseUrl: process.env.DATABASE_URL,
  databasePoolSize: 20,
  failSecure: true,                          // Deny on errors in production
  requirePurpose: true,                      // Always require purpose
  requireWarrantFor: ['EXPORT', 'SHARE'],    // Actions requiring warrant
  requireLicenseFor: ['EXPORT', 'DOWNLOAD'], // Actions requiring license check
  auditEnabled: true,
  cacheEnabled: true,
  cacheTtl: 60000,
  metricsEnabled: true,
  tracingEnabled: true,
};
```

## API Reference

### AuthorizationService

#### `isAllowed(input: AuthorizationInput): Promise<AuthorizationDecision>`

Central authorization API. Side-effect free (only reads state, logs to audit).

**Parameters:**
- `input.subject` - User/service requesting access
- `input.action` - Action being performed
- `input.resource` - Resource being accessed
- `input.context` - Request context (purpose, IP, etc.)

**Returns:**
- `decision.allowed` - Boolean authorization result
- `decision.reason` - Human-readable explanation
- `decision.obligations` - Actions that must be taken
- `decision.conditions` - Conditions that were checked
- `decision.decisionTrace` - Evaluation details
- `decision.requiresStepUp` - Whether MFA/step-up required

### WarrantService

#### `createWarrant(input: CreateWarrantInput): Promise<Warrant>`
Create a new warrant or legal authority.

#### `bindWarrant(input: BindWarrantInput): Promise<string>`
Bind warrant to a specific resource.

#### `validateWarrant(warrantId, action, resourceType): Promise<WarrantValidationResult>`
Validate warrant for specific action.

#### `approveWarrant(input: ApproveWarrantInput): Promise<void>`
Approve or reject warrant (for approval workflow).

#### `processExpirationAlerts(): Promise<number>`
Process pending expiration alerts (call from cron job).

#### `logWarrantUsage(input: WarrantUsageInput): Promise<void>`
Log warrant usage to audit trail.

### LicenseService

#### `createLicense(input: CreateLicenseInput): Promise<License>`
Create a new data license.

#### `assignLicense(input: AssignLicenseInput): Promise<string>`
Assign license to a resource.

#### `validateLicense(tenantId, resourceType, resourceId, action): Promise<LicenseValidationResult>`
Validate license for action.

#### `acceptTOS(input: AcceptTOSInput): Promise<string>`
Record TOS acceptance.

#### `hasUserAcceptedTOS(userId, tosVersion, tosType): Promise<boolean>`
Check if user has accepted TOS.

#### `recordLicenseLineage(...): Promise<string>`
Record license inheritance for derived data.

## Error Handling

All services throw typed errors:

```typescript
import { AuthorizationError, WarrantError, LicenseError } from '@intelgraph/authz-core';

try {
  const decision = await authz.isAllowed(input);
} catch (error) {
  if (error instanceof AuthorizationError) {
    console.error('Authorization failed:', error.code, error.message);
    console.error('Details:', error.details);
    // error.statusCode = 403
  }
}
```

## Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

```bash
# Start dependencies
docker-compose up -d postgres opa

# Run migrations
pnpm db:migrate

# Run integration tests
pnpm test:integration
```

### Example Tests

See `__tests__/` directory for comprehensive test suite including:
- Authorization decision tests
- Cross-tenant isolation tests
- Warrant lifecycle tests
- License enforcement tests
- OPA policy tests

## Monitoring

### Metrics

The authorization service exposes metrics for:
- Authorization requests (total, allowed, denied)
- Decision latency (p50, p95, p99)
- Cache hit rate
- OPA evaluation time
- Database query time

### Audit Queries

```sql
-- Failed authorization attempts
SELECT user_id, action, resource_type, reason, COUNT(*)
FROM authorization_audit_log
WHERE decision = 'DENY'
  AND decided_at > NOW() - INTERVAL '1 day'
GROUP BY user_id, action, resource_type, reason
ORDER BY COUNT(*) DESC;

-- Warrant usage summary
SELECT warrant_number, warrant_type, action, COUNT(*) as usage_count
FROM warrant_usage_log wul
JOIN warrants w ON wul.warrant_id = w.warrant_id
WHERE wul.accessed_at > NOW() - INTERVAL '7 days'
GROUP BY warrant_number, warrant_type, action
ORDER BY usage_count DESC;

-- License enforcement violations
SELECT license_key, action, license_decision, COUNT(*)
FROM license_enforcement_log lel
JOIN licenses l ON lel.primary_license_id = l.license_id
WHERE license_decision = 'DENY'
  AND evaluated_at > NOW() - INTERVAL '1 day'
GROUP BY license_key, action, license_decision;
```

## Best Practices

### 1. Always Provide Purpose

```typescript
// ✅ Good
const decision = await authz.isAllowed({
  subject, action, resource,
  context: {
    requestTime: new Date(),
    environment: 'production',
    purpose: 'Export entity data for fraud investigation case #12345',
  },
});

// ❌ Bad - will fail if requirePurpose = true
const decision = await authz.isAllowed({
  subject, action, resource,
  context: { requestTime: new Date(), environment: 'production' },
});
```

### 2. Handle Obligations

```typescript
const decision = await authz.isAllowed(input);

if (decision.allowed && decision.obligations) {
  for (const obligation of decision.obligations) {
    switch (obligation.type) {
      case 'ATTRIBUTION':
        // Display attribution text
        displayAttribution(obligation.requirement);
        break;
      case 'SHARE_ALIKE':
        // Enforce same license on derivatives
        enforceLicense(obligation.metadata.requiredLicense);
        break;
      case 'NOTICE':
        // Display legal notice
        displayNotice(obligation.requirement);
        break;
    }
  }
}
```

### 3. Implement Step-Up Authentication

```typescript
const decision = await authz.isAllowed(input);

if (decision.requiresStepUp) {
  // Prompt user for MFA/step-up auth
  await requestStepUpAuth(decision.minimumAcr);

  // Retry with elevated credentials
  input.context.currentAcr = 'loa2';
  input.context.mfaVerified = true;
  const newDecision = await authz.isAllowed(input);
}
```

### 4. Cache Decisions Carefully

The service includes built-in caching, but be aware:
- Cache is keyed by subject, action, resource, purpose
- Changes to warrants, licenses, or policies won't invalidate cache
- Use short TTL (60s) for production
- Disable cache for high-risk actions

### 5. Monitor Denials

Set up alerts for:
- Repeated denials from same user (potential misuse)
- Denials due to expired warrants
- License enforcement violations
- Cross-tenant access attempts

## Compliance Features

### GDPR
- Comprehensive audit trail (right to access)
- Data subject request tracking
- Retention policy enforcement
- Pseudonymization support

### HIPAA
- PHI access logging with purpose
- Minimum necessary justification
- Audit trail integrity (immutable logs)
- Access controls and encryption

### SOC 2
- Authorization audit logging
- Separation of duties (two-person rule)
- Change management (approval workflows)
- Incident detection (denial monitoring)

## Troubleshooting

### Issue: OPA evaluation failing

```
Error: OPA evaluation failed
```

**Solution:**
1. Check OPA is running: `curl http://localhost:8181/health`
2. Verify policies are loaded: `curl http://localhost:8181/v1/policies`
3. Check OPA logs: `docker logs opa`
4. Set `failSecure: false` in dev to allow RBAC fallback

### Issue: Warrant not found for resource

```
Error: Action 'EXPORT' requires a warrant
```

**Solution:**
1. Check if warrant exists: `SELECT * FROM warrants WHERE tenant_id = '...' AND status = 'ACTIVE'`
2. Check warrant binding: `SELECT * FROM warrant_bindings WHERE resource_id = '...'`
3. Verify warrant permits action: Check `permitted_actions` column
4. Provide `warrantId` in context if auto-lookup fails

### Issue: Cross-tenant access denied

```
Error: Tenant mismatch: tenant-001 != tenant-002
```

**Solution:**
This is expected behavior for security. To allow cross-tenant access:
1. Implement cross-tenant authorization workflow
2. Use shared resources with appropriate policies
3. Verify tenant IDs are correct

## License

Proprietary - IntelGraph Platform

## Support

For issues and questions:
- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Internal Slack: #authz-support
- Email: platform@intelgraph.example.com

## Contributors

Security & Authorization Team
