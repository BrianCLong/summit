# Summit Governance, ABAC & Audit System

## Overview

This implementation provides comprehensive Security, Governance & Audit foundations for Summit, aligned with the Council Wishbook requirements:

- **Multi-tenant isolation** with automatic query filtering
- **ABAC/RBAC** with externalized OPA policies
- **Policy tags** on entities and edges (origin, sensitivity, legal basis, purpose limitation)
- **Warrant/authority binding** at query time
- **Comprehensive audit logging** capturing who/what/why/when
- **Appeal system** for denied access with clear reasoning
- **Immutable audit trail** with hash chains and signatures

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request                            │
│  Headers: Authorization, X-Tenant-Id, X-Purpose,            │
│           X-Legal-Basis, X-Warrant-Id, X-Reason-For-Access  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Authentication Layer                           │
│  JWT validation → User context extraction                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Authorization Layer (OPA/ABAC)                  │
│  Tenant isolation + RBAC + Policy tags + Warrant validation │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Query Execution Layer                        │
│  Neo4j query with policy tag filters + Field redactions     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audit Logging Layer                         │
│  Record who/what/why/when + Hash chain + Signature          │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Policy Tags on Entities and Edges

Every node and relationship in the graph has governance metadata:

```typescript
{
  policy_origin: "user_input" | "third_party" | "derived" | "public_source",
  policy_sensitivity: "public" | "internal" | "confidential" | "restricted" | "top_secret",
  policy_legal_basis: ["investigation", "court_order", "consent", "legitimate_interest"],
  policy_purpose: ["threat_intel", "investigation", "compliance", "audit"],
  policy_data_classification: "pii" | "financial" | "health" | "legal" | "general",
  policy_retention_days: 2555,
  policy_source_warrant: "warrant-uuid",
  policy_collection_date: "2025-01-15T10:00:00Z",
  policy_expiry_date: "2032-01-15T10:00:00Z",
  policy_jurisdiction: "US",
  policy_pii_flags: {
    has_names: true,
    has_emails: true,
    has_phones: false,
    has_ssn: false,
    has_addresses: true,
    has_biometric: false
  }
}
```

### 2. Warrant Management

Legal warrants are first-class entities with full lifecycle management:

```typescript
interface Warrant {
  warrantNumber: "SW-2025-001";
  warrantType: "search_warrant" | "subpoena" | "court_order" | "consent";
  issuingAuthority: "District Court";
  issuedDate: "2025-01-15T00:00:00Z";
  expiryDate: "2025-12-31T23:59:59Z";
  jurisdiction: "US";
  scopeConstraints: {
    resourceTypes: ["investigation", "entity"],
    allowedOperations: ["read", "export"],
    purposes: ["investigation"],
    maxSensitivity: "restricted"
  };
  status: "active" | "expired" | "revoked" | "superseded";
}
```

### 3. Comprehensive Audit Trail

Every access is logged with full governance context:

```typescript
interface AuditEvent {
  // WHO
  userId: "user-123",
  tenantId: "tenant-a",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  sessionId: "session-abc",

  // WHAT
  resourceType: "investigation",
  resourceId: "inv-456",
  action: "view_case_graph",
  operation: "query",

  // WHY
  purpose: "investigation",
  legalBasis: ["court_order"],
  warrantId: "warrant-789",
  reasonForAccess: "Reviewing evidence for case XYZ-123",

  // WHEN
  timestamp: "2025-01-15T14:30:00Z",
  correlationId: "req-abc-123",

  // OUTCOME
  outcome: "success" | "failure" | "partial",
  policyDecision: {
    allowed: true,
    denyReasons: [],
    redactedFields: [],
    evaluationTimeMs: 12
  },

  // INTEGRITY
  hash: "sha256-of-event",
  signature: "jwt-signature",
  previousEventHash: "sha256-of-previous-event"
}
```

### 4. OPA Policy Engine

Authorization logic is externalized and testable:

```rego
# Main authorization policy
allow if {
  tenant_isolation_check
  rbac_permission_check
  policy_tag_check
  warrant_validation_check
  purpose_limitation_check
  data_residency_check
}

# Deny reasons for user feedback
deny_reason contains "insufficient_clearance" if {
  not resource_sensitivity_allowed
}

deny_reason contains "warrant_required" if {
  requires_warrant
  not input.context.warrant_id
}

# Field-level redactions
redact_fields contains "email" if {
  not "scope:pii" in input.user.scopes
  input.resource.policy_pii_flags.has_emails == true
}
```

