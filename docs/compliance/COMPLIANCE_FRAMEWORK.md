# Enterprise Compliance and Governance Framework

## Overview

This comprehensive compliance framework provides government and enterprise-grade compliance capabilities for the IntelGraph platform. It implements controls and processes required for FedRAMP, NIST 800-53, ISO 27001, SOC 2, GDPR, and CCPA compliance.

## Table of Contents

1. [Supported Frameworks](#supported-frameworks)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Implementation Guide](#implementation-guide)
5. [Compliance Controls](#compliance-controls)
6. [Audit Logging](#audit-logging)
7. [Data Classification](#data-classification)
8. [Privacy Controls](#privacy-controls)
9. [Reporting](#reporting)
10. [Certification Path](#certification-path)

## Supported Frameworks

### FedRAMP (Federal Risk and Authorization Management Program)

The framework supports all three FedRAMP impact levels:

- **FedRAMP Low**: 125 controls for low-impact SaaS
- **FedRAMP Moderate**: 325 controls for moderate-impact SaaS
- **FedRAMP High**: 421 controls for high-impact systems

**Authorization Package Documents**:
- System Security Plan (SSP)
- Security Assessment Plan (SAP)
- Security Assessment Report (SAR)
- Plan of Action and Milestones (POA&M)
- Incident Response Plan
- Continuous Monitoring Plan
- And 10+ additional required documents

### NIST 800-53 Rev 5

Implements all 20 control families:
- Access Control (AC)
- Audit and Accountability (AU)
- Security Assessment and Authorization (CA)
- Configuration Management (CM)
- Contingency Planning (CP)
- Identification and Authentication (IA)
- Incident Response (IR)
- Maintenance (MA)
- Media Protection (MP)
- Physical and Environmental Protection (PE)
- Planning (PL)
- Personnel Security (PS)
- Risk Assessment (RA)
- System and Services Acquisition (SA)
- System and Communications Protection (SC)
- System and Information Integrity (SI)
- Program Management (PM)
- Privacy (PT)

### ISO 27001:2022

Supports all 93 controls across 4 categories:
- Organizational Controls (37 controls)
- People Controls (8 controls)
- Physical Controls (14 controls)
- Technological Controls (34 controls)

### SOC 2 Type II

Implements Trust Services Criteria for:
- **Security (CC)**: Common criteria for all SOC 2 reports
- **Availability (A)**: System availability commitments
- **Processing Integrity (PI)**: Complete, accurate, timely processing
- **Confidentiality (C)**: Confidential information protection
- **Privacy (P)**: Personal information handling

### GDPR & CCPA

Full support for data privacy regulations:
- **GDPR**: EU General Data Protection Regulation
  - Right to access (Article 15)
  - Right to rectification (Article 16)
  - Right to erasure / Right to be forgotten (Article 17)
  - Right to data portability (Article 20)
  - Consent management (Article 7)

- **CCPA**: California Consumer Privacy Act
  - Right to know
  - Right to delete
  - Right to opt-out
  - Right to non-discrimination

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Compliance Framework                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   FedRAMP    │  │  ISO 27001   │  │    SOC 2     │         │
│  │  Controls    │  │   Controls   │  │   Controls   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│         ┌──────────────────┴──────────────────┐                 │
│         │                                     │                 │
│  ┌──────▼───────┐                    ┌───────▼──────┐          │
│  │    Audit     │                    │   Data       │          │
│  │   Logging    │                    │ Classification│          │
│  │ (Immutable)  │                    │   & CBAC     │          │
│  └──────────────┘                    └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Privacy    │  │   Policy     │  │  Reporting   │         │
│  │   Controls   │  │   Engine     │  │  & Metrics   │         │
│  │ (GDPR/CCPA)  │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Chain of    │  │ Segregation  │                            │
│  │   Custody    │  │  of Duties   │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Compliance Package (`@intelgraph/compliance`)

Central framework for compliance management:

```typescript
import { ComplianceManager, ComplianceFramework } from '@intelgraph/compliance';
import { Pool } from 'pg';

const pool = new Pool({ /* config */ });
const manager = new ComplianceManager(pool);

// Initialize tables
await manager.initialize();

// Get framework status
const status = await manager.getFrameworkStatus(ComplianceFramework.FEDRAMP_MODERATE);

// Generate compliance report
const report = await manager.generateReport(
  ComplianceFramework.NIST_800_53_REV5,
  'gap_analysis',
  'auditor@company.com',
  startDate,
  endDate
);
```

### 2. Audit Logging (`@intelgraph/audit-logging`)

Immutable, tamper-proof audit trails:

```typescript
import { AuditLogger, AuditActions } from '@intelgraph/audit-logging';

const logger = new AuditLogger(pool);
await logger.initialize();

// Log an event
await logger.log({
  userId: 'user-123',
  userName: 'john.doe@company.com',
  action: AuditActions.DATA_ACCESS,
  resource: 'investigation',
  resourceId: 'inv-456',
  outcome: 'success',
  ipAddress: '192.168.1.100',
  classification: DataClassification.SECRET,
  details: { reason: 'Active investigation' }
});

// Verify integrity
const integrity = await logger.verifyIntegrity();
console.log(`Audit log valid: ${integrity.valid}`);
```

**Features**:
- Blockchain-like chaining with merkle trees
- Tamper-proof storage (write-once)
- Cryptographic verification
- Automatic blocking and finalization
- Retention policy enforcement

### 3. Data Classification (`@intelgraph/data-classification`)

Automated classification with TLP support:

```typescript
import { DataClassificationManager } from '@intelgraph/data-classification';

const classificationMgr = new DataClassificationManager(pool, auditLogger);
await classificationMgr.initialize();

// Suggest classification
const suggestion = await classificationMgr.suggestClassification(content);
console.log(`Suggested: ${suggestion.suggestedClassification} (${suggestion.confidence})`);

// Classify data
await classificationMgr.classifyData(
  'investigation',
  'inv-123',
  DataClassification.TLP_AMBER,
  'analyst@company.com',
  { justification: 'Contains operational intelligence' }
);

// Check access
const access = await classificationMgr.checkAccess(
  DataClassification.SECRET,
  'ANALYST',
  'read'
);

if (!access.allowed) {
  console.log(`Access denied: ${access.reason}`);
}
```

**Supported Classifications**:
- Government: UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP SECRET
- Business: PUBLIC, INTERNAL, RESTRICTED, HIGHLY RESTRICTED
- TLP: CLEAR, GREEN, AMBER, AMBER+STRICT, RED

### 4. Privacy Controls (`@intelgraph/privacy-controls`)

GDPR/CCPA compliance:

```typescript
import { PrivacyControlsManager } from '@intelgraph/privacy-controls';

const privacyMgr = new PrivacyControlsManager(pool, auditLogger);
await privacyMgr.initialize();

// Detect PII
const detection = privacyMgr.detectPII(text);
console.log(`PII detected: ${detection.hasPII}`);
console.log(`Categories: ${detection.categories.join(', ')}`);
console.log(`Redacted: ${detection.redactedText}`);

// Handle GDPR erasure request (Right to be Forgotten)
const request = await privacyMgr.handleDataSubjectRequest(
  'erasure',
  'user-123',
  'user@example.com',
  'email_verification'
);

// Process erasure
const result = await privacyMgr.processErasureRequest(
  request.id,
  'dpo@company.com'
);

// Export user data (Data Portability)
const exportData = await privacyMgr.exportUserData('user-123');

// Manage consent
await privacyMgr.recordConsent(
  'user-123',
  'marketing_emails',
  true,
  'explicit',
  'v1.0',
  '192.168.1.1',
  'Mozilla/5.0...'
);
```

### 5. Chain of Custody

Evidence handling with digital signatures:

```typescript
import { ChainOfCustodyManager } from '@intelgraph/privacy-controls';

const custodyMgr = new ChainOfCustodyManager(pool, auditLogger);
await custodyMgr.initialize();

// Record evidence transfer
await custodyMgr.recordTransfer(
  'evidence-123',
  'Malware Sample',
  'transferred',
  'analyst-1',
  'forensics-team',
  'Forensics Lab A',
  'Analysis required',
  evidenceBuffer,
  digitalSignature,
  witnessSignature
);

// Verify chain integrity
const verification = await custodyMgr.verifyChain('evidence-123');
if (!verification.valid) {
  console.error('Chain of custody compromised:', verification.breaks);
}
```

### 6. Segregation of Duties

Prevent conflicts of interest:

```typescript
import { SegregationOfDutiesManager } from '@intelgraph/privacy-controls';

const sodMgr = new SegregationOfDutiesManager(pool, auditLogger);
await sodMgr.initialize();

// Check for role conflicts
const conflicts = await sodMgr.checkRoleConflict('user-123', 'ADMIN');
if (conflicts.length > 0) {
  console.error('SoD violations detected:', conflicts);
}

// Require approval for sensitive action
const approval = await sodMgr.requireApproval(
  'user.delete',
  'admin-1',
  'Removing terminated employee account'
);

// Approve action (must be different person)
await sodMgr.approveAction(approval.workflowId!, 'admin-2', 'Verified termination');
```

## Compliance Controls

### Example: Implementing NIST 800-53 AC-2 (Account Management)

```typescript
import { NIST_800_53_CONTROLS } from '@intelgraph/compliance';

// Get control requirements
const ac2 = NIST_800_53_CONTROLS.find(c => c.number === 'AC-2');

// Update implementation status
await manager.updateControlStatus(
  'ac-2',
  ControlStatus.IMPLEMENTED,
  'Automated account provisioning with approval workflows implemented',
  [
    'screenshots/account-provisioning.png',
    'policies/account-management-policy.pdf',
    'audit-logs/account-reviews-2024.csv'
  ]
);
```

### FedRAMP Compliance Check

```typescript
import { calculateFedRAMPCompliance, FedRAMPLevel } from '@intelgraph/compliance';

const implementedControls = new Map([
  ['ac-1', ControlStatus.IMPLEMENTED],
  ['ac-2', ControlStatus.IMPLEMENTED],
  ['au-1', ControlStatus.PARTIALLY_IMPLEMENTED],
  // ... more controls
]);

const status = calculateFedRAMPCompliance(
  FedRAMPLevel.MODERATE,
  implementedControls
);

console.log(`FedRAMP Moderate Compliance: ${status.compliancePercentage}%`);
console.log(`Missing controls: ${status.missingControls.join(', ')}`);
```

## Audit Logging

### Audit Events

All security-relevant events are logged:

```typescript
// Authentication events
await logger.log({
  action: AuditActions.LOGIN,
  outcome: 'success',
  // ... other fields
});

// Data access
await logger.log({
  action: AuditActions.DATA_READ,
  resource: 'investigation',
  classification: DataClassification.SECRET,
  // ... other fields
});

// Administrative actions
await logger.log({
  action: AuditActions.CONFIG_CHANGED,
  details: { setting: 'retention_period', oldValue: 365, newValue: 730 },
  // ... other fields
});
```

### Audit Log Verification

```typescript
// Verify entire audit log
const verification = await logger.verifyIntegrity();

if (!verification.valid) {
  console.error('Integrity violations detected:');
  console.error(`Invalid blocks: ${verification.invalidBlocks}`);
  console.error(`Invalid entries: ${verification.invalidEntries}`);

  // Alert security team
  await sendSecurityAlert('Audit log tampering detected');
}
```

## Data Classification

### Traffic Light Protocol (TLP)

```typescript
import { TLP_DESCRIPTIONS, DataClassification } from '@intelgraph/data-classification';

// TLP:AMBER - Limited sharing
const tlpAmber = TLP_DESCRIPTIONS[DataClassification.TLP_AMBER];
console.log(tlpAmber.description);
// "Recipients can share on a need-to-know basis within their organization and its clients"

// TLP:RED - No sharing
const tlpRed = TLP_DESCRIPTIONS[DataClassification.TLP_RED];
console.log(tlpRed.sharing);
// "No disclosure"
```

### Classification-Based Access Control (CBAC)

```typescript
// Define CBAC policy
await pool.query(`
  INSERT INTO cbac_policies
  (classification, role, can_read, can_write, requires_mfa)
  VALUES ($1, $2, $3, $4, $5)
`, [
  DataClassification.SECRET,
  'SENIOR_ANALYST',
  true,
  true,
  true
]);

// Check access
const access = await classificationMgr.checkAccess(
  DataClassification.SECRET,
  userRole,
  'write'
);

if (!access.allowed) {
  throw new Error(`Access denied: ${access.reason}`);
}

if (access.requiresMFA && !userMFAVerified) {
  // Prompt for MFA
  await requireMFAVerification(userId);
}
```

## Privacy Controls

### PII Detection

```typescript
const text = `
  Contact: John Doe
  Email: john.doe@example.com
  SSN: 123-45-6789
  Phone: (555) 123-4567
`;

const detection = privacyMgr.detectPII(text);

console.log('PII Categories:', detection.categories);
// ['name', 'email', 'ssn', 'phone']

console.log('Redacted:', detection.redactedText);
// Contact: [REDACTED]
// Email: [REDACTED]
// SSN: [REDACTED]
// Phone: [REDACTED]
```

### GDPR Compliance

```typescript
// Article 15 - Right of Access
const exportData = await privacyMgr.exportUserData('user-123');
await sendDataExportEmail(user.email, exportData);

// Article 17 - Right to be Forgotten
const erasureRequest = await privacyMgr.handleDataSubjectRequest(
  'erasure',
  'user-123',
  'user@example.com',
  'email_verified'
);

// Process within 30 days
const deletion = await privacyMgr.processErasureRequest(
  erasureRequest.id,
  'dpo@company.com'
);

console.log(`Deleted ${deletion.deleted} records`);

// Article 20 - Data Portability
const portableData = await privacyMgr.exportUserData('user-123');
await generateJSONExport(portableData, 'user-data-export.json');
```

## Reporting

### Gap Analysis Report

```typescript
import { ComplianceReportingEngine } from '@intelgraph/compliance';

const reporting = new ComplianceReportingEngine(pool);

const gapAnalysis = await reporting.generateGapAnalysis(
  ComplianceFramework.FEDRAMP_MODERATE
);

console.log(`Total gaps: ${gapAnalysis.summary.totalGaps}`);
console.log(`Critical gaps: ${gapAnalysis.summary.criticalGaps}`);
console.log(`Time to close: ${gapAnalysis.summary.estimatedTimeToClose}`);

for (const gap of gapAnalysis.gaps) {
  console.log(`${gap.controlId}: ${gap.controlName}`);
  console.log(`  Priority: ${gap.priority}`);
  console.log(`  Effort: ${gap.estimatedEffort}`);
  console.log(`  Recommendation: ${gap.recommendation}`);
}
```

### Executive Summary

```typescript
const summary = await reporting.generateExecutiveSummary([
  ComplianceFramework.FEDRAMP_MODERATE,
  ComplianceFramework.ISO_27001_2022,
  ComplianceFramework.SOC2_TYPE_II,
]);

console.log(`Overall Compliance: ${summary.overallCompliance.toFixed(1)}%`);
console.log(`Critical Findings: ${summary.criticalFindings}`);
console.log(`Open Violations: ${summary.openViolations}`);

for (const [framework, status] of summary.frameworkStatus) {
  console.log(`${framework}: ${status}`);
}
```

## Certification Path

### FedRAMP Authorization

1. **Package Development** (3-6 months)
   - Complete System Security Plan (SSP)
   - Implement all required controls
   - Document evidence

2. **Assessment** (2-3 months)
   - Third-Party Assessment Organization (3PAO) review
   - Penetration testing
   - Vulnerability scanning

3. **Continuous Monitoring**
   - Monthly vulnerability scanning
   - Annual assessments
   - Ongoing POA&M management

### ISO 27001 Certification

1. **Gap Analysis** (1-2 months)
   - Identify control gaps
   - Develop implementation roadmap

2. **Implementation** (6-12 months)
   - Implement all applicable controls
   - Create Statement of Applicability (SoA)
   - Internal audits

3. **Certification Audit** (1-2 months)
   - Stage 1: Documentation review
   - Stage 2: Implementation verification
   - Certification decision

4. **Surveillance** (Annual)
   - Annual surveillance audits
   - 3-year recertification

### SOC 2 Type II

1. **Readiness Assessment** (1-2 months)
   - Identify control gaps
   - Remediate deficiencies

2. **Type II Audit** (6-12 months)
   - Define audit period
   - Continuous evidence collection
   - Auditor examination

3. **Report Issuance**
   - SOC 2 Type II report
   - Annual re-examination

## Best Practices

1. **Automate Everything**
   - Use automated compliance checks
   - Continuous monitoring
   - Automated evidence collection

2. **Separation of Duties**
   - No single person can circumvent controls
   - Approval workflows for sensitive actions
   - Regular access reviews

3. **Immutable Audit Logs**
   - Never delete audit logs
   - Cryptographic verification
   - Long-term retention

4. **Data Classification**
   - Classify all data assets
   - Enforce classification-based access
   - Regular classification reviews

5. **Privacy by Design**
   - PII detection in all inputs
   - Data minimization
   - Consent management

6. **Continuous Monitoring**
   - Real-time policy enforcement
   - Automated alerting
   - Regular compliance reporting

## Support

For compliance questions:
- Email: compliance@intelgraph.com
- Documentation: https://docs.intelgraph.com/compliance
- Slack: #compliance-framework

## References

- [NIST 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [FedRAMP](https://www.fedramp.gov/)
- [ISO 27001:2022](https://www.iso.org/standard/27001)
- [SOC 2](https://www.aicpa.org/soc)
- [GDPR](https://gdpr.eu/)
- [CCPA](https://oag.ca.gov/privacy/ccpa)
