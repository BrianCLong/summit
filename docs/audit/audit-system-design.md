# Comprehensive Audit System Design

## Document Information

- **Task**: Task 7.1 - Design audit event schema
- **Sprint**: Week 7 (Jan 1-7, 2025)
- **Priority**: P1-HIGH
- **Estimated Time**: 4 hours
- **Assignee**: Tech Lead
- **Status**: Design Complete
- **Version**: 1.0.0
- **Last Updated**: 2025-01-15

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [Architecture](#architecture)
4. [Schema Design](#schema-design)
5. [HMAC Signature Strategy](#hmac-signature-strategy)
6. [SOC 2 Compliance](#soc-2-compliance)
7. [Implementation Plan](#implementation-plan)
8. [Testing Strategy](#testing-strategy)
9. [References](#references)

## Overview

The comprehensive audit system provides **immutable, tamper-proof logging** of all system operations for security monitoring, compliance, and forensic analysis. It extends the existing `AdvancedAuditSystem` with enhanced features for production deployment.

### Key Features

- **Immutable Audit Trail**: Cryptographically secured event log
- **Hash Chain Integrity**: Blockchain-style linking of events
- **HMAC Signatures**: Tamper detection via HMAC-SHA256
- **Before/After Tracking**: Complete mutation history
- **Multi-Tenant Isolation**: Row-level security (RLS)
- **Compliance Support**: SOC 2, GDPR, HIPAA, ISO 27001, SOX
- **7-Year Retention**: Regulatory compliance
- **TimescaleDB Partitioning**: Efficient time-series queries
- **Write-Once Files**: OS-level tamper protection
- **Real-Time Alerting**: Immediate notification of critical events
- **Forensic Analysis**: Automated incident investigation

## Design Goals

### 1. Security

- **Tamper Detection**: Any modification of audit events must be detectable
- **Non-Repudiation**: Users cannot deny actions they performed
- **Access Control**: Only authorized services can write audit events
- **Encryption**: Sensitive data encrypted at rest and in transit

### 2. Compliance

- **SOC 2 Type II**: Operating effectiveness over time
- **GDPR Article 30**: Records of processing activities
- **HIPAA § 164.308**: Audit controls
- **SOX Section 404**: Internal controls
- **ISO 27001**: Information security management

### 3. Performance

- **High Throughput**: 10,000+ events/sec sustained
- **Low Latency**: < 5ms p99 for event recording
- **Efficient Queries**: Sub-second forensic queries
- **Compression**: Automatic compression of old data

### 4. Reliability

- **Durability**: No data loss (WAL + replication)
- **High Availability**: 99.9% uptime SLA
- **Disaster Recovery**: Point-in-time recovery
- **Graceful Degradation**: Continue logging during outages

### 5. Usability

- **Rich Querying**: Filter by user, resource, time, compliance
- **Forensic Tools**: Automated analysis and reporting
- **Compliance Reports**: Automated evidence collection
- **Alerting**: Real-time notifications

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│  (GraphQL API, REST API, Background Jobs, Admin Tools)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AuditService                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ recordEvent()│  │  queryEvents │  │ verifyIntegrity│       │
│  │              │  │              │  │              │         │
│  │ - Validate   │  │ - Filter     │  │ - Hash chain │         │
│  │ - Hash       │  │ - Paginate   │  │ - Signatures │         │
│  │ - Sign       │  │ - Aggregate  │  │ - Detect gaps│         │
│  │ - Buffer     │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │generateReport│  │forensicAnalys│  │detectAnomalies│        │
│  │              │  │              │  │              │         │
│  │ - SOC2       │  │ - Timeline   │  │ - Burst      │         │
│  │ - GDPR       │  │ - Actors     │  │ - Failures   │         │
│  │ - HIPAA      │  │ - Resources  │  │ - After-hours│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Layer                               │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  TimescaleDB     │  │  Write-Once      │  │    Redis     │ │
│  │  (PostgreSQL)    │  │  Audit Files     │  │  (Pub/Sub)   │ │
│  │                  │  │                  │  │              │ │
│  │ - audit_events   │  │ - Append-only    │  │ - Real-time  │ │
│  │ - compliance_    │  │ - Immutable flag │  │   alerts     │ │
│  │   reports        │  │ - Daily rotation │  │ - Event bus  │ │
│  │ - forensic_      │  │ - S3 archival    │  │              │ │
│  │   analyses       │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Application Event
      │
      ▼
2. AuditService.recordEvent()
      │
      ├─> Validate event (Zod schema)
      │
      ├─> Calculate SHA-256 hash
      │
      ├─> Link to previous event (hash chain)
      │
      ├─> Generate HMAC-SHA256 signature
      │
      ├─> Add to event buffer (batching)
      │
      ├─> If critical → immediate flush
      │
      └─> If compliance → tag frameworks
      │
      ▼
3. Event Buffer (100 events or 5 sec)
      │
      ▼
4. Flush to Storage
      │
      ├─> TimescaleDB (INSERT batch)
      │
      ├─> Write-Once File (append)
      │
      └─> Redis (publish for real-time)
      │
      ▼
5. Post-Processing
      │
      ├─> Real-time alerting
      │
      ├─> Anomaly detection
      │
      └─> Compliance tagging
```

### Event Lifecycle

```
Created → Validated → Hashed → Signed → Buffered → Persisted → Archived
   │          │          │        │         │          │           │
   │          │          │        │         │          │           └─> S3 (7 years)
   │          │          │        │         │          └─> TimescaleDB
   │          │          │        │         └─> In-memory buffer
   │          │          │        └─> HMAC-SHA256
   │          │          └─> SHA-256 hash
   │          └─> Zod validation
   └─> UUID, timestamp
```

## Schema Design

### Primary Table: `audit_events`

**TimescaleDB Hypertable** partitioned by `timestamp` (1-day chunks).

```sql
CREATE TABLE audit_events (
    -- Identity
    id UUID PRIMARY KEY,
    sequence_number BIGSERIAL,
    version TEXT DEFAULT '1.0.0',

    -- Classification
    event_type TEXT NOT NULL,
    level TEXT NOT NULL,  -- debug, info, warn, error, critical
    timestamp TIMESTAMPTZ NOT NULL,

    -- Context
    correlation_id UUID NOT NULL,
    session_id UUID,
    request_id UUID,
    parent_event_id UUID,
    trace_id TEXT,
    span_id TEXT,

    -- Actors (WHO)
    user_id TEXT,
    tenant_id TEXT NOT NULL,
    service_id TEXT NOT NULL,

    -- Resources (WHAT)
    resource_type TEXT,
    resource_id TEXT,
    resource_path TEXT,

    -- Action (HOW)
    action TEXT NOT NULL,
    outcome TEXT NOT NULL,  -- success, failure, partial, pending
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',

    -- Mutation Tracking
    old_values JSONB,
    new_values JSONB,
    diff_summary TEXT,

    -- Security (WHERE/FROM)
    ip_address INET,
    user_agent TEXT,
    geolocation JSONB,

    -- Compliance
    compliance_relevant BOOLEAN DEFAULT FALSE,
    compliance_frameworks TEXT[],
    data_classification TEXT,
    retention_period_days INTEGER DEFAULT 2555,
    legal_hold BOOLEAN DEFAULT FALSE,

    -- Integrity
    hash TEXT,
    signature TEXT NOT NULL,
    previous_event_hash TEXT,

    -- Performance
    duration_ms BIGINT,
    error_code TEXT,

    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}'
);

-- Convert to hypertable
SELECT create_hypertable('audit_events', 'timestamp', chunk_time_interval => INTERVAL '1 day');
```

**Key Indexes:**

- `(timestamp DESC, tenant_id)` - Time-range queries
- `(tenant_id, timestamp DESC)` - Tenant isolation
- `(user_id, timestamp DESC)` - User activity
- `(correlation_id, timestamp)` - Event correlation
- `(event_type, timestamp DESC)` - Event type filtering
- `(compliance_relevant, timestamp DESC)` - Compliance queries
- GIN index on `compliance_frameworks` - Array containment
- GIN index on `details` - JSONB queries
- GIN index on `tags` - Tag searches
- Full-text index on `message` - Text search

**Row-Level Security:**

```sql
-- Enable RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their tenant's events
CREATE POLICY tenant_isolation ON audit_events
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- Only service accounts can insert
CREATE POLICY service_insert ON audit_events
    FOR INSERT
    WITH CHECK (current_setting('app.service_account', TRUE)::BOOLEAN = TRUE);

-- Prevent updates/deletes (immutability)
CREATE POLICY no_updates ON audit_events FOR UPDATE USING (FALSE);
CREATE POLICY no_deletes ON audit_events FOR DELETE USING (FALSE);
```

### Supporting Tables

#### `compliance_reports`

Stores generated compliance reports (SOC 2, GDPR, etc.).

```sql
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY,
    framework TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    generated_by TEXT NOT NULL,

    -- Metrics
    total_events BIGINT,
    critical_events BIGINT,
    violation_count BIGINT,
    compliance_score NUMERIC(5,2),
    risk_level TEXT,

    -- Full report
    report_data JSONB NOT NULL
);

SELECT create_hypertable('compliance_reports', 'period_start', chunk_time_interval => INTERVAL '1 month');
```

#### `forensic_analyses`

Stores forensic investigation results.

```sql
CREATE TABLE forensic_analyses (
    id UUID PRIMARY KEY,
    correlation_id UUID NOT NULL,
    investigator_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,

    -- Metrics
    event_count BIGINT,
    unique_actors INTEGER,
    unique_resources INTEGER,
    anomaly_count INTEGER,
    overall_risk_score NUMERIC(5,2),

    -- Full analysis
    analysis_data JSONB NOT NULL,
    findings TEXT,
    recommendations TEXT[]
);
```

#### `integrity_verifications`

Stores hash chain verification results.

```sql
CREATE TABLE integrity_verifications (
    id UUID PRIMARY KEY,
    verified_at TIMESTAMPTZ NOT NULL,
    verified_by TEXT,

    time_range_start TIMESTAMPTZ NOT NULL,
    time_range_end TIMESTAMPTZ NOT NULL,

    -- Results
    total_events BIGINT NOT NULL,
    valid_events BIGINT NOT NULL,
    invalid_events BIGINT NOT NULL,
    hash_chain_valid BOOLEAN NOT NULL,
    overall_valid BOOLEAN NOT NULL,

    -- Issues
    issue_count INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,

    -- Full verification
    verification_data JSONB NOT NULL
);
```

### Materialized Views

#### `audit_daily_summary`

Daily aggregated metrics for dashboards.

```sql
CREATE MATERIALIZED VIEW audit_daily_summary AS
SELECT
    DATE_TRUNC('day', timestamp) as day,
    tenant_id,
    event_type,
    level,
    outcome,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE compliance_relevant = TRUE) as compliance_events,
    AVG(duration_ms) as avg_duration_ms
FROM audit_events
GROUP BY day, tenant_id, event_type, level, outcome;
```

Refreshed hourly via cron job.

## HMAC Signature Strategy

### Overview

Events are protected by **two-layer integrity**:

1. **Event Hash**: SHA-256 hash of event content
2. **HMAC Signature**: HMAC-SHA256 signature with secret key

Additionally, events are linked via **hash chains** to detect deletions.

### Hash Calculation

```typescript
function calculateEventHash(event: AuditEvent): string {
  const hashableData = {
    id: event.id,
    eventType: event.eventType,
    timestamp: event.timestamp.toISOString(),
    correlationId: event.correlationId,
    tenantId: event.tenantId,
    serviceId: event.serviceId,
    userId: event.userId,
    action: event.action,
    outcome: event.outcome,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    message: event.message,
    details: event.details,
    oldValues: event.oldValues,
    newValues: event.newValues,
  };

  // Canonical JSON (sorted keys)
  const canonical = JSON.stringify(
    hashableData,
    Object.keys(hashableData).sort()
  );

  return createHash('sha256')
    .update(canonical)
    .digest('hex');
}
```

### HMAC Signature

```typescript
function signEvent(event: AuditEvent, signingKey: string): string {
  const payload = {
    id: event.id,
    hash: event.hash,
    timestamp: event.timestamp.toISOString(),
    tenantId: event.tenantId,
    previousEventHash: event.previousEventHash || '',
  };

  const canonical = JSON.stringify(
    payload,
    Object.keys(payload).sort()
  );

  return createHmac('sha256', signingKey)
    .update(canonical)
    .digest('hex');
}
```

### Signature Verification

```typescript
function verifyEventSignature(event: AuditEvent, signingKey: string): boolean {
  const expectedSignature = signEvent(event, signingKey);

  const eventSigBuffer = Buffer.from(event.signature || '', 'hex');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');

  if (eventSigBuffer.length !== expectedSigBuffer.length) {
    return false;
  }

  // Timing-safe comparison
  return timingSafeEqual(eventSigBuffer, expectedSigBuffer);
}
```

### Hash Chain

```typescript
let lastEventHash = '';

async function recordEvent(eventData: Partial<AuditEvent>) {
  // 1. Build complete event
  const event = buildEvent(eventData);

  // 2. Calculate hash
  event.hash = calculateEventHash(event);

  // 3. Link to previous event
  event.previousEventHash = lastEventHash;
  lastEventHash = event.hash;

  // 4. Sign event
  event.signature = signEvent(event, signingKey);

  // 5. Persist
  await storeEvent(event);
}
```

### Integrity Verification

```typescript
async function verifyIntegrity(
  startTime: Date,
  endTime: Date
): Promise<IntegrityVerification> {
  const events = await queryEvents({ startTime, endTime });

  let expectedPreviousHash = '';
  const issues: Array<any> = [];

  for (const event of events) {
    // 1. Verify hash
    const calculatedHash = calculateEventHash(event);
    if (event.hash !== calculatedHash) {
      issues.push({
        eventId: event.id,
        issueType: 'hash_mismatch',
        description: 'Event content was modified',
        severity: 'critical',
      });
      continue;
    }

    // 2. Verify signature
    if (!verifyEventSignature(event, signingKey)) {
      issues.push({
        eventId: event.id,
        issueType: 'signature_invalid',
        description: 'HMAC signature verification failed',
        severity: 'critical',
      });
      continue;
    }

    // 3. Verify chain
    if (expectedPreviousHash && event.previousEventHash !== expectedPreviousHash) {
      issues.push({
        eventId: event.id,
        issueType: 'chain_broken',
        description: 'Hash chain link broken',
        severity: 'critical',
      });
    }

    expectedPreviousHash = event.hash!;
  }

  return {
    verifiedAt: new Date(),
    timeRange: { start: startTime, end: endTime },
    summary: {
      totalEvents: events.length,
      validEvents: events.length - issues.length,
      invalidEvents: issues.length,
      hashChainValid: issues.length === 0,
      overallValid: issues.length === 0,
    },
    issues,
    chainVerification: {
      startHash: events[0]?.hash || '',
      endHash: events[events.length - 1]?.hash || '',
      chainIntact: issues.filter(i => i.issueType === 'chain_broken').length === 0,
      brokenLinks: issues.filter(i => i.issueType === 'chain_broken'),
    },
  };
}
```

**See**: `/docs/audit/hmac-signature-strategy.md` for full details.

## SOC 2 Compliance

The audit system meets SOC 2 Trust Services Criteria:

- **CC6**: Logical and Physical Access Controls
  - CC6.1: Logical access security (access control logging)
  - CC6.2: User registration and authorization (lifecycle logging)
  - CC6.3: User access modifications (permission change tracking)

- **CC7**: System Operations
  - CC7.1: System operations management (system lifecycle logging)
  - CC7.2: System monitoring (integrity checks, anomaly detection)

- **CC8**: Change Management
  - CC8.1: Change authorization and tracking (mutation logging with before/after)

- **A1**: Availability
  - A1.2: Backup and recovery operations (backup/restore logging)

**See**: `/docs/audit/soc2-compliance-requirements.md` for full mapping.

### Compliance Features

1. **7-Year Retention**: Default 2555 days (configurable per event)
2. **Legal Hold**: Events can be marked for indefinite retention
3. **Before/After States**: Full change history for all mutations
4. **Automated Reports**: Monthly SOC 2 compliance reports
5. **Tamper Detection**: Daily automated integrity verification
6. **Evidence Collection**: Query-based evidence export for auditors

### Evidence for Auditors

```sql
-- Sample audit events
SELECT * FROM audit_events
WHERE compliance_frameworks @> ARRAY['SOC2']
  AND timestamp >= NOW() - INTERVAL '90 days'
ORDER BY random()
LIMIT 100;

-- Integrity verification results
SELECT * FROM integrity_verifications
WHERE verified_at >= NOW() - INTERVAL '90 days'
ORDER BY verified_at DESC;

-- All failed integrity checks (should be empty)
SELECT * FROM integrity_verifications
WHERE overall_valid = FALSE;
```

## Implementation Plan

### Phase 1: Schema & Infrastructure (Week 7)

**Tasks 7.1-7.3** (16 hours total)

- [x] **Task 7.1**: Design audit event schema (4h) - **THIS DOCUMENT**
  - [x] Define `AuditEvent` TypeScript interface
  - [x] Design TimescaleDB schema
  - [x] Design HMAC signature strategy
  - [x] Document SOC 2 requirements

- [ ] **Task 7.2**: Create `AuditService` class (8h)
  - [ ] Implement `recordEvent()` method
  - [ ] Implement event validation (Zod)
  - [ ] Implement hash calculation (SHA-256)
  - [ ] Implement HMAC signature generation
  - [ ] Implement hash chain linking
  - [ ] Implement event buffering (100 events / 5 sec)
  - [ ] Implement batch persistence
  - [ ] Implement write-once file appending
  - [ ] Add error handling and logging

- [ ] **Task 7.3**: Implement tamper detection (4h)
  - [ ] Implement `verifyEvent()` method
  - [ ] Implement `verifyIntegrity()` method
  - [ ] Implement timing-safe comparison
  - [ ] Implement automated daily checks
  - [ ] Implement PagerDuty alerting
  - [ ] Add verification logging

### Phase 2: Integration (Week 7)

**Tasks 7.4-7.6** (16 hours total)

- [ ] **Task 7.4**: Create audit middleware (4h)
  - [ ] Create Express middleware
  - [ ] Capture all HTTP requests
  - [ ] Log mutations only (POST, PUT, PATCH, DELETE)
  - [ ] Extract IP, user agent, user context
  - [ ] Integrate with GraphQL context

- [ ] **Task 7.5**: Add audit logging to all mutations (8h)
  - [ ] Wire into GraphQL resolvers
  - [ ] Add to REST endpoints
  - [ ] Add to WebSocket operations
  - [ ] Add before/after state capture
  - [ ] Test comprehensive coverage

- [ ] **Task 7.6**: Implement audit query API (4h)
  - [ ] Create `queryEvents()` method
  - [ ] Add filtering (user, action, resource, time)
  - [ ] Add date range queries
  - [ ] Add pagination
  - [ ] Add sorting
  - [ ] Optimize with indexes

### Phase 3: Compliance & Reporting (Week 7)

**Tasks 7.7-7.9** (22 hours total)

- [ ] **Task 7.7**: Build compliance reporting (6h)
  - [ ] Create `generateComplianceReport()` method
  - [ ] Implement SOC 2 report generation
  - [ ] Implement GDPR report generation
  - [ ] Aggregate by action/resource
  - [ ] Calculate unique users
  - [ ] Export to PDF (or JSON)

- [ ] **Task 7.8**: Implement anomaly detection (6h)
  - [ ] Create `detectAnomalies()` method
  - [ ] Implement burst detection (z-score)
  - [ ] Implement failure rate analysis
  - [ ] Implement after-hours detection
  - [ ] Alert on suspicious patterns
  - [ ] Test with synthetic data

- [ ] **Task 7.9**: Create audit dashboard UI (10h)
  - [ ] Build audit log viewer (React)
  - [ ] Add filtering controls
  - [ ] Show compliance metrics
  - [ ] Add export functionality (CSV, JSON)
  - [ ] Integrate with Grafana

## Testing Strategy

### Unit Tests

```typescript
describe('AuditService', () => {
  describe('recordEvent', () => {
    it('should calculate SHA-256 hash correctly');
    it('should generate HMAC signature correctly');
    it('should link to previous event hash');
    it('should validate event with Zod schema');
    it('should reject invalid events');
    it('should buffer events for batch processing');
    it('should flush on critical events');
  });

  describe('verifyIntegrity', () => {
    it('should detect hash tampering');
    it('should detect signature tampering');
    it('should detect chain breaks');
    it('should detect missing events');
    it('should pass for valid chains');
  });

  describe('queryEvents', () => {
    it('should filter by time range');
    it('should filter by user');
    it('should filter by event type');
    it('should filter by compliance framework');
    it('should paginate correctly');
  });
});
```

### Integration Tests

```typescript
describe('Audit System Integration', () => {
  it('should log user login events');
  it('should log mutation events with before/after');
  it('should log access denied events');
  it('should verify hash chain integrity');
  it('should detect tampered events');
  it('should generate compliance reports');
  it('should perform forensic analysis');
});
```

### Performance Tests

```typescript
describe('Audit System Performance', () => {
  it('should handle 10,000 events/sec sustained', async () => {
    const events = generateTestEvents(10000);
    const start = Date.now();

    await Promise.all(events.map(e => auditService.recordEvent(e)));

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // < 1 second
  });

  it('should query 1M events in < 1 second', async () => {
    const start = Date.now();

    const results = await auditService.queryEvents({
      startTime: yesterday,
      endTime: today,
      limit: 100,
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

### Security Tests

```typescript
describe('Audit System Security', () => {
  it('should prevent event modification via UPDATE', async () => {
    await expect(
      db.query('UPDATE audit_events SET message = $1 WHERE id = $2', ['Tampered', eventId])
    ).rejects.toThrow();  // RLS policy violation
  });

  it('should prevent event deletion via DELETE', async () => {
    await expect(
      db.query('DELETE FROM audit_events WHERE id = $1', [eventId])
    ).rejects.toThrow();  // RLS policy violation
  });

  it('should use timing-safe comparison', async () => {
    // Timing attack test
    const validSig = event.signature;
    const invalidSig = 'a'.repeat(64);  // Same length

    const times = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      verifyEventSignature({ ...event, signature: invalidSig }, signingKey);
      times.push(performance.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const variance = calculateVariance(times);

    // Variance should be very low (constant time)
    expect(variance).toBeLessThan(0.001);
  });
});
```

## Operational Considerations

### Monitoring

**Grafana Dashboard: "Audit System Health"**

- Total events (24h, 7d, 30d)
- Events by type (bar chart)
- Events by level (pie chart)
- Compliance events percentage
- Integrity check results (pass/fail timeline)
- Top users by activity
- Failed access attempts (timeline)
- Anomaly detections (timeline)

**Prometheus Metrics:**

```
# Events
audit_events_total{type, level, outcome}
audit_events_rate{type}
audit_events_duration_seconds{type}

# Integrity
audit_integrity_checks_total{result}
audit_tamper_detections_total

# Performance
audit_batch_size
audit_flush_duration_seconds
audit_query_duration_seconds{query_type}
```

### Alerting

**PagerDuty Rules:**

- Integrity check failed (critical)
- Tamper detected (critical)
- Excessive failed logins (high)
- Anomaly detected (medium)
- Write-once file write failed (high)

### Backup & Recovery

- **Database Backups**: Via automated backup system (Task 8)
- **Write-Once Files**: Daily archival to S3
- **Point-in-Time Recovery**: PostgreSQL WAL logs
- **Disaster Recovery**: Multi-region S3 replication

### Capacity Planning

**Storage Estimates:**

- Avg event size: 2 KB
- 10,000 events/sec = 20 MB/sec = 1.7 TB/day
- With compression (5:1): 340 GB/day
- 7 years: ~870 TB (with compression)

**Compute Requirements:**

- Hash calculation: ~1ms per event
- Signature generation: ~0.5ms per event
- Total overhead: ~1.5ms per event
- 10,000 events/sec = 15 CPU cores

### Cost Optimization

1. **TimescaleDB Compression**: Compress chunks > 7 days old (5:1 ratio)
2. **S3 Lifecycle**: Move to Glacier after 1 year
3. **Materialized Views**: Reduce query load on raw events
4. **Retention Policy**: Auto-delete events > 7 years (except legal hold)

## References

### Related Documents

- **HMAC Strategy**: `/docs/audit/hmac-signature-strategy.md`
- **SOC 2 Compliance**: `/docs/audit/soc2-compliance-requirements.md`
- **Type Definitions**: `/server/src/audit/audit-types.ts`
- **Database Schema**: `/server/db/migrations/timescale/003_comprehensive_audit_system.sql`

### External References

- [SOC 2 Trust Services Criteria](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [GDPR Article 30: Records of Processing Activities](https://gdpr-info.eu/art-30-gdpr/)
- [HIPAA § 164.308: Administrative Safeguards](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [RFC 2104: HMAC](https://tools.ietf.org/html/rfc2104)
- [FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/publications/detail/fips/180/4/final)
- [TimescaleDB Documentation](https://docs.timescale.com/)

## Appendix

### Event Type Reference

See `/server/src/audit/audit-types.ts` for complete list of 60+ event types.

**Categories:**

- System lifecycle (start, stop, config)
- Authentication (login, logout, MFA, password)
- Authorization (permission, role, access)
- Resource operations (CRUD)
- Investigation operations
- Entity operations
- Relationship operations
- Graph operations
- AI/ML operations
- Data operations (export, import, deletion)
- Compliance & policy
- Security events
- Backup & recovery
- Audit integrity

### Compliance Framework Reference

| Framework | Description | Retention | Key Controls |
|-----------|-------------|-----------|--------------|
| **SOC 2** | Service Organization Controls | 7 years | CC6, CC7, CC8, A1 |
| **GDPR** | General Data Protection Regulation | 3 years | Article 30, 32, 33 |
| **HIPAA** | Health Insurance Portability | 6 years | § 164.308, 164.312 |
| **SOX** | Sarbanes-Oxley Act | 7 years | Section 404, 802 |
| **ISO 27001** | Information Security Management | 3 years | A.12.4, A.16.1 |
| **PCI DSS** | Payment Card Industry | 1 year | 10.1-10.7 |

### Migration Guide

**Migrating from existing `AdvancedAuditSystem`:**

1. Run TimescaleDB migration: `003_comprehensive_audit_system.sql`
2. Update environment variables: Add `LEDGER_SIGNING_KEY`
3. Deploy new `AuditService` code
4. Enable write-once file support
5. Configure daily integrity checks
6. Set up PagerDuty alerting
7. Create Grafana dashboard
8. Train ops team on new features

**Backwards Compatibility:**

The new schema is backwards compatible with the existing `AdvancedAuditSystem`. Existing events can be migrated:

```sql
INSERT INTO audit_events (SELECT * FROM old_audit_events_table);
```

---

**End of Design Document**

**Status**: ✅ Design Complete
**Next Steps**: Proceed to Task 7.2 - Implement AuditService class
