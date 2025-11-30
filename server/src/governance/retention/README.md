# Data Retention & RTBF Engine

A comprehensive, legally-defensible retention and Right-To-Be-Forgotten (RTBF) subsystem for the IntelGraph platform.

## Overview

The Retention & RTBF Engine provides:

- **Retention Policies**: Automated data lifecycle management based on classification, jurisdiction, and compliance requirements
- **Redaction Policies**: Field-level redaction, anonymization, and pseudonymization
- **RTBF Workflows**: Multi-step Right-To-Be-Forgotten request processing with approval workflows
- **Provenance Tracking**: Cryptographic tombstones and hash stubs for audit compliance
- **Legal Hold Support**: Prevents deletion of data under litigation hold
- **Dry-Run Mode**: Preview impact before executing destructive operations

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        RTBF Orchestrator                         │
│  - Request submission & validation                               │
│  - Approval workflow management                                  │
│  - Job creation & execution                                      │
│  - Audit trail maintenance                                       │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ├───────────> PolicyEvaluator
                │             - Evaluate effective policies
                │             - Combine retention + redaction rules
                │             - Check legal holds
                │
                ├───────────> RedactionEngine
                │             - Field-level redaction
                │             - Anonymization/pseudonymization
                │             - Hash stub creation
                │
                ├───────────> ProvenanceIntegration
                │             - Cryptographic tombstones
                │             - Hash stubs
                │             - Provenance chains
                │
                └───────────> DataRetentionRepository
                              - Policy storage
                              - Legal hold tracking
                              - Schedule management
```

### Data Flow

```
User/System Request
        │
        ▼
   Submission ────────┐
        │             │
        ▼             ▼
   Validation    Dry-Run Preview
        │             │
        ▼             │
 Legal Hold Check     │
        │             │
        ▼             │
  Impact Assessment◄──┘
        │
        ▼
 Pending Approval
        │
        ├──> Approved ──> Job Creation ──> Execution ──> Tombstones
        │                                                      │
        └──> Rejected                                         ▼
                                                         Audit Trail
```

## Installation

### 1. Database Setup

Run the schema migration:

```bash
psql -U your_user -d your_database -f server/src/db/retention/rtbf_schema.sql
```

### 2. Environment Configuration

Add to your `.env`:

```bash
# Retention configuration
TOMBSTONE_SIGNING_KEY=your-secure-signing-key-here

# Optional: Default retention days
DEFAULT_RETENTION_DAYS=365
COMPLIANCE_RETENTION_DAYS=2555  # 7 years
```

### 3. Service Initialization

```typescript
import { Pool } from 'pg';
import {
  DataRetentionEngine,
  RTBFOrchestrator,
  PolicyEvaluator,
  RedactionEngine,
  ProvenanceIntegration,
} from './governance/retention';

const pool = new Pool({
  /* your pg config */
});

// Initialize components
const retentionEngine = new DataRetentionEngine({ pool });
const policyEvaluator = new PolicyEvaluator({ pool });
const redactionEngine = new RedactionEngine({ pool });
const provenanceIntegration = new ProvenanceIntegration({ pool });
const rtbfOrchestrator = new RTBFOrchestrator({
  pool,
  policyEvaluator,
  redactionEngine,
});

// Load existing policies
await policyEvaluator.loadRedactionPolicies();
```

## Usage

### 1. Register a Dataset for Retention Management

```typescript
import { DatasetMetadata } from './types';

const metadata: DatasetMetadata = {
  datasetId: 'user-analytics-2024',
  name: 'User Analytics Data',
  dataType: 'analytics',
  containsPersonalData: true,
  containsFinancialData: false,
  jurisdictions: ['EU', 'US'],
  tags: ['pii', 'analytics', 'postgres:table:user_events'],
  storageSystems: ['postgres'],
  owner: 'analytics-team',
  createdAt: new Date(),
  recordCount: 1000000,
};

// Auto-classify and apply retention policy
const record = await retentionEngine.registerDataset(metadata, 'system');

console.log(`Applied template: ${record.policy.templateId}`);
console.log(`Retention days: ${record.policy.retentionDays}`);
```

### 2. Create a Redaction Policy

```typescript
import { RedactionPolicy } from './types';

