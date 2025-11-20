# Compliance Framework Documentation

This directory contains comprehensive documentation for the IntelGraph Enterprise Compliance and Governance Framework.

## Quick Start

```typescript
import { ComplianceManager, ComplianceFramework } from '@intelgraph/compliance';
import { AuditLogger } from '@intelgraph/audit-logging';
import { DataClassificationManager } from '@intelgraph/data-classification';
import { PrivacyControlsManager } from '@intelgraph/privacy-controls';
import { Pool } from 'pg';

// Initialize database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Initialize compliance components
const compliance = new ComplianceManager(pool);
const audit = new AuditLogger(pool);
const classification = new DataClassificationManager(pool, audit);
const privacy = new PrivacyControlsManager(pool, audit);

// Initialize all tables
await Promise.all([
  compliance.initialize(),
  audit.initialize(),
  classification.initialize(),
  privacy.initialize(),
]);

// Log an audit event
await audit.log({
  userId: 'user-123',
  userName: 'analyst@company.com',
  action: 'data.read',
  resource: 'investigation',
  resourceId: 'inv-456',
  outcome: 'success',
  classification: 'secret',
});

// Check framework compliance
const status = await compliance.getFrameworkStatus(
  ComplianceFramework.FEDRAMP_MODERATE
);

console.log(`Compliance: ${status.compliancePercentage}%`);
```

## Documentation

- **[COMPLIANCE_FRAMEWORK.md](./COMPLIANCE_FRAMEWORK.md)** - Complete framework documentation
  - Supported frameworks (FedRAMP, NIST, ISO 27001, SOC 2)
  - Architecture and components
  - Implementation guides
  - Code examples
  - Best practices

## Package Documentation

Each package includes detailed inline documentation:

- `@intelgraph/compliance` - Main compliance framework
- `@intelgraph/audit-logging` - Immutable audit trails
- `@intelgraph/data-classification` - Classification and CBAC
- `@intelgraph/privacy-controls` - GDPR/CCPA compliance

## Framework Coverage

| Framework | Impact Level | Controls | Status |
|-----------|--------------|----------|--------|
| FedRAMP | Low | 125 | ✅ Implemented |
| FedRAMP | Moderate | 325 | ✅ Implemented |
| FedRAMP | High | 421 | ✅ Implemented |
| NIST 800-53 Rev 5 | All | 1000+ | ✅ Implemented |
| ISO 27001:2022 | All | 93 | ✅ Implemented |
| SOC 2 Type II | All TSC | 30+ | ✅ Implemented |
| GDPR | All | Articles 1-99 | ✅ Implemented |
| CCPA | All | Full | ✅ Implemented |

## Features

- ✅ Immutable audit logging with blockchain-like verification
- ✅ Automated data classification with TLP support
- ✅ Classification-based access control (CBAC)
- ✅ PII detection and masking
- ✅ GDPR Article 17 (Right to be Forgotten) implementation
- ✅ Data portability (GDPR Article 20)
- ✅ Consent management
- ✅ Chain of custody with digital signatures
- ✅ Segregation of duties enforcement
- ✅ Policy engine with automated remediation
- ✅ Data retention and archival
- ✅ Compliance reporting and metrics
- ✅ Gap analysis reports
- ✅ Executive summaries

## Database Schema

The framework creates the following tables:

### Compliance
- `compliance_controls` - Control implementation tracking
- `compliance_reports` - Generated compliance reports
- `compliance_findings` - Control findings and remediation

### Audit
- `audit_log` - Immutable audit trail
- `audit_blocks` - Blockchain-like blocks with merkle roots
- `audit_retention_policies` - Retention policies by classification

### Classification
- `classification_rules` - Auto-classification rules
- `classified_data` - Data classification registry
- `cbac_policies` - Classification-based access policies

### Privacy
- `gdpr_requests` - Data subject requests
- `consent_records` - User consent tracking
- `pii_inventory` - PII location inventory

### Policy
- `security_policies` - Policy definitions
- `policy_violations` - Detected violations
- `retention_policies` - Data retention policies

### Chain of Custody
- `chain_of_custody` - Evidence custody transfers
- `evidence_registry` - Evidence tracking

### Segregation of Duties
- `sod_conflicts` - Detected SoD conflicts
- `approval_workflows` - Dual control approvals
- `role_assignments` - User role tracking

## License

MIT License - See LICENSE file for details

## Contact

- Technical Support: support@intelgraph.com
- Compliance Questions: compliance@intelgraph.com
- Security Issues: security@intelgraph.com
