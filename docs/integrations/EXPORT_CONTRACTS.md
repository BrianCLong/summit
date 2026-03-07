# Export Contracts

**Version:** 1.0.0
**Last Updated:** 2025-12-31
**Status:** Stable

## Overview

This document defines the canonical, versioned export schemas for Summit's ecosystem integrations. External systems (SIEM, GRC, analytics platforms) can rely on these contracts for stable, backward-compatible data consumption.

## Versioning Policy

- **Major version** (X.0.0): Breaking changes to schema structure
- **Minor version** (0.X.0): Additive changes (new optional fields)
- **Patch version** (0.0.X): Documentation clarifications, no schema changes

All exports include a `schemaVersion` field to enable downstream version detection and parsing.

---

## 1. Audit Event Export Contract

### Schema Version: 1.0.0

Canonical representation of audit events for external consumption.

```typescript
interface AuditEventExport {
  // Schema metadata
  schemaVersion: "1.0.0";
  exportedAt: string; // ISO 8601 timestamp

  // Event identification
  id: string; // UUID
  eventType: string; // See EventType enum
  timestamp: string; // ISO 8601 timestamp
  level: "info" | "warn" | "error" | "critical";

  // Correlation
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  sessionId?: string;
  requestId?: string;
  parentEventId?: string;

  // Actor context
  actor: {
    userId?: string;
    tenantId: string;
    organizationId?: string;
    serviceAccountId?: string;
    impersonatedBy?: string;
  };

  // Action & outcome
  action: string;
  outcome: "success" | "failure" | "partial" | "pending";
  message: string;

  // Resource context
  resource?: {
    type: string;
    id?: string;
    ids?: string[];
    path?: string;
  };

  // Compliance metadata
  compliance: {
    relevant: boolean;
    frameworks: string[]; // SOC2, GDPR, HIPAA, etc.
    dataClassification?: "public" | "internal" | "confidential" | "restricted" | "top_secret";
    legalHold?: boolean;
  };

  // Security context (redacted per policy)
  security?: {
    ipAddress?: string; // Redacted if required
    userAgent?: string;
    geolocation?: string; // City/Country only
  };

  // Integrity
  integrity: {
    hash: string; // SHA256 of event payload
    previousEventHash?: string; // Hash chain link
    signature?: string; // HMAC signature
  };

  // Details (redacted)
  details?: Record<string, any>; // Flexible metadata, redaction enforced
}
```

### Event Types

```typescript
type AuditEventType =
  // Authentication & Authorization
  | "auth_login"
  | "auth_logout"
  | "auth_failed"
  | "authz_decision"
  | "authz_denied"

  // Data Access
  | "data_read"
  | "data_write"
  | "data_delete"
  | "data_export"

  // Policy & Compliance
  | "policy_decision"
  | "policy_violation"
  | "compliance_check"
  | "compliance_violation"

  // Agent Operations
  | "agent_run_started"
  | "agent_run_completed"
  | "agent_run_failed"
  | "agent_action"
  | "agent_policy_decision"

  // System Events
  | "system_start"
  | "system_shutdown"
  | "system_error"
  | "config_change"
  | "user_created"
  | "user_deleted"

  // Security Events
  | "rate_limit_exceeded"
  | "suspicious_activity"
  | "privilege_escalation"
  | "unauthorized_access";
```

### Redaction Rules

1. **PII Redaction**: Email addresses, phone numbers, SSNs replaced with `[REDACTED]`
2. **IP Anonymization**: Last octet replaced (e.g., `192.168.1.XXX`)
3. **Cross-Tenant Data**: Foreign tenant IDs redacted
4. **Classification-Based**: Fields redacted based on `dataClassification` level

---

## 2. Security Signal Export Contract

### Schema Version: 1.0.0

Security-relevant events for SIEM consumption (subset of audit events).

```typescript
interface SecuritySignalExport {
  // Schema metadata
  schemaVersion: "1.0.0";
  exportedAt: string;

  // Signal identification
  id: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";

  // SIEM common fields (CEF/LEEF compatible)
  category: string; // Authentication, Access, Network, System
  signatureId: string; // Unique signal type identifier
  name: string; // Human-readable signal name

  // Actor
  sourceUser?: string; // userId (redacted)
  sourceTenant: string; // tenantId
  sourceIp?: string; // IP address (anonymized)

  // Target
  destinationResource?: string; // resourceType
  destinationResourceId?: string; // resourceId (redacted)

  // Outcome
  outcome: "success" | "failure" | "blocked";
  message: string;

  // Context
  requestId?: string;
  correlationId?: string;

  // Security metadata
  ruleId?: string; // Policy or detection rule ID
  policyVersion?: string;
  threatScore?: number; // 0-100 anomaly score

  // Raw event reference
  auditEventId: string; // Link to full audit event

  // Compliance
  complianceFrameworks: string[];
}
```

### Signal Categories

