# SOC 2 Compliance Requirements for Audit System

## Overview

This document outlines how the comprehensive audit system meets SOC 2 Type I and Type II Trust Services Criteria (TSC), specifically focusing on audit logging, monitoring, and compliance controls.

## Executive Summary

The comprehensive audit system provides:

- **Immutable audit trail** with cryptographic integrity (hash chains + HMAC signatures)
- **7-year retention** for regulatory compliance
- **Multi-framework support** (SOC 2, GDPR, HIPAA, ISO 27001, SOX)
- **Real-time monitoring** with automated alerting
- **Forensic analysis** capabilities for incident investigation
- **Tamper detection** via blockchain-style hash chains
- **Compliance reporting** with automated evidence collection

## SOC 2 Trust Services Criteria Mapping

### CC6: Logical and Physical Access Controls

#### CC6.1 - The entity implements logical access security software

**Implementation:**

1. **Access Control Logging**
   ```typescript
   // All authentication events are logged
   await auditSystem.recordEvent({
     eventType: 'user_login',
     userId: user.id,
     action: 'LOGIN',
     outcome: 'success',
     complianceRelevant: true,
     complianceFrameworks: ['SOC2', 'ISO27001'],
     ipAddress: req.ip,
     userAgent: req.headers['user-agent']
   });
   ```

