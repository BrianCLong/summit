# Audit Logging & Compliance System

> **Last Updated**: 2025-11-20
> **Version**: 2.0.0
> **Status**: Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [GDPR Compliance](#gdpr-compliance)
5. [HIPAA Compliance](#hipaa-compliance)
6. [Event Sourcing](#event-sourcing)
7. [Audit Search & Analytics](#audit-search--analytics)
8. [Compliance Monitoring & Alerts](#compliance-monitoring--alerts)
9. [API Reference](#api-reference)
10. [Configuration](#configuration)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Summit/IntelGraph Audit Logging & Compliance System provides comprehensive, tamper-proof audit trails and automated compliance monitoring for GDPR, HIPAA, and other regulatory frameworks.

### Key Capabilities

- **Tamper-Proof Logging**: SHA-256 hash chains prevent audit log modification
- **Event Sourcing**: Complete state reconstruction from append-only event store
- **GDPR Compliance**: Data subject rights (Articles 15-21), retention policies, right to erasure
- **HIPAA Compliance**: PHI access logging, minimum necessary rule, encryption verification
- **Real-time Alerts**: Automated compliance checks with SLA monitoring
- **Full-Text Search**: Elasticsearch integration for advanced log analytics
- **Compliance Dashboards**: Pre-built reporting for auditors and compliance officers

### Compliance Standards Supported

| Standard | Coverage | Status |
|----------|----------|--------|
| **GDPR** | Articles 5, 12-22, 30 | ✅ Production |
| **HIPAA** | 164.308, 164.312, 164.502(b) | ✅ Production |
| **SOC 2** | CC6.1, CC6.2, CC6.3 | ✅ Production |
| **SOX** | Section 802 | ✅ Production |
| **PCI-DSS** | Requirement 10 | 🚧 Partial |

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                        │
│  (Auto-capture middleware intercepts all mutations)         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│             Event Sourcing Service                          │
│  - Append-only event store                                  │
│  - Hash chain integrity                                     │
│  - Snapshot optimization                                    │
└─────────────┬──────────────────────┬────────────────────────┘
              │                      │
              ▼                      ▼
┌─────────────────────┐  ┌─────────────────────────────────┐
│   PostgreSQL        │  │   Elasticsearch                 │
│   - event_store     │  │   - Full-text search            │
│   - audit tables    │  │   - Aggregations                │
│   - compliance logs │  │   - Analytics                   │
└─────────────────────┘  └─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│         Compliance Services                                 │
│  - GDPRComplianceService                                    │
│  - HIPAAComplianceService                                   │
│  - ComplianceMonitoringService                              │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

#### Event Store

```sql
event_store
├── event_id (UUID, PK)
├── event_type (VARCHAR)
├── aggregate_type (VARCHAR)
├── aggregate_id (VARCHAR)
├── aggregate_version (INTEGER)
├── event_data (JSONB)
├── event_metadata (JSONB)
├── tenant_id (VARCHAR)
├── user_id (VARCHAR)
├── event_hash (SHA-256)
├── previous_event_hash (SHA-256)
└── event_timestamp (TIMESTAMPTZ)
```

#### Audit Access Logs

```sql
audit_access_logs (maestro schema)
├── id (UUID, PK)
├── tenant_id (VARCHAR)
├── case_id (UUID)
├── user_id (VARCHAR)
├── action (VARCHAR)
├── resource_type (VARCHAR)
├── resource_id (VARCHAR)
├── reason (TEXT) -- REQUIRED
├── legal_basis (ENUM) -- REQUIRED
├── hash (SHA-256)
└── previous_hash (SHA-256)
```

#### HIPAA PHI Access Logs

```sql
hipaa_phi_access_log
├── access_id (UUID, PK)
├── tenant_id (VARCHAR)
├── phi_type (VARCHAR)
├── phi_id (VARCHAR)
├── access_type (ENUM)
├── access_purpose (ENUM)
├── minimum_necessary_justification (TEXT) -- REQUIRED
├── data_elements_accessed (TEXT[])
├── data_encrypted_at_rest (BOOLEAN)
├── data_encrypted_in_transit (BOOLEAN)
└── security_incident_flagged (BOOLEAN)
```

---

## Features

### 1. Tamper-Proof Audit Logging

All audit logs use SHA-256 hash chains to prevent tampering:

```typescript
// Each log entry includes:
{
  id: "uuid",
  hash: "sha256(id + data + timestamp + user)",
  previous_hash: "hash of previous entry",
  // ... data
}
```

**Integrity Verification**:

```typescript
import { AuditAccessLogRepo } from './repos/AuditAccessLogRepo.js';

const repo = new AuditAccessLogRepo(pgPool);
const result = await repo.verifyIntegrity(
  'tenant-123',
  startDate,
  endDate
);

console.log(result);
// {
//   valid: true,
//   totalLogs: 1000,
//   validLogs: 1000,
//   invalidLogs: []
// }
```

### 2. Immutability Enforcement

Database triggers prevent modification or deletion:

```sql
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON audit_access_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
```

**Redaction Process** (for legitimate corrections):

```typescript
// Create redaction request (requires dual-control approval)
await auditRepo.requestRedaction({
  auditLogId: 'log-id',
  requestedBy: 'user-123',
  reason: 'Incorrect case ID recorded',
});

// Approve redaction (requires different user)
await auditRepo.approveRedaction({
  redactionId: 'redaction-id',
  approvedBy: 'supervisor-456',
});
```

---

## GDPR Compliance

### Data Subject Rights (Articles 15-21)

#### Right of Access (Article 15)

```typescript
import { GDPRComplianceService } from './services/GDPRComplianceService.js';

const gdprService = new GDPRComplianceService(pgPool);

// Create access request
const request = await gdprService.createDataSubjectRequest({
  tenantId: 'tenant-123',
  subjectId: 'user-456',
  subjectEmail: 'user@example.com',
  subjectIdentifiers: { email: 'user@example.com', userId: 'user-456' },
  requestType: 'access',
  requestReason: 'User requested copy of personal data',
  completionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});

// Export personal data
const personalData = await exportPersonalData('user-456');
```

#### Right to Erasure (Article 17)

```typescript
// Create erasure request
const erasureRequest = await gdprService.createDataSubjectRequest({
  tenantId: 'tenant-123',
  subjectId: 'user-456',
  requestType: 'erasure',
  requestReason: 'User exercised right to be forgotten',
});

// Process erasure
await gdprService.processRightToErasure(
  erasureRequest.requestId,
  'compliance-officer-789'
);

// Anonymize data
await gdprService.anonymizeData(
  'tenant-123',
  'user',
  'user-456',
  ['email', 'name', 'phone', 'address'],
  'compliance-officer-789'
);
```

#### Right to Data Portability (Article 20)

```typescript
const portabilityRequest = await gdprService.createDataSubjectRequest({
  tenantId: 'tenant-123',
  subjectId: 'user-456',
  requestType: 'portability',
  requestReason: 'User requested data export in machine-readable format',
});

// Export in JSON format
const exportData = await exportUserDataAsJSON('user-456');
```

### Data Retention Policies

```typescript
// Define retention policy
const policy = await gdprService.upsertRetentionPolicy({
  policyName: 'GDPR Personal Data',
  dataCategory: 'personal_data',
  retentionPeriodDays: 2555, // ~7 years
  retentionBasis: 'legal_requirement',
  applicableJurisdictions: ['EU', 'UK'],
  archivalAfterDays: 365,
  deletionAfterDays: 2555,
  anonymizationAfterDays: 2555,
  regulationReferences: ['GDPR Article 5(1)(e)'],
  isActive: true,
  createdBy: 'admin-123',
});

// Get active policies
const policies = await gdprService.getActiveRetentionPolicies();
```

### Automated GDPR Compliance

- **30-Day SLA Monitoring**: Automatic alerts for overdue data subject requests
- **Consent Management**: Track and validate user consents
- **Data Minimization**: Monitor data collection against necessity
- **Data Portability**: Automated export in machine-readable formats

---

## HIPAA Compliance

### PHI Access Logging (164.312(b))

Every PHI access must be logged with justification:

```typescript
import { HIPAAComplianceService } from './services/HIPAAComplianceService.js';

const hipaaService = new HIPAAComplianceService(pgPool);

// Log PHI access
await hipaaService.logPHIAccess({
  tenantId: 'tenant-123',
  phiType: 'patient_record',
  phiId: 'patient-456',
  phiClassification: 'PHI',
  accessType: 'view',
  accessPurpose: 'treatment',
  userId: 'doctor-789',
  userRole: 'physician',
  userNPI: '1234567890',
  authorizationType: 'treatment_relationship',

  // REQUIRED: Minimum Necessary Rule (164.502(b))
  minimumNecessaryJustification: 'Reviewing patient history to diagnose current symptoms',
  dataElementsAccessed: ['diagnosis', 'medications', 'lab_results'],

  // Session context
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  sessionId: 'session-123',
  workstationId: 'workstation-clinic-5',

  // Encryption verification (164.312(a)(2)(iv))
  dataEncryptedAtRest: true,
  dataEncryptedInTransit: true,
  encryptionAlgorithm: 'AES-256-GCM',
});
```

### Minimum Necessary Rule (164.502(b))

The system enforces the minimum necessary rule:

```typescript
// Invalid: Insufficient justification (< 20 characters)
await hipaaService.logPHIAccess({
  // ...
  minimumNecessaryJustification: 'Viewing record', // ❌ TOO SHORT
});
// Error: HIPAA Minimum Necessary Rule (164.502(b)) requires proper justification

// Valid: Adequate justification
await hipaaService.logPHIAccess({
  // ...
  minimumNecessaryJustification: 'Reviewing patient diagnosis and medication history to determine appropriate treatment plan for chronic condition', // ✅ ADEQUATE
});
```

### Encryption Verification (164.312(a)(2)(iv))

```typescript
// Verify encryption compliance
const audit = await hipaaService.verifyEncryptionCompliance({
  tenantId: 'tenant-123',
  resourceType: 'patient_record',
  resourceId: 'patient-456',
  encryptionAtRest: true,
  encryptionInTransit: true,
  encryptionAlgorithm: 'AES-256-GCM',
  keyManagementService: 'AWS KMS',
  auditedAt: new Date(),
  auditedBy: 'security-officer-123',
});

// If non-compliant, alert is created automatically
```

### Security Incident Management

```typescript
// Automatic incident detection
// System flags suspicious access patterns:
// - Emergency break-glass access
// - Missing encryption
// - Insufficient justification
// - Excessive data elements accessed

// Get open security incidents
const incidents = await hipaaService.getOpenSecurityIncidents('tenant-123');

// Create manual incident
await hipaaService.createSecurityIncident({
  tenantId: 'tenant-123',
  incidentType: 'unauthorized_access_attempt',
  incidentSeverity: 'high',
  incidentDescription: 'Multiple failed login attempts detected',
  affectedPHIIds: ['patient-456', 'patient-789'],
  affectedUserIds: ['user-123'],
  detectedAt: new Date(),
  detectedBy: 'security-monitoring-system',
  incidentStatus: 'open',
  breachNotificationRequired: false,
});
```

---

## Event Sourcing

### Appending Events

```typescript
import { EventSourcingService } from './services/EventSourcingService.js';

const eventService = new EventSourcingService(pgPool);

// Append a domain event
await eventService.appendEvent({
  eventType: 'CaseCreated',
  aggregateType: 'case',
  aggregateId: 'case-123',
  eventData: {
    title: 'Investigation Alpha',
    status: 'ACTIVE',
    priority: 'HIGH',
  },
  eventMetadata: {
    source: 'graphql_mutation',
  },
  tenantId: 'tenant-123',
  userId: 'user-456',
  correlationId: 'correlation-789',
  dataClassification: 'CONFIDENTIAL',
  retentionPolicy: 'INVESTIGATION_DATA',
  ipAddress: '192.168.1.100',
});
```

### State Reconstruction

```typescript
// Reconstruct aggregate state from events
interface CaseState {
  id: string;
  title: string;
  status: string;
  priority: string;
  history: any[];
}

const reducer = (state: CaseState, event: StoredEvent): CaseState => {
  switch (event.eventType) {
    case 'CaseCreated':
      return {
        ...state,
        id: event.aggregateId,
        title: event.eventData.title,
        status: event.eventData.status,
        priority: event.eventData.priority,
      };
    case 'CaseUpdated':
      return {
        ...state,
        ...event.eventData,
        history: [...state.history, event],
      };
    default:
      return state;
  }
};

const { state, version } = await eventService.reconstructAggregate(
  'case',
  'case-123',
  reducer,
  { id: '', title: '', status: '', priority: '', history: [] }
);
```

### Snapshots

```typescript
// Create snapshot for optimized reconstruction
await eventService.createSnapshot({
  aggregateType: 'case',
  aggregateId: 'case-123',
  aggregateVersion: 100,
  snapshotData: currentState,
  snapshotMetadata: {
    createdBy: 'system',
    reason: 'periodic_snapshot',
  },
});

// Retrieve latest snapshot
const snapshot = await eventService.getLatestSnapshot('case', 'case-123');
```

---

## Audit Search & Analytics

### Full-Text Search

```typescript
import { ElasticsearchAuditService } from './services/ElasticsearchAuditService.js';

const esService = new ElasticsearchAuditService(pgPool, {
  node: 'https://elasticsearch:9200',
  auth: {
    username: 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});

// Search audit logs
const results = await esService.searchAuditLogs({
  tenantId: 'tenant-123',
  query: 'case deleted',
  filters: {
    eventType: ['CaseDeleted', 'CaseArchived'],
    userId: ['user-456'],
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    dataClassification: ['CONFIDENTIAL', 'INTERNAL'],
  },
  sort: {
    field: 'event_timestamp',
    order: 'desc',
  },
  from: 0,
  size: 100,
});

console.log(`Found ${results.total} matching events`);
results.hits.forEach(hit => {
  console.log(hit.source);
});
```

### Aggregations & Analytics

```typescript
// Aggregate by event type
const aggregation = await esService.aggregateAuditData({
  tenantId: 'tenant-123',
  aggregation: {
    type: 'terms',
    field: 'event_type',
    size: 20,
  },
});

// Time-series aggregation
const timeSeries = await esService.aggregateAuditData({
  tenantId: 'tenant-123',
  aggregation: {
    type: 'date_histogram',
    field: 'event_timestamp',
    interval: 'day',
  },
});

// Cardinality (unique users)
const uniqueUsers = await esService.aggregateAuditData({
  tenantId: 'tenant-123',
  aggregation: {
    type: 'cardinality',
    field: 'user_id',
  },
});
```

### Bulk Sync to Elasticsearch

```typescript
// Sync historical audit logs to Elasticsearch
await esService.bulkSyncAuditLogs('tenant-123', 1000);
```

---

## Compliance Monitoring & Alerts

### Automated Compliance Checks

```typescript
import { ComplianceMonitoringService } from './services/ComplianceMonitoringService.js';

const complianceService = new ComplianceMonitoringService(pgPool);

// Run all compliance checks
const results = await complianceService.runComplianceChecks('tenant-123');

results.forEach(result => {
  if (!result.passed) {
    console.error(`❌ ${result.checkName}: ${result.message}`);
  } else {
    console.log(`✅ ${result.checkName}: ${result.message}`);
  }
});
```

### Available Checks

| Check | Regulation | Severity |
|-------|-----------|----------|
| `gdpr_dsr_sla` | GDPR Article 12 | Critical |
| `gdpr_data_retention` | GDPR Article 5(1)(e) | Warning |
| `gdpr_consent_validity` | GDPR Article 7 | Warning |
| `hipaa_encryption` | HIPAA 164.312(a)(2)(iv) | Critical |
| `hipaa_access_logging` | HIPAA 164.312(b) | Warning |
| `hipaa_minimum_necessary` | HIPAA 164.502(b) | Warning |
| `audit_coverage` | SOC 2 / SOX | Warning |
| `audit_integrity` | SOC 2 / SOX | Critical |
| `retention_compliance` | General | Warning |

### Alert Management

```typescript
// Get active alerts
const alerts = await complianceService.getActiveAlerts('tenant-123');

// Acknowledge alert
await complianceService.updateAlert('alert-123', {
  alertStatus: 'acknowledged',
  acknowledgedBy: 'compliance-officer-456',
});

// Resolve alert
await complianceService.updateAlert('alert-123', {
  alertStatus: 'resolved',
  resolvedBy: 'compliance-officer-456',
  resolutionNotes: 'Encryption re-enabled on all PHI records',
});

// Get SLA-breached alerts
const breachedAlerts = await complianceService.getSLABreachedAlerts('tenant-123');
```

### Compliance Metrics

```typescript
// Record custom metric
await complianceService.recordMetric({
  tenantId: 'tenant-123',
  metricType: 'audit_coverage',
  metricName: 'events_per_day',
  metricValue: 1500,
  metricUnit: 'count',
  targetValue: 1000,
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-01-02'),
});

// Get metrics
const metrics = await complianceService.getMetrics(
  'tenant-123',
  'audit_coverage',
  new Date('2025-01-01'),
  new Date('2025-12-31')
);
```

---

## API Reference

### GraphQL Mutations (Auto-Captured)

All GraphQL mutations are automatically captured to the event store via the `AuditEventCaptureMiddleware`.

**No additional code required** - just use GraphQL mutations normally:

```graphql
mutation CreateCase {
  createCase(input: {
    title: "Investigation Alpha"
    status: ACTIVE
    priority: HIGH
  }) {
    id
    title
  }
}
```

This automatically creates an event:

```json
{
  "eventType": "CaseCreated",
  "aggregateType": "case",
  "aggregateId": "case-123",
  "eventData": {
    "mutationName": "createCase",
    "args": { "input": { ... } },
    "result": { "id": "case-123", ... }
  }
}
```

### REST API Endpoints

#### Audit Access Logs

```
GET    /api/audit/access?tenantId=...&caseId=...
POST   /api/audit/access
GET    /api/audit/access/:id
GET    /api/audit/access/verify?tenantId=...
GET    /api/audit/access/stats?tenantId=...
```

#### GDPR Data Subject Requests

```
POST   /api/gdpr/dsr
GET    /api/gdpr/dsr?tenantId=...&status=...
GET    /api/gdpr/dsr/:requestId
PUT    /api/gdpr/dsr/:requestId
GET    /api/gdpr/dsr/overdue?tenantId=...
```

#### HIPAA PHI Access

```
POST   /api/hipaa/phi/access
GET    /api/hipaa/phi/access?tenantId=...
GET    /api/hipaa/phi/access/summary?tenantId=...&startDate=...&endDate=...
GET    /api/hipaa/incidents?tenantId=...
```

#### Compliance Alerts

```
GET    /api/compliance/alerts?tenantId=...
GET    /api/compliance/alerts/:alertId
PUT    /api/compliance/alerts/:alertId
GET    /api/compliance/alerts/sla-breached?tenantId=...
POST   /api/compliance/checks/run?tenantId=...
```

---

## Configuration

### Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/summit

# Elasticsearch (optional, for enhanced search)
ELASTICSEARCH_NODE=https://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED=false

# Compliance Settings
GDPR_DSR_SLA_DAYS=30
HIPAA_ENCRYPTION_REQUIRED=true
AUDIT_RETENTION_DAYS=2555  # ~7 years
```

### Apollo Server Integration

```typescript
import { createAuditEventCaptureMiddleware } from './middleware/audit-event-capture-middleware.js';

const auditMiddleware = createAuditEventCaptureMiddleware(pgPool);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    auditMiddleware.createApolloPlugin(),
  ],
});
```

### Express Integration

```typescript
app.use(auditMiddleware.createExpressMiddleware());
```

---

## Best Practices

### 1. Always Provide Reason and Legal Basis

```typescript
// ❌ BAD: Missing required fields
await auditRepo.logAccess({
  tenantId: 'tenant-123',
  caseId: 'case-456',
  userId: 'user-789',
  action: 'view',
});
// Error: Reason and legal basis are required

// ✅ GOOD: Complete audit entry
await auditRepo.logAccess({
  tenantId: 'tenant-123',
  caseId: 'case-456',
  userId: 'user-789',
  action: 'view',
  reason: 'Investigating fraud case as assigned analyst',
  legalBasis: 'investigation',
  correlationId: 'correlation-123',
});
```

### 2. Use Correlation IDs for Related Operations

```typescript
const correlationId = randomUUID();

await eventService.appendEvent({
  correlationId,
  eventType: 'CaseCreated',
  // ...
});

await eventService.appendEvent({
  correlationId,
  eventType: 'EntityCreated',
  // ...
});

// Later, query all related events
const relatedEvents = await eventService.queryEvents({
  tenantId: 'tenant-123',
  correlationId,
});
```

### 3. Implement Proper Data Classification

```typescript
// Classify data appropriately
await eventService.appendEvent({
  // ...
  dataClassification: 'CONFIDENTIAL', // or 'PII', 'PHI', 'INTERNAL'
  retentionPolicy: 'INVESTIGATION_DATA',
});
```

### 4. Regular Integrity Checks

```bash
# Run integrity verification weekly
node scripts/verify-audit-integrity.js --tenant tenant-123 --days 7
```

### 5. Monitor Compliance Alerts

```typescript
// Set up daily alert monitoring
setInterval(async () => {
  const alerts = await complianceService.getActiveAlerts('tenant-123');
  if (alerts.length > 0) {
    notifyComplianceTeam(alerts);
  }
}, 24 * 60 * 60 * 1000);
```

---

## Troubleshooting

### Issue: Elasticsearch not indexing

**Symptom**: Audit logs not appearing in Elasticsearch searches

**Solution**:
1. Check Elasticsearch connection:
```bash
curl -u elastic:password https://localhost:9200/_cluster/health
```

2. Verify index templates:
```bash
curl -u elastic:password https://localhost:9200/_index_template/audit-events
```

3. Run bulk sync:
```typescript
await esService.bulkSyncAuditLogs('tenant-123');
```

### Issue: GDPR DSR SLA alerts firing

**Symptom**: Alerts for overdue data subject requests

**Solution**:
1. List overdue requests:
```typescript
const overdue = await gdprService.getOverdueRequests('tenant-123');
```

2. Process or extend deadline:
```typescript
await gdprService.updateDataSubjectRequest(requestId, {
  requestStatus: 'in_progress',
  assignedTo: 'compliance-officer-123',
});
```

### Issue: High volume of false-positive HIPAA incidents

**Symptom**: Too many security incidents being flagged

**Solution**:
Adjust detection thresholds in `HIPAAComplianceService.ts`:

```typescript
// Increase minimum justification length threshold
if (access.minimumNecessaryJustification.length < 30) { // Changed from 20
  return true;
}
```

---

## Support & Resources

- **Documentation**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security Policies**: [SECURITY/](../SECURITY/)
- **API Reference**: [docs/API.md](./API.md)
- **Runbooks**: [RUNBOOKS/compliance-monitoring.md](../RUNBOOKS/compliance-monitoring.md)

---

**Version History**

- **2.0.0** (2025-11-20): Complete audit & compliance system with GDPR/HIPAA support
- **1.0.0** (2025-08-19): Initial audit logging implementation

**Maintained by**: Engineering & Compliance Teams
