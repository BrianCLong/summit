# Case Spaces and Audit Workflow

Backend implementation for Case Spaces with immutable audit logs and reason-for-access prompts.

## Overview

This implementation provides:

1. **Case Spaces**: CRUD operations for cases with compartmentalization and policy-based access control
2. **Immutable Audit Logging**: Append-only audit trails with reason-for-access and legal basis tracking
3. **Policy-by-Default**: All access operations require a reason and legal basis
4. **Ombudsman Queries**: API endpoints for compliance review and oversight

## Architecture

### Database Schema

#### Cases Table (`maestro.cases`)
- `id`: UUID primary key
- `tenant_id`: Tenant identifier
- `title`: Case title
- `description`: Case description
- `status`: Case status (open, active, closed, archived)
- `compartment`: Security compartment/classification level
- `policy_labels`: Array of policy labels for access control
- `metadata`: Extensible JSONB field for future requirements
- Timestamps: `created_at`, `updated_at`, `closed_at`

#### Audit Access Logs Table (`maestro.audit_access_logs`)
- `id`: UUID primary key
- `case_id`: Foreign key to cases table
- `user_id`: User who performed the action
- `action`: Action type (view, export, modify, etc.)
- `reason`: **REQUIRED** - Human-readable justification
- `legal_basis`: **REQUIRED** - Legal justification (enum)
- `warrant_id`: Optional warrant reference
- `authority_reference`: Optional legal authority reference
- `hash`: SHA-256 hash for integrity verification
- `previous_hash`: Chain to previous log entry
- **Immutability**: Triggers prevent UPDATE and DELETE operations

### Components

```
server/src/
├── cases/
│   ├── CaseService.ts           # Business logic layer
│   └── README.md                # This file
├── repos/
│   ├── CaseRepo.ts              # Case data access layer
│   └── AuditAccessLogRepo.ts    # Audit logging data access layer
├── routes/
│   ├── cases.ts                 # Case API endpoints
│   └── audit-access.ts          # Audit query endpoints
└── db/migrations/postgres/
    ├── 009_create_cases_table.sql
    └── 010_create_audit_access_logs_table.sql
```

## API Endpoints

### Case Management

#### Create Case
```http
POST /api/cases
Content-Type: application/json

{
  "title": "Fraud Investigation #12345",
  "description": "Investigating suspicious transactions",
  "compartment": "SECRET",
  "policyLabels": ["fraud", "financial"],
  "reason": "New case opened based on alert",
  "legalBasis": "investigation"
}
```

#### Get Case (Requires Reason)
```http
GET /api/cases/:id?reason=Reviewing+case+details&legalBasis=investigation
```

**Note**: Reason and legal basis are REQUIRED query parameters.

#### Update Case
```http
PUT /api/cases/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "active",
  "reason": "Updating case status based on new evidence",
  "legalBasis": "investigation"
}
```

#### List Cases
```http
GET /api/cases?status=open&compartment=SECRET
```

#### Export Case
```http
POST /api/cases/:id/export
Content-Type: application/json

{
  "reason": "Court ordered disclosure",
  "legalBasis": "court_order",
  "warrantId": "warrant-2024-001",
  "authorityReference": "District Court Order #2024-001"
}
```

#### Archive Case
```http
POST /api/cases/:id/archive
Content-Type: application/json

{
  "reason": "Case closed - investigation complete",
  "legalBasis": "investigation"
}
```

### Audit Queries (Ombudsman)

#### Get Audit Logs for a Case
```http
GET /api/audit-access/cases/:caseId
```

#### Get Audit Logs for a User
```http
GET /api/audit-access/users/:userId
```

#### Advanced Audit Query
```http
POST /api/audit-access/query
Content-Type: application/json

{
  "caseId": "case-123",
  "userId": "user-456",
  "action": "export",
  "legalBasis": "court_order",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-12-31T23:59:59Z",
  "limit": 100,
  "offset": 0
}
```

#### Verify Audit Trail Integrity
```http
POST /api/audit-access/verify-integrity
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

#### Get Audit Statistics
```http
GET /api/audit-access/stats
```

## Legal Basis Enum Values

- `investigation` - Internal investigation
- `law_enforcement` - Law enforcement request
- `regulatory_compliance` - Regulatory compliance requirement
- `court_order` - Court order or warrant
- `national_security` - National security matter
- `legitimate_interest` - Legitimate business interest
- `consent` - User consent
- `contract_performance` - Contract performance
- `vital_interests` - Vital interests
- `public_interest` - Public interest

## Usage Examples

### Example 1: Creating a Case and Viewing It

```typescript
import { CaseService } from './cases/CaseService';
import { getPostgresPool } from './db/postgres';

const pg = getPostgresPool();
const service = new CaseService(pg);