```typescript
type SecurityCategory =
  | "Authentication" // Login attempts, MFA, session mgmt
  | "Authorization" // Access decisions, privilege escalation
  | "DataAccess" // Read/write/delete operations
  | "PolicyViolation" // Policy enforcement failures
  | "RateLimiting" // Quota/rate limit events
  | "Anomaly" // Behavioral anomalies
  | "SystemIntegrity"; // Config changes, system events
```

---

## 3. Provenance Export Contract

### Schema Version: 1.0.0

Lineage and provenance metadata for audit trails and reproducibility.

```typescript
interface ProvenanceExport {
  // Schema metadata
  schemaVersion: "1.0.0";
  exportedAt: string;

  // Provenance identity
  id: string; // Provenance record ID
  entityId: string; // Subject entity ID
  entityType: string; // agent_run, policy_decision, data_artifact

  // Lineage
  lineage: {
    inputs: Array<{
      id: string;
      type: string;
      hash?: string;
    }>;
    outputs: Array<{
      id: string;
      type: string;
      hash?: string;
    }>;
    derivedFrom?: string[]; // Parent entity IDs
  };

  // Execution context
  execution?: {
    agentId?: string;
    agentVersion?: string;
    policyVersion?: string;
    startedAt: string;
    completedAt?: string;
    duration?: number; // milliseconds
  };

  // Attestations
  attestations: Array<{
    type: string; // signature, verification, approval
    issuer: string;
    issuedAt: string;
    value: string; // Hash or signature
    algorithm?: string; // SHA256, HMAC-SHA256
  }>;

  // SBOM reference (if applicable)
  sbom?: {
    id: string;
    format: "SPDX" | "CycloneDX";
    location: string; // URL or storage path
    hash: string;
  };

  // Governance
  governance?: {
    approvals: Array<{
      approver: string;
      approvedAt: string;
      status: "approved" | "rejected";
    }>;
    verdicts: string[]; // Policy verdict IDs
  };
}
```

---

## 4. Explainability Summary Export Contract

### Schema Version: 1.0.0

Redacted explanations for agent and policy decisions.

```typescript
interface ExplainabilitySummaryExport {
  // Schema metadata
  schemaVersion: "1.0.0";
  exportedAt: string;

  // Decision reference
  decisionId: string;
  decisionType: "agent_action" | "policy_decision" | "compliance_check";
  timestamp: string;

  // Context (redacted)
  context: {
    tenantId: string;
    resourceType?: string;
    action?: string;
  };

  // Explanation
  explanation: {
    summary: string; // High-level explanation
    reasoning: string[]; // Step-by-step reasoning (redacted)
    factors: Array<{
      name: string;
      weight: number; // 0-1 influence weight
      description: string;
    }>;
    uncertainty?: number; // 0-1 confidence score
  };

  // Policy context
  policy?: {
    id: string;
    version: string;
    rules: Array<{
      id: string;
      matched: boolean;
      effect: "allow" | "deny" | "audit";
    }>;
  };

  // Outcome
  outcome: "approved" | "denied" | "partial" | "uncertain";

  // Redaction notice
  redactionApplied: boolean;
  dataClassification: string;
}
```

---

## 5. GRC Control Mapping Export Contract

### Schema Version: 1.0.0

Control mappings for compliance frameworks.

```typescript
interface GRCControlMappingExport {
  // Schema metadata
  schemaVersion: "1.0.0";
  exportedAt: string;

  // Control identification
  controlId: string; // Internal control ID
  framework: string; // SOC2, GDPR, HIPAA, etc.
  frameworkControlId: string; // External framework control ID

  // Control details
  control: {
    name: string;
    description: string;
    category: string; // Access Control, Audit, Data Protection
    criticality: "low" | "medium" | "high" | "critical";
  };

  // Implementation
  implementation: {
    status: "implemented" | "partial" | "planned" | "not_applicable";
    implementedAt?: string;
    implementedBy?: string; // System component or service
    automationLevel: "manual" | "semi_automated" | "automated";
  };

  // Evidence
  evidence: Array<{
    id: string;
    type: string; // audit_log, screenshot, document, test_result
    location: string; // Storage path or URL
    hash: string; // SHA256 hash
    collectedAt: string;
    retentionPeriod: number; // Days
  }>;

  // Verification
  verification: {
    lastVerified?: string;
    verifiedBy?: string;
    status: "passed" | "failed" | "not_tested";
    findings?: string[];
  };

  // Relationships
  relatedControls: string[]; // Related control IDs
  dependencies: string[]; // Prerequisite control IDs
}
```

### Supported Frameworks

```typescript
type ComplianceFramework =
  | "SOC2_TYPE_I"
  | "SOC2_TYPE_II"
  | "GDPR"
  | "HIPAA"
  | "SOX"
  | "NIST_800_53"
  | "ISO_27001"
  | "CCPA"
  | "PCI_DSS";
```

---

## 6. Evidence Package Export Contract

### Schema Version: 1.0.0

Bundled evidence for auditor review.

