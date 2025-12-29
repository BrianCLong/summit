# Summit v3 to v4 Migration Guide

This guide provides step-by-step instructions for migrating your Summit integration from v3 to v4. The migration is designed to be non-disruptive, with v3 APIs remaining available throughout the transition period.

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [SDK Upgrade](#sdk-upgrade)
3. [API Endpoint Migration](#api-endpoint-migration)
4. [Authentication Updates](#authentication-updates)
5. [Enabling New Features](#enabling-new-features)
6. [Code Migration Examples](#code-migration-examples)
7. [Testing Your Migration](#testing-your-migration)
8. [Rollback Procedures](#rollback-procedures)
9. [FAQ](#faq)

---

## Pre-Migration Checklist

Before starting the migration, ensure you have:

- [ ] Reviewed the [Release Notes](./RELEASE-NOTES.md) for breaking changes
- [ ] Backed up your current configuration
- [ ] Identified all integration points using Summit APIs
- [ ] Scheduled a maintenance window (recommended for production)
- [ ] Verified your environment meets v4 requirements:
  - Node.js 18+ (if using JavaScript SDK)
  - Python 3.9+ (if using Python SDK)
  - TLS 1.2+ required for all API connections

### RC Updates Based on Beta Feedback

- Enable the **custom policy remap flag** (`MIGRATION_ENABLE_CUSTOM_POLICY_REMAP=true`) during cutover to avoid the Cohort 2 edge case (BETA-025).
- Pre-warm the AI suggestion cache with your top 50 policies to eliminate the beta-observed cold-start latency (BETA-003/BETA-002).
- For evidence uploads >50MB, use resumable uploads with `Content-Range` headers or the **deterministic checksum uploader** (`/api/v4/compliance/upload?mode=deterministic`) introduced post-beta to satisfy HIPAA/SOX guardrails.
- Enable dual JWT parsing (snake_case + camelCase `tenantId`) during the cutover window to prevent authorization drops while SDKs roll forward.
- Run the **migration smoke tests** (`make migrate:rc-smoke`) immediately after deployment to validate auth scopes, audit ledger writes, and dashboard refresh stability.
- Capture a snapshot of the audit ledger Merkle root before and after migration; store both in your change ticket for traceability and validate with `/api/v4/zero-trust/audit/verify`.
- Run a smoke load of 100 concurrent AI suggestion requests (large documents) after enabling v4 to confirm the BETA-002/003 fixes hold in your environment.

---

## SDK Upgrade

### JavaScript/TypeScript SDK

**Update package.json:**

```json
{
  "dependencies": {
    "@summit/sdk": "^4.0.0"
  }
}
```

**Install:**

```bash
npm install @summit/sdk@^4.0.0
# or
pnpm add @summit/sdk@^4.0.0
```

**Breaking Changes:**

```typescript
// v3 - Old import structure
import { SummitClient, GovernanceService } from "@summit/sdk";

// v4 - New import structure with namespaces
import { SummitClient } from "@summit/sdk";
// AI, Compliance, and ZeroTrust are now namespaces on the client
```

### Python SDK

**Update requirements.txt:**

```
summit-sdk>=4.0.0
```

**Install:**

```bash
pip install summit-sdk>=4.0.0
```

### Go SDK

**Update go.mod:**

```go
require github.com/summit/sdk-go v4.0.0
```

---

## API Endpoint Migration

### Version Header

Update your API version header:

```
# v3
X-IG-API-Version: 3.x

# v4
X-IG-API-Version: 4.0
```

### Endpoint Prefix Changes

| v3 Endpoint                   | v4 Endpoint                             | Notes              |
| ----------------------------- | --------------------------------------- | ------------------ |
| `/api/v3/governance/verdicts` | `/api/v4/ai/verdict-explanations`       | Enhanced with AI   |
| `/api/v3/compliance/check`    | `/api/v4/compliance/{framework}/assess` | Framework-specific |
| `/api/v3/audit/log`           | `/api/v4/zero-trust/audit/events`       | Immutable ledger   |
| `/api/v3/keys/*`              | `/api/v4/zero-trust/hsm/keys/*`         | HSM abstraction    |

### New v4-Only Endpoints

These endpoints have no v3 equivalent:

```
/api/v4/ai/policy-suggestions/*     - AI policy suggestions
/api/v4/ai/anomalies/*              - Behavioral anomaly detection
/api/v4/compliance/hipaa/*          - HIPAA compliance
/api/v4/compliance/sox/*            - SOX compliance
/api/v4/compliance/mappings         - Cross-framework mappings
```

---

## Authentication Updates

### User Context Changes

The user context structure has been updated:

```typescript
// v3 - Using tenant_id (snake_case)
interface V3UserContext {
  id: string;
  tenant_id?: string; // Optional, snake_case
  role?: string;
}

// v4 - Using tenantId (camelCase, required for most operations)
interface V4UserContext {
  id: string;
  tenantId: string; // Required, camelCase
  role: string; // Required
  email?: string;
}
```

### New Permission Scopes

v4 introduces granular permission scopes. Add these to your OAuth/JWT configuration:

```yaml
# AI Governance Permissions
ai:suggestions:generate    # Generate policy suggestions
ai:suggestions:read        # View suggestions
ai:suggestions:implement   # Implement suggestions
ai:explanations:generate   # Generate verdict explanations
ai:anomalies:detect        # Run anomaly detection
ai:anomalies:read          # View anomalies
ai:anomalies:resolve       # Resolve anomalies

# Compliance Permissions
compliance:read            # View compliance data
compliance:assess          # Run assessments
compliance:evidence        # Manage evidence

# Zero-Trust Permissions
security:keys:create       # Create HSM keys
security:keys:read         # View keys
security:keys:sign         # Sign with keys
security:keys:rotate       # Rotate keys
audit:read                 # View audit logs
audit:write                # Write audit events
audit:verify               # Verify audit integrity
```

### Middleware Updates

If you use custom authentication middleware:

```typescript
// v3 Middleware
app.use((req, res, next) => {
  req.user = {
    id: decoded.sub,
    tenant_id: decoded.tenant_id, // Old format
  };
  next();
});

// v4 Middleware
app.use((req, res, next) => {
  req.user = {
    id: decoded.sub,
    tenantId: decoded.tenant_id || decoded.tenantId, // Support both
    role: decoded.role || "user",
  };
  next();
});
```

---

## Enabling New Features

### AI Governance Features

AI governance features are **opt-in** by default. Enable them in your tenant configuration:

```typescript
// Enable AI features via API
await client.admin.updateTenantConfig({
  tenantId: "your-tenant-id",
  features: {
    aiGovernance: {
      enabled: true,
      policySuggestions: {
        enabled: true,
        maxSuggestionsPerDay: 50,
        requireHumanApproval: true, // Recommended
      },
      verdictExplanations: {
        enabled: true,
        defaultAudience: "end_user",
        cacheExplanations: true,
      },
      anomalyDetection: {
        enabled: true,
        autoBlockThreshold: 90,
        alertChannels: ["slack", "email"],
      },
    },
  },
});
```

### Compliance Frameworks

Enable HIPAA and/or SOX compliance:

```typescript
// Enable HIPAA compliance
await client.compliance.enableFramework({
  tenantId: "your-tenant-id",
  framework: "hipaa",
  config: {
    autoAssess: true,
    assessmentFrequency: "weekly",
    notifyOnFailure: true,
  },
});

// Enable SOX compliance
await client.compliance.enableFramework({
  tenantId: "your-tenant-id",
  framework: "sox",
  config: {
    autoAssess: true,
    itgcDomainsOnly: false, // Full SOX assessment
    assessmentPeriod: "quarterly",
  },
});
```

### Zero-Trust HSM

Configure HSM provider:

```typescript
// Configure HSM (Admin only)
await client.zeroTrust.configureHSM({
  tenantId: "your-tenant-id",
  provider: "aws-cloudhsm", // or 'azure', 'thales', 'software'
  config: {
    clusterId: "cluster-xxxxx",
    region: "us-east-1",
    // Credentials managed via environment variables
  },
});
```

---

## Code Migration Examples

### Example 1: Verdict Explanation

**v3 Code:**

```typescript
// v3 - Basic verdict with manual explanation
const verdict = await client.governance.evaluate({
  action: "read",
  resource: "sensitive-document",
  subject: userId,
});

// Manual explanation construction
const explanation = `Access ${verdict.allowed ? "granted" : "denied"} based on policy ${verdict.policyId}`;
```

**v4 Code:**

```typescript
// v4 - AI-powered explanation
const verdict = await client.governance.evaluate({
  action: "read",
  resource: "sensitive-document",
  subject: userId,
});

// Get AI-generated explanation
const explanation = await client.ai.explainVerdict({
  verdict,
  context: {
    audience: "end_user",
    tone: "friendly",
    includeExamples: true,
  },
});

console.log(explanation.summary);
// "Your request to view this document was approved.
//  You have the 'analyst' role which grants read access
//  to documents in the 'research' category."

console.log(explanation.remediationSteps);
// [] (empty for ALLOW verdicts)
```

### Example 2: Compliance Assessment

**v3 Code:**

```typescript
// v3 - Manual compliance check
const controls = await client.compliance.listControls({ framework: "internal" });
const results = [];

for (const control of controls) {
  const evidence = await gatherEvidence(control.id);
  const result = await client.compliance.check({
    controlId: control.id,
    evidence,
  });
  results.push(result);
}
```

**v4 Code:**

```typescript
// v4 - Automated HIPAA assessment
const assessment = await client.compliance.hipaa.assess({
  tenantId: "your-tenant-id",
  options: {
    categories: ["Technical Safeguards", "Administrative Safeguards"],
  },
});

console.log(assessment.summary);
// {
//   totalControls: 25,
//   compliant: 20,
//   nonCompliant: 2,
//   partiallyCompliant: 3,
//   notApplicable: 0
// }

// Automatic remediation plan
if (assessment.remediationPlan) {
  console.log(`Priority: ${assessment.remediationPlan.priority}`);
  for (const item of assessment.remediationPlan.items) {
    console.log(`- ${item.controlId}: ${item.action}`);
  }
}
```

### Example 3: Key Management

**v3 Code:**

```typescript
// v3 - Software-based key management
const key = await client.keys.create({
  algorithm: "RSA-2048",
  purpose: "signing",
});

const signature = await client.keys.sign({
  keyId: key.id,
  data: documentHash,
});
```

**v4 Code:**

```typescript
// v4 - HSM-backed key management
const key = await client.zeroTrust.hsm.generateKey({
  spec: {
    algorithm: "RSA",
    keySize: 2048,
    purpose: "signing",
    extractable: false, // HSM-bound
  },
  metadata: {
    owner: userId,
    department: "legal",
  },
});

const signature = await client.zeroTrust.hsm.sign({
  keyId: key.id,
  data: documentHash,
  algorithm: "SHA256withRSA",
});

// Verify key is HSM-backed
const attestation = await client.zeroTrust.hsm.attest({
  keyId: key.id,
});
console.log(`HSM Attestation: ${attestation.valid}`);
```

### Example 4: Anomaly Detection

**New in v4:**

```typescript
// Configure and run anomaly detection
const anomalies = await client.ai.anomalies.detect({
  scope: {
    tenantIds: ["your-tenant-id"],
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    anomalyTypes: ["access_pattern", "privilege_escalation"],
    minSeverity: "medium",
  },
});

for (const anomaly of anomalies) {
  console.log(`${anomaly.severity}: ${anomaly.title}`);
  console.log(`Risk Score: ${anomaly.riskScore}`);
  console.log(`Recommended Actions:`);
  for (const action of anomaly.recommendedActions) {
    console.log(`  - [${action.urgency}] ${action.description}`);
  }
}
```

---

## Testing Your Migration

### 1. Unit Tests

Update your test mocks to use v4 response format:

```typescript
// v4 response format with DataEnvelope
const mockResponse = {
  data: {
    /* your data */
  },
  metadata: {
    requestId: "test-request-id",
    timestamp: new Date().toISOString(),
    version: "4.0.0",
  },
  governance: {
    action: "ALLOW",
    reasons: ["Test approved"],
    policyIds: ["test-policy"],
    metadata: {
      timestamp: new Date().toISOString(),
      evaluator: "test",
      latencyMs: 1,
      simulation: false,
    },
    provenance: {
      origin: "test",
      confidence: 1.0,
    },
  },
};
```

### 2. Integration Tests

Run the migration validation suite:

```bash
# Run v4 compatibility tests
npm run test:v4-compat

# Test specific features
npm run test:v4-ai
npm run test:v4-compliance
npm run test:v4-zerotrust
```

### 3. Staging Environment

1. Deploy v4 SDK to staging
2. Run regression tests
3. Validate new features work as expected
4. Check error handling and edge cases

### 4. Production Canary

1. Deploy to a small percentage of production traffic
2. Monitor error rates and latencies
3. Validate governance verdicts are consistent
4. Gradually increase traffic

---

## Rollback Procedures

### SDK Rollback

```bash
# Rollback to v3 SDK
npm install @summit/sdk@^3.0.0
```

### API Version Rollback

Set the API version header back to v3:

```
X-IG-API-Version: 3.x
```

### Feature Flag Rollback

Disable v4 features without full rollback:

```typescript
await client.admin.updateTenantConfig({
  tenantId: "your-tenant-id",
  features: {
    aiGovernance: { enabled: false },
    hipaaCompliance: { enabled: false },
    soxCompliance: { enabled: false },
    hsmIntegration: { enabled: false },
  },
});
```

---

## FAQ

### Q: Do I have to migrate to v4 immediately?

**A:** No. v3 APIs will remain available until v5.0.0 (estimated 18 months). However, new features are only available in v4.

### Q: Will v4 affect my existing governance policies?

**A:** No. Your existing policies continue to work unchanged. v4 AI features provide suggestions and explanations but do not automatically modify policies.

### Q: Is the AI governance feature required?

**A:** No. AI governance features are opt-in and can be enabled/disabled per tenant.

### Q: How is my data used by AI features?

**A:** - All AI processing occurs within Summit's infrastructure

- No data is sent to external AI providers without explicit configuration
- PII is automatically redacted before AI processing
- Full audit trail maintained for all AI operations

### Q: Do I need HSM hardware for v4?

**A:** No. A software HSM option is available for development and non-compliance-critical workloads. Production compliance workloads should use hardware HSM.

### Q: Can I run v3 and v4 simultaneously?

**A:** Yes. v3 and v4 APIs can be used simultaneously. This is useful for gradual migration.

### Q: What happens to my v3 audit logs?

**A:** v3 audit logs remain accessible. New v4 audit events use the immutable ledger with enhanced integrity verification.

### Q: How should we handle large evidence uploads during the cutover?

**A:** Use resumable uploads with `Content-Range` headers and keep individual chunks under 25MB. The RC build validates chunk ordering and integrity; failed parts can be retried without restarting the upload.

### Q: Can tenants still send snake_case JWT claims during rollout?

**A:** Yes. The RC build accepts both `tenant_id` and `tenantId` to support staggered SDK upgrades. Enable the compatibility flag for one release cycle, then lock to camelCase once all services are upgraded.

### Q: How do we validate AI suggestion performance after migrating?

**A:** Run the `tests/ai/suggestion-scale.spec.ts` suite or issue 100 concurrent requests with 100+ page documents. p95 should remain under 3s; if exceeded, enable caching and batching options in the SDK client and contact support.

---

## Support

If you encounter issues during migration:

1. Check our [Knowledge Base](https://support.summit.example/kb/v4-migration)
2. Contact Support: support@summit.example
3. Join our [Community Forum](https://community.summit.example)
4. For urgent issues: Emergency Hotline (Enterprise customers only)

---

## Appendix: Full API Mapping

| v3 Endpoint                       | v4 Endpoint                               | Method   | Notes              |
| --------------------------------- | ----------------------------------------- | -------- | ------------------ |
| `/api/v3/governance/evaluate`     | `/api/v4/governance/evaluate`             | POST     | Unchanged          |
| `/api/v3/governance/verdicts/:id` | `/api/v4/ai/verdict-explanations`         | POST     | Enhanced           |
| `/api/v3/compliance/check`        | `/api/v4/compliance/{framework}/assess`   | POST     | Split by framework |
| `/api/v3/compliance/controls`     | `/api/v4/compliance/{framework}/controls` | GET      | Split by framework |
| `/api/v3/audit/log`               | `/api/v4/zero-trust/audit/events`         | POST     | Enhanced           |
| `/api/v3/audit/search`            | `/api/v4/zero-trust/audit/events`         | GET      | Enhanced           |
| `/api/v3/keys`                    | `/api/v4/zero-trust/hsm/keys`             | GET/POST | HSM abstraction    |
| `/api/v3/keys/:id/sign`           | `/api/v4/zero-trust/hsm/keys/:id/sign`    | POST     | HSM abstraction    |
| N/A                               | `/api/v4/ai/policy-suggestions`           | GET/POST | New                |
| N/A                               | `/api/v4/ai/anomalies`                    | GET/POST | New                |
| N/A                               | `/api/v4/compliance/hipaa/*`              | Various  | New                |
| N/A                               | `/api/v4/compliance/sox/*`                | Various  | New                |

---

_Last Updated: January 2025_
_Summit Platform v4.0.0 Migration Guide_