// Create a case
const newCase = await service.createCase(
  {
    tenantId: 'tenant-123',
    title: 'Fraud Investigation',
    compartment: 'SECRET',
    policyLabels: ['fraud', 'financial'],
  },
  'investigator-1',
  {
    reason: 'New fraud case based on alert #12345',
    legalBasis: 'investigation',
  }
);

// View the case (requires reason and legal basis)
const viewedCase = await service.getCase(
  newCase.id,
  'tenant-123',
  'analyst-2',
  {
    reason: 'Reviewing case for ongoing investigation',
    legalBasis: 'investigation',
  }
);
```

### Example 2: Cross-Service Audit Logging

```typescript
import { AuditAccessLogRepo } from './repos/AuditAccessLogRepo';

const auditRepo = new AuditAccessLogRepo(pg);

// Service A processes the case
await auditRepo.logAccess({
  tenantId: 'tenant-123',
  caseId: 'case-123',
  userId: 'risk-analysis-service',
  action: 'process',
  resourceType: 'case',
  resourceId: 'case-123',
  reason: 'Automated risk analysis workflow',
  legalBasis: 'investigation',
  correlationId: 'workflow-abc-123',
});

// Service B enriches the case
await auditRepo.logAccess({
  tenantId: 'tenant-123',
  caseId: 'case-123',
  userId: 'data-enrichment-service',
  action: 'enrich',
  resourceType: 'case',
  resourceId: 'case-123',
  reason: 'Data enrichment workflow',
  legalBasis: 'investigation',
  correlationId: 'workflow-abc-123',
});

// Retrieve all related logs
const correlatedLogs = await auditRepo.getLogsByCorrelationId(
  'workflow-abc-123',
  'tenant-123'
);
```

### Example 3: Policy-by-Default Enforcement

```typescript
// This will FAIL - no reason provided
try {
  await auditRepo.logAccess({
    tenantId: 'tenant-123',
    caseId: 'case-123',
    userId: 'user-123',
    action: 'view',
    reason: '', // Empty reason
    legalBasis: 'investigation',
  });
} catch (error) {
  console.error(error.message);
  // "Reason is required for audit logging. Access denied without proper justification."
}

// This will FAIL - no legal basis provided
try {
  await auditRepo.logAccess({
    tenantId: 'tenant-123',
    caseId: 'case-123',
    userId: 'user-123',
    action: 'view',
    reason: 'Valid reason',
    // legalBasis missing
  } as any);
} catch (error) {
  console.error(error.message);
  // "Legal basis is required for audit logging. Access denied without legal justification."
}
```

## Testing

### Unit Tests

- `src/tests/CaseRepo.test.ts` - Tests CRUD operations for cases
- `src/tests/AuditAccessLogRepo.test.ts` - Tests audit logging functionality

### Integration Tests

- `src/tests/caseSpacesAuditWorkflow.integration.test.ts` - End-to-end workflow testing

Run tests:
```bash
npm test -- --testPathPattern="CaseRepo|AuditAccessLog|caseSpacesAuditWorkflow"
```

## Security Features

### Immutability
- Audit logs cannot be modified or deleted
- Database triggers prevent UPDATE and DELETE operations
- Dual-control redaction process available via `audit_redaction_requests` table

### Integrity Verification
- Each log entry has a SHA-256 hash
- Logs are chained together via `previous_hash` field
- Tamper detection via `verifyIntegrity()` method

### Access Control
- All access requires reason and legal basis
- Policy labels support fine-grained access control
- Compartment field for classification levels

### Auditability
- Complete audit trail of all case access
- Correlation IDs for tracking related operations
- Warrant and authority reference tracking
- IP address, user agent, and session tracking

## Future Enhancements

The storage model supports future requirements:

1. **Warrant Binding**: `warrant_id` and `authority_reference` fields ready for integration
2. **Dual-Control Approval**: `approval_chain` JSONB field for tracking multi-party approvals
3. **Data Classification**: Case-level compartment and policy labels
4. **Redaction**: Separate `audit_redaction_requests` table for controlled redaction

## Compliance

This implementation supports:

- SOX compliance
- GDPR right to audit
- SOC2 audit requirements
- HIPAA audit trail requirements
- FedRAMP audit logging
- NIST 800-53 audit controls

## Maintenance

### Database Migrations

Apply migrations:
```bash
npm run migrate
```

Migration files:
- `009_create_cases_table.sql`
- `010_create_audit_access_logs_table.sql`

### Monitoring

Monitor audit log volume:
```sql
SELECT COUNT(*) FROM maestro.audit_access_logs WHERE created_at > NOW() - INTERVAL '24 hours';
```

Check for failed access attempts:
```sql
SELECT user_id, COUNT(*)
FROM maestro.audit_access_logs
WHERE reason LIKE '%failed%' OR reason LIKE '%denied%'
GROUP BY user_id
ORDER BY COUNT(*) DESC;
```

## Support

For issues or questions, please refer to the main server README or contact the engineering team.