### 5. Appeal System

When access is denied, users get clear guidance:

```
Access denied: insufficient_clearance, warrant_required.

You can appeal this decision by:
1. Contacting compliance@example.com
2. Submitting an access request at /api/access-requests
3. Obtaining the required warrant for this data classification

Request ID for reference: req-abc-123
```

## Files Created

### Core Implementation

| File | Purpose | Lines |
|------|---------|-------|
| `GOVERNANCE_DESIGN.md` | Comprehensive design document | 1,500+ |
| `server/src/migrations/001_governance_schema.sql` | PostgreSQL schema for warrants, access purposes, audit | 400+ |
| `server/src/migrations/002_neo4j_policy_tags.ts` | Neo4j policy tag migration | 350+ |
| `server/src/services/WarrantService.ts` | Warrant management and validation | 500+ |
| `server/src/middleware/governance.ts` | Governance context extraction and validation | 400+ |
| `policies/intelgraph/abac/allow.rego` | OPA authorization policies | 250+ |
| `server/src/graphql/resolvers/governedInvestigation.ts` | Case graph resolver with full governance | 450+ |

### Testing & Documentation

| File | Purpose | Lines |
|------|---------|-------|
| `server/tests/governance-acceptance.test.ts` | Acceptance tests for Wishbook criteria | 800+ |
| `GOVERNANCE_IMPLEMENTATION_CHECKLIST.md` | Step-by-step deployment guide | 500+ |
| `GOVERNANCE_README.md` | This file | You're reading it! |

### Existing Files Enhanced

| File | Enhancement |
|------|-------------|
| `server/src/audit/advanced-audit-system.ts` | Already had comprehensive audit logging, hash chains, signatures |
| `server/src/middleware/opa-abac.ts` | Already had OPA integration, enhanced with warrant validation |
| `server/src/middleware/context-binding.ts` | Already extracted governance headers |

## API Usage

### Required Headers

All API requests to governed resources must include:

```http
Authorization: Bearer <jwt-token>
X-Tenant-Id: tenant-123
X-Purpose: investigation
X-Legal-Basis: court_order
X-Reason-For-Access: Reviewing evidence for case XYZ-123
X-Warrant-Id: warrant-uuid (if required for data sensitivity)
```

### Example: View Case Graph

```bash
curl -X POST https://api.intelgraph.example.com/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: tenant-a" \
  -H "X-Purpose: investigation" \
  -H "X-Legal-Basis: court_order" \
  -H "X-Warrant-Id: warrant-abc-123" \
  -H "X-Reason-For-Access: Executing search warrant SW-2025-001 for case XYZ" \
  -d '{
    "query": "query { investigationCaseGraph(investigationId: \"inv-456\") { investigation { id title } entities { id type } governanceMetadata { warrantNumber redactedFields } } }"
  }'
```

### Response with Governance Metadata

```json
{
  "data": {
    "investigationCaseGraph": {
      "investigation": {
        "id": "inv-456",
        "title": "Case XYZ Investigation"
      },
      "entities": [
        {
          "id": "entity-1",
          "type": "Person",
          "name": "John Doe",
          "email": "[REDACTED]"
        }
      ],
      "governanceMetadata": {
        "policyTags": {
          "sensitivity": "restricted",
          "legalBasis": ["court_order"],
          "purpose": ["investigation"]
        },
        "warrantId": "warrant-abc-123",
        "warrantNumber": "SW-2025-001",
        "purpose": "investigation",
        "legalBasis": ["court_order"],
        "reasonForAccess": "Executing search warrant SW-2025-001 for case XYZ",
        "redactedFields": ["email", "phone"],
        "accessGrantedAt": "2025-01-15T14:30:00Z",
        "auditTrailId": "req-abc-123",
        "policyEvaluationTimeMs": 12
      }
    }
  }
}
```

## Warrant Management

### Create Warrant