2. **Authorization Decision Logging**
   ```typescript
   // RBAC decisions are audited
   await auditSystem.recordEvent({
     eventType: 'policy_decision',
     userId: user.id,
     resourceType: 'investigation',
     resourceId: investigationId,
     action: 'ACCESS_CHECK',
     outcome: permitted ? 'success' : 'failure',
     details: {
       requiredPermission: 'investigation:read',
       userRole: user.role,
       decision: permitted
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

3. **Access Denied Events**
   ```typescript
   // Failed access attempts are logged for security monitoring
   await auditSystem.recordEvent({
     eventType: 'access_denied',
     level: 'warn',
     userId: user.id,
     resourceType: 'investigation',
     resourceId: investigationId,
     action: 'READ',
     outcome: 'failure',
     message: 'Insufficient permissions',
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

**Evidence for Auditors:**

```sql
-- Access control events in last 90 days
SELECT
  DATE_TRUNC('day', timestamp) as day,
  event_type,
  outcome,
  COUNT(*) as event_count
FROM audit_events
WHERE compliance_relevant = TRUE
  AND compliance_frameworks @> ARRAY['SOC2']
  AND event_type IN ('user_login', 'user_logout', 'access_denied', 'policy_decision')
  AND timestamp >= NOW() - INTERVAL '90 days'
GROUP BY day, event_type, outcome
ORDER BY day DESC;
```

#### CC6.2 - Prior to issuing system credentials, the entity registers and authorizes new users

**Implementation:**

1. **User Registration Logging**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'user_register',
     userId: newUser.id,
     action: 'USER_CREATED',
     outcome: 'success',
     details: {
       email: newUser.email,
       role: newUser.role,
       approvedBy: admin.id
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

2. **Role Assignment Logging**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'role_assigned',
     userId: user.id,
     action: 'ROLE_CHANGE',
     outcome: 'success',
     oldValues: { role: oldRole },
     newValues: { role: newRole },
     details: {
       assignedBy: admin.id,
       reason: 'Promotion to analyst'
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

**Evidence for Auditors:**

```sql
-- User lifecycle events
SELECT * FROM audit_events
WHERE event_type IN ('user_register', 'role_assigned', 'role_removed', 'user_deleted')
  AND compliance_frameworks @> ARRAY['SOC2']
ORDER BY timestamp DESC
LIMIT 100;
```

#### CC6.3 - The entity authorizes and modifies user access

**Implementation:**

1. **Permission Changes**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'permission_granted',
     userId: user.id,
     action: 'PERMISSION_CHANGE',
     outcome: 'success',
     oldValues: { permissions: oldPermissions },
     newValues: { permissions: newPermissions },
     details: {
       grantedBy: admin.id,
       addedPermissions: diff.added,
       revokedPermissions: diff.removed
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

**Evidence for Auditors:**

```sql
-- Permission changes in last 90 days
SELECT
  user_id,
  action,
  old_values->>'permissions' as old_permissions,
  new_values->>'permissions' as new_permissions,
  timestamp,
  details->>'grantedBy' as granted_by
FROM audit_events
WHERE event_type IN ('permission_granted', 'permission_revoked')
  AND timestamp >= NOW() - INTERVAL '90 days'
ORDER BY timestamp DESC;
```

### CC7: System Operations

#### CC7.1 - The entity manages system operations

**Implementation:**

1. **System Lifecycle Events**
   ```typescript
   // System startup
   await auditSystem.recordEvent({
     eventType: 'system_start',
     level: 'info',
     serviceId: 'intelgraph-api',
     serviceName: 'IntelGraph API',
     serviceVersion: packageJson.version,
     action: 'SYSTEM_START',
     outcome: 'success',
     environment: process.env.NODE_ENV,
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });

   // System shutdown
   await auditSystem.recordEvent({
     eventType: 'system_stop',
     level: 'warn',
     action: 'SYSTEM_STOP',
     outcome: 'success',
     complianceRelevant: true
   });
   ```

2. **Configuration Changes**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'config_change',
     level: 'warn',
     action: 'CONFIG_UPDATE',
     outcome: 'success',
     oldValues: { maxConnections: 20 },
     newValues: { maxConnections: 50 },
     details: {
       changedBy: admin.id,
       reason: 'Scale up for load test'
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

**Evidence for Auditors:**

```sql
-- System operations in last 30 days
SELECT * FROM audit_events
WHERE event_type IN ('system_start', 'system_stop', 'config_change')
  AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;
```

#### CC7.2 - The entity monitors system components

**Implementation:**

1. **Automated Integrity Checks**
   ```typescript
   // Daily automated integrity verification
   cron.schedule('0 2 * * *', async () => {  // 2 AM daily
     const result = await auditSystem.verifyIntegrity(
       new Date(Date.now() - 24 * 60 * 60 * 1000),  // Last 24h
       new Date()
     );

     await auditSystem.recordEvent({
       eventType: 'audit_integrity_check',
       level: result.valid ? 'info' : 'critical',
       action: 'INTEGRITY_CHECK',
       outcome: result.valid ? 'success' : 'failure',
       details: {
         totalEvents: result.totalEvents,
         validEvents: result.validEvents,
         invalidEvents: result.invalidEvents.length,
         issues: result.invalidEvents
       },
       complianceRelevant: true,
       complianceFrameworks: ['SOC2']
     });

     // Alert on integrity failures
     if (!result.valid) {
       await alertService.sendCritical({
         title: 'Audit Trail Integrity Violation Detected',
         description: `${result.invalidEvents.length} tampered events found`,
         severity: 'critical'
       });
     }
   });
   ```

2. **Anomaly Detection**
   ```typescript
   // Detect suspicious patterns
   const anomalies = await auditSystem.detectAnomalies(correlationId);

   if (anomalies.length > 0) {
     await auditSystem.recordEvent({
       eventType: 'anomaly_detected',
       level: 'warn',
       action: 'ANOMALY_DETECTION',
       outcome: 'success',
       details: {
         anomalyCount: anomalies.length,
         types: anomalies.map(a => a.type),
         maxSeverity: Math.max(...anomalies.map(a => a.severity))
       },
       complianceRelevant: true,
       complianceFrameworks: ['SOC2']
     });
   }
   ```

**Evidence for Auditors:**

```sql
-- Integrity checks in last 90 days
SELECT
  DATE_TRUNC('day', timestamp) as check_date,
  outcome,
  details->>'totalEvents' as total_events,
  details->>'invalidEvents' as invalid_events
FROM audit_events
WHERE event_type = 'audit_integrity_check'
  AND timestamp >= NOW() - INTERVAL '90 days'
ORDER BY check_date DESC;
```

### CC8: Change Management

#### CC8.1 - The entity authorizes, designs, develops, tests, approves changes

**Implementation:**

1. **Resource Mutation Tracking**
   ```typescript
   // Track before/after states for all mutations
   await auditSystem.recordEvent({
     eventType: 'investigation_update',
     userId: user.id,
     resourceType: 'investigation',
     resourceId: investigation.id,
     action: 'UPDATE',
     outcome: 'success',
     oldValues: {
       title: investigation.title,
       status: investigation.status,
       priority: investigation.priority
     },
     newValues: {
       title: updates.title,
       status: updates.status,
       priority: updates.priority
     },
     diffSummary: 'Changed title from "Old" to "New", status from ACTIVE to CLOSED',
     complianceRelevant: true,
     complianceFrameworks: ['SOC2', 'SOX']
   });
   ```

2. **Data Export Tracking**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'data_export',
     level: 'warn',
     userId: user.id,
     action: 'EXPORT',
     outcome: 'success',
     resourceType: 'investigation',
     resourceId: investigation.id,
     details: {
       format: 'PDF',
       recordCount: 1500,
       exportedFields: ['entities', 'relationships', 'notes'],
       approvedBy: manager.id
     },
     dataClassification: 'confidential',
     complianceRelevant: true,
     complianceFrameworks: ['SOC2', 'GDPR']
   });
   ```

**Evidence for Auditors:**

```sql
-- All resource modifications in last 90 days
SELECT
  resource_type,
  resource_id,
  action,
  user_id,
  timestamp,
  old_values,
  new_values,
  diff_summary
FROM audit_events
WHERE event_type LIKE '%_update'
  AND timestamp >= NOW() - INTERVAL '90 days'
  AND compliance_frameworks @> ARRAY['SOC2']
ORDER BY timestamp DESC;
```

### A1: Availability (Additional Criteria)

#### A1.2 - The entity authorizes, designs, develops, tests, approves system changes

**Implementation:**

1. **Backup Operations**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'backup_complete',
     level: 'info',
     serviceId: 'backup-service',
     action: 'BACKUP',
     outcome: 'success',
     details: {
       backupId: backup.id,
       backupType: 'full',
       databases: ['postgres', 'neo4j', 'redis'],
       sizeBytes: backup.sizeBytes,
       duration: backup.duration,
       s3Location: backup.s3Key
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

2. **Restore Operations**
   ```typescript
   await auditSystem.recordEvent({
     eventType: 'restore_complete',
     level: 'warn',
     serviceId: 'backup-service',
     action: 'RESTORE',
     outcome: 'success',
     details: {
       backupId: backup.id,
       targetTimestamp: targetTime.toISOString(),
       initiatedBy: admin.id,
       approvedBy: manager.id,
       verification: 'passed'
     },
     complianceRelevant: true,
     complianceFrameworks: ['SOC2']
   });
   ```

**Evidence for Auditors:**

```sql
-- Backup/restore events in last 90 days
SELECT
  event_type,
  outcome,
  timestamp,
  details->>'backupType' as backup_type,
  details->>'duration' as duration_ms
FROM audit_events
WHERE event_type IN ('backup_start', 'backup_complete', 'backup_fail',
                     'restore_start', 'restore_complete', 'restore_fail')
  AND timestamp >= NOW() - INTERVAL '90 days'
ORDER BY timestamp DESC;
```

## Compliance Reporting

### Automated Compliance Reports

The audit system generates automated SOC 2 compliance reports:

```typescript
// Generate monthly SOC 2 compliance report
const report = await auditSystem.generateComplianceReport(
  'SOC2',
  startOfMonth,
  endOfMonth
);

// Report includes:
// - Summary metrics (total events, violations, compliance score)
// - Control assessment (passed/failed)
// - Violation details with remediation steps
// - Recommendations for improvement
```

**Report Structure:**

```typescript
{
  framework: 'SOC2',
  period: { start: '2025-01-01', end: '2025-01-31' },
  summary: {
    totalEvents: 125000,
    criticalEvents: 12,
    violations: 3,
    complianceScore: 98.5,
    riskLevel: 'low'
  },
  violations: [
    {
      eventId: '...',
      violationType: 'unauthorized_data_export',
      severity: 'high',
      description: 'Data export without manager approval',
      remediation: 'Implement approval workflow',
      controlId: 'CC6.3',
      timestamp: '2025-01-15T14:30:00Z'
    }
  ],
  controlsAssessed: [
    {
      controlId: 'CC6.1',
      controlName: 'Logical access security',
      status: 'passed',
      evidence: ['audit_events: access control logging']
    }
  ]
}
```

### Evidence Collection

**For SOC 2 Type II (operating effectiveness over time):**

```sql
-- Evidence: Access control effectiveness over 12 months
SELECT
  DATE_TRUNC('month', timestamp) as month,
  COUNT(*) FILTER (WHERE outcome = 'success') as successful_logins,
  COUNT(*) FILTER (WHERE outcome = 'failure') as failed_logins,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE event_type = 'access_denied') as access_denials
FROM audit_events
WHERE event_type IN ('user_login', 'access_denied')
  AND timestamp >= NOW() - INTERVAL '12 months'
  AND compliance_frameworks @> ARRAY['SOC2']
GROUP BY month
ORDER BY month DESC;
```

```sql
-- Evidence: Change management over 12 months
SELECT
  DATE_TRUNC('month', timestamp) as month,
  resource_type,
  COUNT(*) as total_changes,
  COUNT(DISTINCT user_id) as unique_modifiers,
  COUNT(*) FILTER (WHERE old_values IS NOT NULL AND new_values IS NOT NULL) as tracked_changes
FROM audit_events
WHERE event_type LIKE '%_update'
  AND timestamp >= NOW() - INTERVAL '12 months'
GROUP BY month, resource_type
ORDER BY month DESC, resource_type;
```

## Retention Requirements

### SOC 2 Retention Policy

**Requirement:** Audit logs must be retained for at least **7 years** for regulatory compliance.

**Implementation:**

1. **Default Retention**: 2555 days (7 years)
   ```sql
   ALTER TABLE audit_events
   ALTER COLUMN retention_period_days SET DEFAULT 2555;
   ```

2. **Compliance-Relevant Events**: Extended retention
   ```typescript
   await auditSystem.recordEvent({
     ...eventData,
     complianceRelevant: true,
     retentionPeriodDays: 3650,  // 10 years
   });
   ```

3. **Legal Hold**: Indefinite retention
   ```typescript
   await auditSystem.recordEvent({
     ...eventData,
     legalHold: true,  // Prevents deletion
   });
   ```

4. **TimescaleDB Retention Policy**:
   ```sql
   -- Configured in migration
   SELECT add_retention_policy(
     'audit_events',
     INTERVAL '2555 days',
     if_not_exists => TRUE
   );
   ```

5. **Legal Hold Protection**:
   ```sql
   -- Events with legal_hold = TRUE are excluded from retention policy
   -- Manual review required before deletion
   ```

## Tamper Protection

### Multi-Layer Tamper Detection

1. **HMAC Signatures**: Cryptographic proof of authenticity
2. **Hash Chains**: Detect deletions and reordering
3. **Sequence Numbers**: Detect missing events
4. **Row-Level Security**: Prevent unauthorized access
5. **Immutable Policies**: Prevent updates/deletes
6. **Write-Once Files**: OS-level append-only protection

### Tamper Detection Alerts

```typescript
// Automated daily integrity check
const integrityResult = await auditSystem.verifyIntegrity(yesterday, today);

if (!integrityResult.valid) {
  // CRITICAL ALERT
  await pagerDuty.trigger({
    severity: 'critical',
    title: 'Audit Trail Tampering Detected',
    description: `${integrityResult.invalidEvents} events failed integrity check`,
    details: integrityResult.issues,
    incidentKey: `audit-tamper-${Date.now()}`
  });

  // Log the tampering detection
  await auditSystem.recordEvent({
    eventType: 'audit_tamper_detected',
    level: 'critical',
    action: 'TAMPER_DETECTION',
    outcome: 'failure',
    details: {
      timeRange: { start: yesterday, end: today },
      totalEvents: integrityResult.totalEvents,
      invalidEvents: integrityResult.invalidEvents,
      issues: integrityResult.issues
    },
    complianceRelevant: true,
    complianceFrameworks: ['SOC2']
  });
}
```

## Incident Response

### Security Incident Logging

```typescript
// Log security incidents for SOC 2 compliance
await auditSystem.recordEvent({
  eventType: 'security_alert',
  level: 'critical',
  action: 'SECURITY_INCIDENT',
  outcome: 'pending',
  details: {
    incidentType: 'brute_force_attack',
    affectedUsers: ['user1', 'user2'],
    sourceIp: '192.168.1.100',
    detectedAt: new Date(),
    detectionMethod: 'anomaly_detection',
    responseStatus: 'investigating'
  },
  complianceRelevant: true,
  complianceFrameworks: ['SOC2', 'ISO27001']
});
```

### Forensic Analysis for Incidents

```typescript
// Perform forensic analysis on security incident
const analysis = await auditSystem.performForensicAnalysis(correlationId);

// Analysis provides:
// - Timeline of events
// - Actor analysis with risk scores
// - Resource access patterns
// - Anomaly detection
// - Actionable recommendations
```

## Testing & Validation

### Compliance Testing Checklist

- [ ] **Access Control Logging**: Verify all auth events are logged
- [ ] **Change Tracking**: Verify before/after states are captured
- [ ] **Integrity Verification**: Run daily hash chain checks
- [ ] **Retention Enforcement**: Verify 7-year retention
- [ ] **Legal Hold**: Test legal hold prevents deletion
- [ ] **Tamper Detection**: Simulate tampering and verify alerts
- [ ] **Compliance Reports**: Generate monthly SOC 2 reports
- [ ] **Evidence Collection**: Export 12-month audit evidence
- [ ] **Incident Response**: Test security incident logging
- [ ] **Forensic Analysis**: Perform sample forensic investigation

### Automated Testing

```typescript
// Integration test: Verify audit event creation
describe('SOC 2 Compliance - Audit Logging', () => {
  it('should log user login events', async () => {
    await userService.login(email, password);

    const events = await auditSystem.queryEvents({
      eventTypes: ['user_login'],
      userIds: [user.id],
    });

    expect(events).toHaveLength(1);
    expect(events[0].complianceRelevant).toBe(true);
    expect(events[0].complianceFrameworks).toContain('SOC2');
  });

  it('should track resource mutations', async () => {
    const oldInvestigation = await getInvestigation(id);
    await updateInvestigation(id, { title: 'New Title' });

    const events = await auditSystem.queryEvents({
      eventTypes: ['investigation_update'],
      resourceIds: [id],
    });

    expect(events[0].oldValues).toEqual({ title: oldInvestigation.title });
    expect(events[0].newValues).toEqual({ title: 'New Title' });
  });

  it('should detect hash chain tampering', async () => {
    // Simulate tampering by modifying an event
    await db.query(
      'UPDATE audit_events SET message = $1 WHERE id = $2',
      ['Tampered message', eventId]
    );

    const result = await auditSystem.verifyIntegrity(yesterday, today);

    expect(result.valid).toBe(false);
    expect(result.invalidEvents).toContainEqual({
      eventId,
      issue: 'Hash mismatch - possible tampering'
    });
  });
});
```

## SOC 2 Audit Preparation

### Documents to Provide Auditors

1. **This Document**: SOC 2 Compliance Requirements
2. **Audit Schema Design**: `/docs/audit/audit-system-design.md`
3. **HMAC Strategy**: `/docs/audit/hmac-signature-strategy.md`
4. **Control Matrix**: `/docs/compliance/soc2_control_matrix.md`
5. **Integrity Reports**: Last 12 months from `integrity_verifications` table
6. **Compliance Reports**: Last 12 months from `compliance_reports` table
7. **Incident Logs**: Security incidents from `audit_events` (event_type = 'security_alert')

### Evidence Queries for Auditors

```sql
-- Sample 100 random audit events from last 90 days
SELECT * FROM audit_events
WHERE timestamp >= NOW() - INTERVAL '90 days'
  AND compliance_frameworks @> ARRAY['SOC2']
ORDER BY random()
LIMIT 100;

-- All integrity verification results (last 90 days)
SELECT * FROM integrity_verifications
WHERE verified_at >= NOW() - INTERVAL '90 days'
ORDER BY verified_at DESC;

-- All failed integrity checks (should be zero)
SELECT * FROM integrity_verifications
WHERE overall_valid = FALSE
ORDER BY verified_at DESC;

-- All security incidents (last 12 months)
SELECT * FROM audit_events
WHERE event_type IN ('security_alert', 'anomaly_detected', 'audit_tamper_detected')
  AND timestamp >= NOW() - INTERVAL '12 months'
ORDER BY timestamp DESC;
```

## Continuous Compliance

### Automated Monitoring

1. **Daily Integrity Checks**: Automated at 2 AM UTC
2. **Weekly Compliance Reports**: Generated every Monday
3. **Monthly Evidence Collection**: Automated on 1st of month
4. **Quarterly SOC 2 Review**: Manual review with security team
5. **Annual External Audit**: Prepare evidence package

### Metrics Dashboard

**Grafana Dashboard: "Audit System Health"**

- Total audit events (24h, 7d, 30d)
- Compliance events percentage
- Integrity check results (pass/fail)
- Hash chain verification status
- Top event types
- Top users by activity
- Failed access attempts
- Security alerts
- Anomaly detection results

### Alerting Rules

```yaml
# PagerDuty alerting rules
- name: audit_integrity_failure
  condition: integrity_check.valid == false
  severity: critical
  notify: security-team

- name: audit_tamper_detected
  condition: event_type == 'audit_tamper_detected'
  severity: critical
  notify: security-team + ciso

- name: excessive_failed_logins
  condition: failed_logins > 10 in 5 minutes
  severity: high
  notify: security-team

- name: suspicious_data_export
  condition: event_type == 'data_export' AND data_classification == 'restricted'
  severity: medium
  notify: compliance-team
```

## Summary

The comprehensive audit system meets all SOC 2 requirements through:

- **Complete audit trail** of all system access and changes
- **Cryptographic integrity** with HMAC signatures and hash chains
- **7-year retention** for regulatory compliance
- **Tamper detection** with automated daily verification
- **Compliance reporting** with automated evidence collection
- **Incident response** with forensic analysis capabilities
- **Multi-framework support** for SOC 2, GDPR, HIPAA, ISO 27001
- **Continuous monitoring** with real-time alerting

This design ensures the system is audit-ready and provides auditors with comprehensive, tamper-proof evidence of security controls.