const gdprEmailRedaction: RedactionPolicy = {
  id: 'gdpr-email-redaction',
  name: 'GDPR Email Redaction',
  description: 'Hash email addresses for EU data',
  enabled: true,
  triggers: {
    jurisdictions: ['EU'],
    dataClassification: ['restricted', 'confidential'],
  },
  rules: [
    {
      id: 'email-hash-rule',
      fieldPattern: '*email*',
      operation: 'hash',
      storageTargets: ['postgres', 'neo4j'],
      parameters: {
        hashAlgorithm: 'sha256',
      },
      keepHashStub: true,
    },
    {
      id: 'ssn-mask-rule',
      fieldPattern: 'ssn',
      operation: 'mask',
      storageTargets: ['postgres'],
      parameters: {
        maskChar: 'X',
        preserveFormat: true,
      },
    },
  ],
  priority: 100,
  createdAt: new Date(),
  createdBy: 'admin',
};

await policyEvaluator.registerRedactionPolicy(gdprEmailRedaction);
```

### 3. Get Effective Policy for a Resource

```typescript
import { ResourceReference, PolicyEvaluationContext } from './types';

const resource: ResourceReference = {
  resourceType: 'dataset',
  resourceId: 'user-analytics-2024',
  storageSystems: ['postgres'],
};

const context: PolicyEvaluationContext = {
  dataClassification: 'restricted',
  jurisdictions: ['EU'],
  complianceFrameworks: ['GDPR'],
};

const effectivePolicy = await policyEvaluator.getEffectivePolicy(
  resource,
  context,
);

console.log('Retention:', effectivePolicy.retention);
console.log('Redaction policies:', effectivePolicy.redaction?.policies.length);
console.log('Legal hold active:', effectivePolicy.legalHold?.active);
console.log('Warnings:', effectivePolicy.warnings);
```

### 4. Submit an RTBF Request

```typescript
import { RTBFRequest } from './types';

const rtbfRequest = await rtbfOrchestrator.submitRTBFRequest({
  scope: 'user_data',
  requester: {
    userId: 'user-12345',
    email: 'user@example.com',
    type: 'user',
  },
  target: {
    userId: 'user-12345',
  },
  justification: {
    legalBasis: 'GDPR Article 17',
    jurisdiction: 'EU',
    reason: 'User requested data deletion',
  },
  deletionType: 'hard',
  useRedaction: false,
  dryRun: true, // Preview first
});

console.log(`Request ID: ${rtbfRequest.id}`);
console.log(`State: ${rtbfRequest.state}`);
console.log(`Impact: ${rtbfRequest.impact?.estimatedRecordCount} records`);
```

### 5. Dry-Run Preview

```typescript
// Request was created with dryRun: true
if (rtbfRequest.dryRunResults) {
  console.log('Dry-Run Results:');
  rtbfRequest.dryRunResults.affectedRecords.forEach((ar) => {
    console.log(`  ${ar.storageSystem}: ${ar.recordCount} records`);
    if (ar.tables) {
      console.log(`    Tables: ${ar.tables.join(', ')}`);
    }
    if (ar.labels) {
      console.log(`    Labels: ${ar.labels.join(', ')}`);
    }
  });
  console.log(`Estimated duration: ${rtbfRequest.dryRunResults.estimatedDuration}ms`);
  console.log(`Warnings: ${rtbfRequest.dryRunResults.warnings.join(', ')}`);
}
```

### 6. Approve and Execute RTBF Request

```typescript
// Approve the request
await rtbfOrchestrator.approveRequest(
  rtbfRequest.id,
  'admin-user-id',
  'Approved per GDPR compliance requirements',
);

// If not in dry-run mode, this will auto-execute
// Otherwise, need to resubmit without dry-run flag
```

### 7. Track Request Status

```typescript
const status = rtbfOrchestrator.getRequestStatus(rtbfRequest.id);

console.log(`Request state: ${status.request?.state}`);
console.log(`Jobs: ${status.progress.totalJobs}`);
console.log(`Completed: ${status.progress.completedJobs}`);
console.log(`Failed: ${status.progress.failedJobs}`);
console.log(`Progress: ${status.progress.percentComplete}%`);