```bash
curl -X POST https://api.intelgraph.example.com/api/warrants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warrantNumber": "SW-2025-001",
    "warrantType": "search_warrant",
    "issuingAuthority": "Federal District Court",
    "issuedDate": "2025-01-15T00:00:00Z",
    "expiryDate": "2025-12-31T23:59:59Z",
    "jurisdiction": "US",
    "scopeDescription": "Investigation into organized crime network",
    "scopeConstraints": {
      "resourceTypes": ["investigation", "entity", "evidence"],
      "allowedOperations": ["read", "export"],
      "purposes": ["investigation"],
      "maxSensitivity": "restricted"
    },
    "tenantId": "tenant-a",
    "createdBy": "judge@court.gov"
  }'
```

### Validate Warrant

```bash
curl -X POST https://api.intelgraph.example.com/api/warrants/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warrantId": "warrant-abc-123",
    "resourceType": "investigation",
    "operation": "view",
    "purpose": "investigation"
  }'
```

### Get Warrant Usage

```bash
curl https://api.intelgraph.example.com/api/warrants/warrant-abc-123/usage \
  -H "Authorization: Bearer $TOKEN"
```

## Access Request (Appeal Process)

### Submit Access Request

```bash
curl -X POST https://api.intelgraph.example.com/api/access-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "investigation",
    "resourceId": "inv-restricted",
    "requestedPurpose": "investigation",
    "justification": "I need access to this investigation to analyze connections to case XYZ. I have obtained verbal approval from my supervisor.",
    "requestedOperations": ["read"],
    "requestedSensitivity": "restricted"
  }'
```

### Review Access Request (Compliance Officer)

```bash
# List pending requests
curl https://api.intelgraph.example.com/api/access-requests?status=pending \
  -H "Authorization: Bearer $COMPLIANCE_OFFICER_TOKEN"

# Approve request
curl -X POST https://api.intelgraph.example.com/api/access-requests/request-123/approve \
  -H "Authorization: Bearer $COMPLIANCE_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewNotes": "Approved based on valid justification and supervisor approval",
    "approvalExpiresAt": "2025-06-30T23:59:59Z",
    "grantedWarrantId": "warrant-xyz-789"
  }'
```

## Audit & Compliance

### Query Audit Logs

```bash
# Get audit logs for a specific investigation
curl -X POST https://api.intelgraph.example.com/api/audit/query \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-01-01T00:00:00Z",
    "endTime": "2025-01-31T23:59:59Z",
    "resourceType": "investigation",
    "resourceId": "inv-456",
    "limit": 100
  }'

# Get audit logs for a specific user
curl -X POST https://api.intelgraph.example.com/api/audit/query \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user-123"],
    "startTime": "2025-01-15T00:00:00Z",
    "endTime": "2025-01-15T23:59:59Z"
  }'
```

### Generate Compliance Report

```bash
curl -X POST https://api.intelgraph.example.com/api/audit/compliance-report \
  -H "Authorization: Bearer $COMPLIANCE_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "SOX",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z"
  }'
```

### Verify Audit Trail Integrity

```bash
curl -X POST https://api.intelgraph.example.com/api/audit/verify-integrity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z"
  }'
```

## Deployment

Follow the step-by-step guide in `GOVERNANCE_IMPLEMENTATION_CHECKLIST.md`:

1. **Phase 1: Foundation (Week 1-2)** - Database migrations, OPA deployment
2. **Phase 2: Pilot (Week 3-4)** - Enable for 1-2 tenants, gather feedback
3. **Phase 3: Gradual Rollout (Week 5-8)** - Enable for all new data, backfill existing
4. **Phase 4: Full Enforcement (Week 9-12)** - Enforce warrants, mandatory reasons, immutable audit

## Configuration

### Feature Flags

Control rollout with environment variables:

```bash
# Gradual enablement
FEATURE_POLICY_TAGS=true          # Add policy tags to new data
FEATURE_WARRANTS=true             # Enable warrant management
FEATURE_GOVERNANCE_HEADERS=false  # Require governance headers (start false)
FEATURE_WARRANT_ENFORCEMENT=false # Enforce warrants for restricted data (start false)
FEATURE_IMMUTABLE_AUDIT=true     # Prevent audit log modifications

# Governance behavior
GOVERNANCE_STRICT_MODE=false      # Reject invalid governance headers (start false)
GOVERNANCE_MIN_REASON_LENGTH=10   # Minimum reason length
```