```typescript
interface EvidencePackageExport {
  // Schema metadata
  schemaVersion: "1.0.0";
  exportedAt: string;

  // Package metadata
  packageId: string;
  packageType: "soc2_type_ii" | "gdpr_ropa" | "hipaa_audit" | "custom";
  createdBy: string;
  tenantId: string;

  // Time range
  periodStart: string;
  periodEnd: string;

  // Contents
  contents: {
    auditEvents: number; // Count
    controlMappings: number;
    evidenceArtifacts: number;
    attestations: number;
  };

  // Artifacts
  artifacts: Array<{
    id: string;
    type: string;
    name: string;
    path: string; // Relative path in package
    hash: string; // SHA256
    size: number; // Bytes
    classification: string;
  }>;

  // Attestations
  attestations: Array<{
    type: string; // signature, seal, approval
    issuer: string;
    issuedAt: string;
    algorithm: string;
    value: string; // Signature or hash
  }>;

  // Manifest
  manifest: {
    format: "zip" | "tar.gz";
    totalSize: number; // Bytes
    hash: string; // SHA256 of package
    signaturePublicKey?: string; // For verification
  };

  // Expiration
  expiresAt?: string; // Download link expiration
  retentionPeriod: number; // Days
}
```

---

## 7. Common Patterns

### Timestamp Format

All timestamps use ISO 8601 format with UTC timezone:

```
2025-12-31T23:59:59.000Z
```

### Hash Format

All hashes use SHA256, represented as hex strings:

```
a7f5c8d9e4b3a2f1...
```

### Tenant Isolation

All exports include `tenantId` and enforce row-level security. Cross-tenant data is never exposed.

### Redaction Markers

Redacted fields use the following markers:

```typescript
"[REDACTED]"; // PII or sensitive data
"[REDACTED:PII]"; // Explicitly PII
"[REDACTED:XTENENT]"; // Cross-tenant data
"[REDACTED:CLASS]"; // Classification-based
"XXX.XXX.XXX.XXX"; // IP anonymization
```

### Pagination

For large exports, use cursor-based pagination:

```typescript
interface PaginatedExport<T> {
  data: T[];
  pagination: {
    cursor?: string; // Opaque cursor for next page
    hasMore: boolean;
    total?: number; // Optional total count
  };
}
```

---

## 8. Backward Compatibility Guarantees

### Guaranteed Stable Fields (will not be removed)

- `schemaVersion`
- `exportedAt`
- `id`
- `timestamp`
- `tenantId`

### Optional Field Policy

Optional fields (marked with `?`) may be:

- Added in minor versions
- Deprecated (but not removed) with notice
- Removed only in major versions

### Deprecation Process

1. **Announce**: Deprecation notice in changelog
2. **Mark**: Add `@deprecated` JSDoc comment
3. **Grace Period**: Minimum 6 months before removal
4. **Remove**: Only in next major version

---

## 9. Export Format Support

All exports support the following serialization formats:

| Format     | MIME Type                        | Use Case                |
| ---------- | -------------------------------- | ----------------------- |
| JSON       | `application/json`               | API consumption, SIEM   |
| JSON Lines | `application/x-ndjson`           | Streaming, bulk import  |
| CSV        | `text/csv`                       | Analytics, spreadsheets |
| Parquet    | `application/vnd.apache.parquet` | Data warehouses         |

---

## 10. Validation

All exports conform to JSON Schema definitions. Schemas are available at:

```
/api/v1/schemas/exports/{contractName}/{version}.json
```

Example:

```
GET /api/v1/schemas/exports/audit-event/1.0.0.json
```

---

## 11. Error Handling

Export errors use standardized error responses:

```typescript
interface ExportError {
  error: {
    code: string; // EXPORT_FAILED, INVALID_RANGE, PERMISSION_DENIED
    message: string;
    details?: Record<string, any>;
    requestId: string; // For support escalation
  };
}
```

---

## 12. Rate Limits

Export endpoints enforce rate limits to prevent abuse:

- **Real-time exports**: 100 requests/hour per tenant
- **Bulk exports**: 10 jobs/hour per tenant
- **Large exports** (>10MB): Async job required

---

## 13. Change Log

### Version 1.0.0 (2025-12-31)

- Initial stable release
- Audit event export contract
- Security signal export contract
- Provenance export contract
- Explainability summary export contract
- GRC control mapping export contract
- Evidence package export contract

---

## 14. Support & Feedback

For questions, issues, or enhancement requests:

- **Documentation**: `/docs/integrations/`
- **API Reference**: `/docs/api/export-and-nlq.md`
- **Support**: Create issue with `[export-contract]` label

---

## Appendix A: Example Exports

See `/docs/integrations/EVIDENCE_ECOSYSTEM.md` for complete examples of each contract.

---

## Appendix B: Migration Guides

When a new major version is released, migration guides will be published at:

```
/docs/integrations/migrations/v{X}-to-v{Y}.md
```