// View audit trail
status.request?.auditEvents.forEach((event) => {
  console.log(`[${event.timestamp}] ${event.eventType} by ${event.actor}`);
});
```

### 8. Apply Legal Hold

```typescript
import { LegalHold } from './types';

const legalHold: LegalHold = {
  datasetId: 'sensitive-dataset',
  reason: 'Active litigation - Smith v. Company',
  requestedBy: 'legal-team@company.com',
  createdAt: new Date(),
  expiresAt: new Date('2025-12-31'), // Optional expiration
  scope: 'full',
};

await retentionEngine.applyLegalHold('sensitive-dataset', legalHold);

// RTBF requests for this dataset will now be blocked
```

### 9. Manual Redaction

```typescript
const record = {
  id: 'user-12345',
  email: 'john.doe@example.com',
  phone: '555-123-4567',
  ssn: '123-45-6789',
  address: '123 Main St, City, State 12345',
};

const rules = [
  {
    id: 'email-rule',
    fieldPattern: 'email',
    operation: 'hash' as const,
    storageTargets: ['postgres' as const],
  },
  {
    id: 'phone-rule',
    fieldPattern: 'phone',
    operation: 'pseudonymize' as const,
    storageTargets: ['postgres' as const],
  },
  {
    id: 'ssn-rule',
    fieldPattern: 'ssn',
    operation: 'mask' as const,
    storageTargets: ['postgres' as const],
    parameters: {
      preserveFormat: true,
    },
  },
];

const redactionResult = await redactionEngine.redactRecord(record, rules, {
  recordId: 'user-12345',
  storageSystem: 'postgres',
  preserveProvenance: true,
});

console.log('Redacted fields:', redactionResult.fields);
console.log('Hash stubs created:', redactionResult.hashStubs.size);
console.log('Updated record:', record);
```

### 10. Query Tombstones

```typescript
const tombstones = await provenanceIntegration.queryTombstones({
  resourceId: 'user-12345',
  storageSystem: 'postgres',
  startDate: new Date('2024-01-01'),
});

tombstones.forEach((tombstone) => {
  console.log(`Tombstone ID: ${tombstone.id}`);
  console.log(`Resource: ${tombstone.resourceType}/${tombstone.resourceId}`);
  console.log(`Operation: ${tombstone.operation.type}`);
  console.log(`Legal basis: ${tombstone.justification.legalBasis}`);
  console.log(`Content hash: ${tombstone.proof.contentHash}`);
  console.log(`Signature: ${tombstone.proof.signature}`);
});
```

## Redaction Operations

The engine supports multiple redaction operations:

| Operation       | Description                             | Example                               |
| --------------- | --------------------------------------- | ------------------------------------- |
| `mask`          | Replace with asterisks or custom char   | `john@example.com` → `****************` |
| `hash`          | One-way cryptographic hash              | `john@example.com` → `a3f8d...`       |
| `delete`        | Remove field entirely                   | `{ email: "..." }` → `{ email: null }` |
| `anonymize`     | Replace with random anonymous value     | `john@example.com` → `anon-x7@example.com` |
| `pseudonymize`  | Replace with consistent pseudonym       | `john@example.com` → `user-a3f8d@example.com` |
| `truncate`      | Shorten to safe length                  | `Long description...` → `Long descri...` |
| `generalize`    | Replace with broader category           | `age: 35` → `30-49`                   |

## Legal Hold Behavior

When a legal hold is active:

- ✅ **Blocks**: RTBF requests are automatically rejected
- ✅ **Blocks**: Scheduled purges are skipped
- ✅ **Blocks**: Manual deletions via retention engine
- ⚠️ **Audit**: All attempted operations are logged
- 🔒 **Override**: Legal holds can only be released by authorized users

## Compliance Features

### GDPR Article 17 Compliance

- ✅ Right to erasure support
- ✅ Exceptions for legal obligations (legal holds)
- ✅ Reasonable timeframes (configurable grace periods)
- ✅ Complete audit trail
- ✅ Cryptographic proof of deletion

### SOC 2 Compliance

- ✅ Immutable audit logs
- ✅ Cryptographic tombstones
- ✅ Multi-step approval workflows
- ✅ Provenance tracking

### HIPAA Compliance

- ✅ Field-level redaction for PHI
- ✅ Audit trail with actor tracking
- ✅ Legal hold support
- ✅ Secure deletion with verification

## API Reference

### RTBFOrchestrator

- `submitRTBFRequest(request)`: Submit new RTBF request
- `approveRequest(requestId, approvedBy, notes?)`: Approve request
- `rejectRequest(requestId, rejectedBy, reason)`: Reject request
- `executeRequest(requestId, executedBy)`: Execute approved request
- `getRequest(requestId)`: Get request details
- `getRequestStatus(requestId)`: Get request status with progress

### PolicyEvaluator

- `getEffectivePolicy(resource, context)`: Get effective policy for resource
- `registerRedactionPolicy(policy)`: Register new redaction policy
- `updateRedactionPolicy(policyId, updates)`: Update existing policy
- `deleteRedactionPolicy(policyId)`: Delete policy
- `listRedactionPolicies()`: List all policies
- `loadRedactionPolicies()`: Load policies from database

### RedactionEngine

- `redactRecord(record, rules, options)`: Redact a single record
- `redactPostgresRecords(table, recordIds, rules, options)`: Bulk redact in Postgres
- `redactNeo4jNodes(label, nodeIds, rules, options)`: Bulk redact in Neo4j

### ProvenanceIntegration

- `createTombstone(options)`: Create deletion tombstone
- `createHashStub(options)`: Create field hash stub
- `createRTBFProvenanceChain(options)`: Create provenance chain
- `verifyTombstone(tombstone)`: Verify tombstone integrity
- `queryTombstones(filters)`: Query tombstones

## Testing

Run the test suite:

```bash
# Unit tests
pnpm test server/src/governance/retention/__tests__