### OPA Policy Configuration

Policies can be updated without application restart:

```bash
# Update policies
cp policies/intelgraph/abac/allow.rego /etc/opa/policies/intelgraph/abac/

# Reload OPA
curl -X POST http://localhost:8181/v1/policies/intelgraph/abac/allow \
  --data-binary @policies/intelgraph/abac/allow.rego
```

## Performance

### Expected Overhead

- **OPA Policy Evaluation**: 5-15ms per request
- **Audit Logging**: 2-5ms (buffered writes)
- **Neo4j Policy Tag Filtering**: 10-20ms (indexed)
- **Total Expected Overhead**: 20-40ms per request

### Optimization

1. **OPA Caching**: Cache policy decisions for 60 seconds
2. **Audit Batching**: Buffer events and flush every 5 seconds
3. **Neo4j Indexes**: All policy tag properties are indexed
4. **Warrant Caching**: Active warrants cached in Redis (5 min TTL)

## Monitoring

### Key Metrics

- Policy evaluation time (p50, p95, p99)
- Policy denial rate by reason
- Warrant validation failures
- Audit log write latency
- OPA server availability
- Compliance score trends

### Alerts

- OPA server down (critical - all access denied)
- Audit log write failures (critical)
- Warrant validation rate > 10% failures (high)
- Policy evaluation time > 100ms (medium)
- Integrity verification failures (critical)

## Testing

Run the comprehensive acceptance test suite:

```bash
# Run all governance tests
npm test -- governance-acceptance.test.ts

# Run specific test suite
npm test -- governance-acceptance.test.ts -t "Tenant Isolation"

# Run with coverage
npm test -- --coverage governance-acceptance.test.ts
```

## Security Considerations

### What's Implemented

✅ Multi-tenant isolation at query level
✅ RBAC with hierarchical permissions
✅ ABAC with policy tags and OPA
✅ Warrant validation and tracking
✅ Comprehensive audit logging
✅ Hash chains for audit integrity
✅ Field-level redaction based on scopes
✅ Purpose limitation enforcement
✅ Data residency checks
✅ Appeal system for denied access

### Future Enhancements

- [ ] HSM/KMS integration for key management
- [ ] Database encryption at rest
- [ ] Append-only audit storage (e.g., AWS S3 with object lock)
- [ ] OIDC issuer verification completion
- [ ] MFA enforcement for admin roles
- [ ] Anomaly detection in audit logs
- [ ] Real-time alerting for suspicious access patterns

## Troubleshooting

### Common Issues

**Issue**: `Access denied: warrant_required`
**Solution**: Provide `X-Warrant-Id` header with valid warrant

**Issue**: `Access denied: insufficient_clearance`
**Solution**: User needs higher clearance level or submit access request

**Issue**: `Reason for access is required`
**Solution**: Provide `X-Reason-For-Access` header with meaningful description (min 10 chars)

**Issue**: `OPA policy evaluation failed`
**Solution**: Check OPA server is running: `curl http://localhost:8181/health`

**Issue**: Slow query performance
**Solution**: Verify Neo4j indexes exist: `SHOW INDEXES`

### Debug Mode

Enable debug logging:

```bash
DEBUG=governance,warrant,audit,opa npm start
```

## Support

- **Technical Issues**: dev-team@example.com
- **Access Requests**: compliance@example.com via /api/access-requests
- **Security Incidents**: security@example.com
- **Documentation**: https://docs.intelgraph.example.com

## Compliance Frameworks

This implementation supports compliance with:

- **SOX** (Sarbanes-Oxley Act)
- **GDPR** (General Data Protection Regulation)
- **HIPAA** (Health Insurance Portability and Accountability Act)
- **SOC 2** (Service Organization Control 2)
- **NIST** (National Institute of Standards and Technology)
- **ISO 27001** (Information Security Management)

## License

Internal use only. All rights reserved.

## Changelog

### v1.0.0 (2025-01-15)

- Initial implementation
- Policy tags on entities and edges
- Warrant management system
- OPA/ABAC integration
- Comprehensive audit logging
- Appeal system
- Acceptance test suite
- Documentation and deployment guides
