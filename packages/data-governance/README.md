# @summit/data-governance

Enterprise data governance platform with policy management, compliance automation, and privacy controls for intelligence operations.

## Features

- **Policy Management**: Define, enforce, and monitor data governance policies
- **Compliance Automation**: GDPR, CCPA, HIPAA, SOC2 compliance frameworks
- **Privacy Controls**: Data subject rights, consent management, right to erasure
- **Access Control**: Fine-grained access policies with context-aware enforcement
- **Audit Trail**: Comprehensive audit logging for all data access and modifications

## Installation

```bash
pnpm add @summit/data-governance
```

## Usage

```typescript
import { DataGovernanceEngine, GovernancePolicy } from '@summit/data-governance';
import { Pool } from 'pg';

const pool = new Pool({ /* config */ });
const engine = new DataGovernanceEngine(pool);

// Register governance policy
const policy: GovernancePolicy = {
  id: 'pii-protection',
  name: 'PII Protection Policy',
  description: 'Protect personally identifiable information',
  type: 'data-privacy',
  scope: { tables: ['users'], columns: ['email', 'ssn'] },
  rules: [/* rules */],
  enforcement: { mode: 'enforce', violationAction: 'block', notificationChannels: [] },
  status: 'active',
  version: 1,
  effectiveDate: new Date(),
  owner: 'data-protection-officer',
  approvers: [],
  tags: ['pii', 'privacy'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

await engine.registerPolicy(policy);

// Evaluate access
const access = await engine.evaluateAccess('user123', 'users.email', 'read');
console.log('Access allowed:', access.allowed);

// GDPR compliance
const gdprFramework = await engine.getComplianceManager().createGDPRFramework();
await engine.registerComplianceFramework(gdprFramework);

const compliance = await engine.assessCompliance('gdpr-framework');
console.log('Compliance score:', compliance.complianceScore);

// Privacy request
const request = await engine.submitPrivacyRequest('erasure', 'user123', 'user@example.com');
await engine.processErasureRequest(request.id);
```

## License

MIT