# Specific test files
pnpm test policyEvaluator.test.ts
pnpm test redactionEngine.test.ts
pnpm test rtbfOrchestrator.test.ts
```

## Security Considerations

1. **Signing Keys**: Use strong, unique signing keys for tombstone signatures
2. **Access Control**: Implement proper RBAC for RTBF approval workflows
3. **Audit Logs**: Never delete audit logs - they're exempt from RTBF
4. **Hash Algorithms**: Use SHA-256 or stronger for cryptographic hashes
5. **Legal Holds**: Only authorized personnel should create/release legal holds
6. **Dry-Run**: Always use dry-run mode for large-scale deletions

## Monitoring & Alerts

### Key Metrics

- RTBF request volume and state distribution
- Legal hold count and duration
- Tombstone creation rate
- Redaction operation performance
- Failed execution job count

### Recommended Alerts

- RTBF request in `failed` state
- Legal hold active for > 90 days
- RTBF request approval pending for > 48 hours
- Tombstone signature verification failures

## Troubleshooting

### Request Stuck in `validating` State

Check logs for validation errors. Common causes:
- Database connection issues
- Missing dataset records
- Malformed request data

### Legal Hold Not Blocking Deletions

Verify:
- Legal hold `expiresAt` is in the future or `null`
- Dataset ID matches exactly
- Legal hold was persisted to database

### Redaction Not Applied

Check:
- Redaction policy is `enabled: true`
- Policy triggers match resource context
- Rule `storageTargets` include the resource's storage system
- Field patterns match field names

### Tombstone Verification Failing

Ensure:
- `TOMBSTONE_SIGNING_KEY` environment variable is set correctly
- Key hasn't changed since tombstone creation
- Tombstone data hasn't been modified

## Migration Guide

### From Legacy Retention System

1. **Export existing policies**: Extract current retention rules
2. **Create retention records**: Use `registerDataset()` for each dataset
3. **Map redaction rules**: Convert to new `RedactionPolicy` format
4. **Test thoroughly**: Use dry-run mode extensively
5. **Gradual rollout**: Start with non-critical datasets

## Roadmap

- [ ] S3/Object storage integration
- [ ] Elasticsearch redaction support
- [ ] Automated compliance reporting
- [ ] Machine learning-based classification
- [ ] Multi-tenant isolation
- [ ] GraphQL API endpoints
- [ ] Admin dashboard UI
- [ ] Scheduled retention sweeps
- [ ] Encrypted tombstones for extra security

## Contributing

See `CLAUDE.md` for development guidelines and project conventions.

## License

Proprietary - IntelGraph Platform
