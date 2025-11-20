# Summit Governance & Audit Enhancement Design

## Executive Summary

This document outlines the design for enhancing Summit's security, governance, and audit capabilities to meet Council Wishbook requirements. The design builds on Summit's existing infrastructure (OPA/ABAC, advanced audit system, RBAC, tenant isolation) and adds:

1. **Policy Tags** on entities and edges (origin, sensitivity, legal basis, purpose limitation)
2. **Enhanced Warrant/Authority System** for legal authority binding
3. **Reason-for-Access Capture** at query time
4. **Immutable Audit Trail** with append-only storage
5. **Appeal System** for denied access with clear reasoning

## Current State Analysis

### Strengths
- ✅ OPA/ABAC integration with field-level authorization
- ✅ Advanced audit system with 20+ event types, hash chains, signatures
- ✅ JWT rotation with RS256/HS256 dual algorithm support
- ✅ RBAC with 4 roles and hierarchical permissions
- ✅ Multi-tenant isolation at query level
- ✅ Context binding for purpose, legal basis, sensitivity headers
- ✅ SPIFFE/SPIRE mTLS for service-to-service auth
- ✅ Compliance tracking (SOX, GDPR, HIPAA, SOC2, NIST, ISO27001)

### Critical Gaps
- ❌ No policy tags on graph entities/edges
- ❌ OIDC issuer verification incomplete (TODO at opa-abac.ts:161)
- ❌ Immutable audit log not enforced (database is mutable)
- ❌ Warrant/authority binding not formalized
- ❌ HSM/KMS integration for key management
- ❌ No database encryption at rest

## Design Overview

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
│  - JWT validation (HS256/RS256)                             │
│  - OIDC validation (to be completed)                        │
│  - User context extraction                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Authorization Layer (OPA/ABAC)                  │
│  Input:                                                      │
│  - User (tenant, roles, scopes, clearance)                  │
│  - Resource (type, id, policy_tags)                         │
│  - Context (purpose, legal_basis, warrant_id, reason)       │
│  - Operation (query/mutation)                               │
│                                                              │
│  Policy Evaluation:                                          │
│  - Check tenant isolation                                    │
│  - Check RBAC permissions                                    │
│  - Check policy tags (origin, sensitivity, purpose)         │
│  - Validate warrant/authority                                │
│  - Apply purpose limitation                                  │
│  - Check data residency                                      │
│                                                              │
│  Output: allow/deny + redactions + reason                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Query Execution Layer                        │
│  - Neo4j query with policy tag filters                      │
│  - Apply field-level redactions                             │
│  - Inject warrant annotations                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audit Logging Layer                         │
│  Record:                                                     │
│  - WHO: user_id, tenant_id, ip_address                      │
│  - WHAT: resource_type, resource_id, operation              │
│  - WHY: purpose, legal_basis, warrant_id, reason            │
│  - WHEN: timestamp, correlation_id                          │
│  - OUTCOME: success/failure/partial + denied_fields         │
│  - INTEGRITY: hash, signature, previous_hash                │
│                                                              │
│  Storage: Append-only audit table (immutable)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Policy Tag Schema

### 1.1 Neo4j Schema Enhancement

Add policy tag properties to all entities and relationships:

```cypher
// Entity policy tags
(:Entity {
  // Existing properties
  id: string,
  tenantId: string,
  type: string,

  // NEW: Policy tags
  policy_origin: string,              // "user_input" | "third_party" | "derived" | "public_source"
  policy_sensitivity: string,         // "public" | "internal" | "confidential" | "restricted" | "top_secret"
  policy_legal_basis: string[],       // ["investigation", "court_order", "consent", "legitimate_interest"]
  policy_purpose: string[],           // ["threat_intel", "investigation", "compliance", "audit"]
  policy_data_classification: string, // "pii" | "financial" | "health" | "legal" | "general"
  policy_retention_days: int,         // Data retention period
  policy_source_warrant: string,      // Warrant ID that authorized this data
  policy_collection_date: datetime,   // When data was collected
  policy_expiry_date: datetime,       // When data must be deleted
  policy_access_count: int,           // Number of times accessed
  policy_last_accessed: datetime,     // Last access timestamp
  policy_owner: string,               // Data steward
  policy_jurisdiction: string,        // "US" | "EU" | "UK" | etc.
  policy_pii_flags: {                 // Structured PII detection
    has_names: boolean,
    has_emails: boolean,
    has_phones: boolean,
    has_ssn: boolean,
    has_addresses: boolean,
    has_biometric: boolean
  }
})

// Relationship policy tags
[:RELATIONSHIP {
  // Existing properties
  type: string,
  tenantId: string,

  // NEW: Policy tags
  policy_sensitivity: string,
  policy_legal_basis: string[],
  policy_source_warrant: string,
  policy_confidence: float,           // Confidence score for derived relationships
  policy_provenance: string           // How this relationship was derived
}]
```

### 1.2 PostgreSQL Schema for Warrants

```sql
-- Warrants and legal authorities
CREATE TABLE warrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_number TEXT NOT NULL UNIQUE,
  warrant_type TEXT NOT NULL, -- "search_warrant" | "subpoena" | "court_order" | "consent"
  issuing_authority TEXT NOT NULL, -- Court name or authority
  issued_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,
  jurisdiction TEXT NOT NULL,
  scope_description TEXT NOT NULL,
  scope_constraints JSONB, -- Specific constraints (time range, data types, purposes)
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- "active" | "expired" | "revoked" | "superseded"
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(warrant_number, '') || ' ' ||
                           coalesce(scope_description, ''))
  ) STORED
);

CREATE INDEX idx_warrants_tenant ON warrants(tenant_id);
CREATE INDEX idx_warrants_status ON warrants(status);
CREATE INDEX idx_warrants_expiry ON warrants(expiry_date);
CREATE INDEX idx_warrants_search ON warrants USING gin(search_vector);

-- Warrant usage tracking
CREATE TABLE warrant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_id UUID NOT NULL REFERENCES warrants(id),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  operation TEXT NOT NULL, -- "query" | "export" | "modify" | "delete"
  purpose TEXT NOT NULL,
  reason_for_access TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  audit_event_id UUID, -- Link to audit log
  ip_address INET,

  CONSTRAINT fk_audit_event FOREIGN KEY (audit_event_id)
    REFERENCES audit_events(id) ON DELETE SET NULL
);

CREATE INDEX idx_warrant_usage_warrant ON warrant_usage(warrant_id);
CREATE INDEX idx_warrant_usage_tenant ON warrant_usage(tenant_id);
CREATE INDEX idx_warrant_usage_user ON warrant_usage(user_id);
CREATE INDEX idx_warrant_usage_timestamp ON warrant_usage(timestamp DESC);

-- Access purpose definitions
CREATE TABLE access_purposes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose_code TEXT NOT NULL UNIQUE, -- "investigation", "threat_intel", "compliance"
  purpose_name TEXT NOT NULL,
  description TEXT,
  requires_warrant BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approval_roles TEXT[], -- Roles that can approve
  retention_days INT, -- Default retention for this purpose
  allowed_operations TEXT[], -- ["read", "write", "export"]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate with standard purposes
INSERT INTO access_purposes (purpose_code, purpose_name, requires_warrant, requires_approval, retention_days, allowed_operations) VALUES
  ('investigation', 'Criminal Investigation', true, true, 2555, ARRAY['read', 'export']),
  ('threat_intel', 'Threat Intelligence', false, true, 365, ARRAY['read']),
  ('compliance', 'Compliance Review', false, true, 2555, ARRAY['read', 'export']),
  ('audit', 'System Audit', false, false, 2555, ARRAY['read']),
  ('incident_response', 'Incident Response', false, true, 365, ARRAY['read', 'write']),
  ('training', 'Training/Testing', false, false, 30, ARRAY['read']);
```

### 1.3 Policy Tag Migration Strategy

```typescript
// server/src/migrations/001_add_policy_tags.ts

export async function up(driver: Driver): Promise<void> {
  const session = driver.session();

  try {
    // Add default policy tags to all existing entities
    await session.run(`
      MATCH (n)
      WHERE NOT EXISTS(n.policy_sensitivity)
      SET n.policy_origin = 'unknown',
          n.policy_sensitivity = 'internal',
          n.policy_legal_basis = ['legitimate_interest'],
          n.policy_purpose = ['investigation'],
          n.policy_data_classification = 'general',
          n.policy_retention_days = 2555,
          n.policy_collection_date = datetime(),
          n.policy_access_count = 0,
          n.policy_jurisdiction = 'US',
          n.policy_pii_flags = {
            has_names: false,
            has_emails: false,
            has_phones: false,
            has_ssn: false,
            has_addresses: false,
            has_biometric: false
          }
    `);

    // Add default policy tags to all relationships
    await session.run(`
      MATCH ()-[r]->()
      WHERE NOT EXISTS(r.policy_sensitivity)
      SET r.policy_sensitivity = 'internal',
          r.policy_legal_basis = ['legitimate_interest'],
          r.policy_confidence = 0.5,
          r.policy_provenance = 'existing_data'
    `);

    // Create indexes for policy tag queries
    await session.run(`
      CREATE INDEX entity_policy_sensitivity IF NOT EXISTS
      FOR (n:Entity)
      ON (n.policy_sensitivity)
    `);

    await session.run(`
      CREATE INDEX entity_policy_legal_basis IF NOT EXISTS
      FOR (n:Entity)
      ON (n.policy_legal_basis)
    `);

    await session.run(`
      CREATE INDEX entity_policy_purpose IF NOT EXISTS
      FOR (n:Entity)
      ON (n.policy_purpose)
    `);

  } finally {
    await session.close();
  }
}
```

---

## 2. Enhanced OPA Policies

### 2.1 OPA Policy Structure

```
policies/
├── intelgraph/
│   ├── abac/
│   │   ├── allow.rego                 # Main allow policy
│   │   ├── tenant_isolation.rego      # Tenant checks
│   │   ├── policy_tags.rego           # Policy tag validation
│   │   ├── warrant_validation.rego    # Warrant/authority checks
│   │   ├── purpose_limitation.rego    # Purpose limitation
│   │   ├── field_redaction.rego       # Field-level redaction
│   │   └── data_residency.rego        # Jurisdiction checks
│   ├── rbac/
│   │   └── permissions.rego           # Role-based checks
│   └── test/
│       └── *.rego_test                # Policy tests
```

### 2.2 Core Policy: `policies/intelgraph/abac/allow.rego`

```rego
package intelgraph.abac

import future.keywords.if
import future.keywords.in

# Main authorization decision
default allow = false

# Allow if all checks pass
allow if {
  tenant_isolation_check
  rbac_permission_check
  policy_tag_check
  warrant_validation_check
  purpose_limitation_check
  data_residency_check
}

# Tenant isolation
tenant_isolation_check if {
  input.user.tenant == input.resource.tenant
}

# RBAC permission check
rbac_permission_check if {
  has_permission(input.user.roles, input.resource.type, input.operation_type)
}

# Policy tag validation
policy_tag_check if {
  resource_sensitivity_allowed
  legal_basis_valid
  purpose_alignment_valid
}

# Resource sensitivity check
resource_sensitivity_allowed if {
  input.resource.policy_sensitivity == "public"
}

resource_sensitivity_allowed if {
  input.resource.policy_sensitivity == "internal"
  "internal" in input.user.clearance_levels
}

resource_sensitivity_allowed if {
  input.resource.policy_sensitivity == "confidential"
  "confidential" in input.user.clearance_levels
}

resource_sensitivity_allowed if {
  input.resource.policy_sensitivity == "restricted"
  "restricted" in input.user.clearance_levels
}

resource_sensitivity_allowed if {
  input.resource.policy_sensitivity == "top_secret"
  "top_secret" in input.user.clearance_levels
}

# Legal basis validation
legal_basis_valid if {
  count(input.resource.policy_legal_basis) > 0
  some basis in input.resource.policy_legal_basis
  basis in ["investigation", "court_order", "consent", "legitimate_interest", "legal_obligation"]
}

# Purpose alignment
purpose_alignment_valid if {
  some resource_purpose in input.resource.policy_purpose
  some request_purpose in input.context.purposes
  resource_purpose == request_purpose
}

# Warrant validation
warrant_validation_check if {
  not requires_warrant
}

warrant_validation_check if {
  requires_warrant
  input.context.warrant_id != null
  warrant_is_valid(input.context.warrant_id, input.resource)
}

requires_warrant if {
  input.resource.policy_sensitivity in ["restricted", "top_secret"]
}

requires_warrant if {
  "court_order" in input.resource.policy_legal_basis
}

# Check warrant validity (to be implemented with external data)
warrant_is_valid(warrant_id, resource) if {
  # This would query the warrant database
  # For now, assume valid if provided
  warrant_id != ""
}

# Purpose limitation
purpose_limitation_check if {
  input.context.purpose != null
  purpose_allowed(input.context.purpose, input.operation_type)
}

# Data residency check
data_residency_check if {
  input.resource.policy_jurisdiction == input.user.residency
}

data_residency_check if {
  input.resource.policy_jurisdiction == "US"
  input.user.residency == "US"
}

# Deny reasons (for audit and user feedback)
deny_reason contains "tenant_isolation_violation" if {
  not tenant_isolation_check
}

deny_reason contains "insufficient_rbac_permissions" if {
  not rbac_permission_check
}

deny_reason contains "insufficient_clearance" if {
  not resource_sensitivity_allowed
}

deny_reason contains "invalid_legal_basis" if {
  not legal_basis_valid
}

deny_reason contains "purpose_mismatch" if {
  not purpose_alignment_valid
}

deny_reason contains "warrant_required" if {
  requires_warrant
  input.context.warrant_id == null
}

deny_reason contains "invalid_warrant" if {
  requires_warrant
  input.context.warrant_id != null
  not warrant_is_valid(input.context.warrant_id, input.resource)
}

deny_reason contains "jurisdiction_mismatch" if {
  not data_residency_check
}

# Field-level redactions
redact_fields contains field_name if {
  some field_name in input.resource.pii_fields
  not "scope:pii" in input.user.scopes
}

# Helper: RBAC permission check
has_permission(roles, resource_type, operation) if {
  some role in roles
  role == "admin"  # Admin has all permissions
}

has_permission(roles, resource_type, operation) if {
  some role in roles
  permission := concat(":", [resource_type, operation])
  permission in data.rbac.role_permissions[role]
}
```

### 2.3 Warrant Validation Policy: `policies/intelgraph/abac/warrant_validation.rego`

```rego
package intelgraph.abac.warrant

import future.keywords.if

# Check if warrant is required for this operation
warrant_required(resource, operation) if {
  resource.policy_sensitivity in ["restricted", "top_secret"]
}

warrant_required(resource, operation) if {
  "court_order" in resource.policy_legal_basis
}

warrant_required(resource, operation) if {
  operation == "export"
  resource.policy_data_classification == "pii"
}

# Validate warrant against resource
warrant_validates(warrant, resource, operation) if {
  warrant.status == "active"
  not warrant_expired(warrant)
  warrant_covers_resource_type(warrant, resource)
  warrant_covers_operation(warrant, operation)
  warrant_jurisdiction_matches(warrant, resource)
}

warrant_expired(warrant) if {
  warrant.expiry_date != null
  time.now_ns() > time.parse_rfc3339_ns(warrant.expiry_date)
}

warrant_covers_resource_type(warrant, resource) if {
  count(warrant.scope_constraints.resource_types) == 0  # No restrictions
}

warrant_covers_resource_type(warrant, resource) if {
  resource.type in warrant.scope_constraints.resource_types
}

warrant_covers_operation(warrant, operation) if {
  count(warrant.scope_constraints.allowed_operations) == 0
}

warrant_covers_operation(warrant, operation) if {
  operation in warrant.scope_constraints.allowed_operations
}

warrant_jurisdiction_matches(warrant, resource) if {
  warrant.jurisdiction == resource.policy_jurisdiction
}
```

---

## 3. Enhanced Audit Schema

The existing audit system (advanced-audit-system.ts) already has most of what we need. We'll enhance it with:

### 3.1 Additional Audit Event Fields

```typescript
// server/src/audit/enhanced-audit-events.ts

export interface EnhancedAuditEvent extends AuditEvent {
  // NEW: Governance fields
  purpose: string;                    // "investigation" | "threat_intel" | etc.
  legal_basis: string[];             // ["court_order", "consent"]
  warrant_id?: string;               // Associated warrant
  reason_for_access: string;         // User-provided justification

  // NEW: Policy enforcement
  policy_decision: {
    allowed: boolean;
    deny_reasons?: string[];         // If denied, why?
    redacted_fields?: string[];      // Fields that were redacted
    applied_policies: string[];      // OPA policies that were evaluated
    evaluation_time_ms: number;      // Policy evaluation duration
  };

  // NEW: Resource policy tags (snapshot at time of access)
  resource_policy_tags?: {
    origin: string;
    sensitivity: string;
    legal_basis: string[];
    purpose: string[];
    source_warrant?: string;
  };

  // NEW: Appeal information (if access denied)
  appeal_available: boolean;
  appeal_contact?: string;
  appeal_process?: string;
}
```

### 3.2 Immutable Audit Storage

```sql
-- Create append-only audit table with row-level security
CREATE TABLE audit_events_immutable (
  LIKE audit_events INCLUDING ALL,
  -- Prevent updates and deletes
  CONSTRAINT no_updates CHECK (false)
);

-- Remove the constraint after creation (PostgreSQL limitation workaround)
-- Instead, use row-level security and triggers

-- Trigger to prevent updates
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER prevent_audit_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Alternative: Use separate write-only and read-only roles
CREATE ROLE audit_writer;
GRANT INSERT ON audit_events TO audit_writer;
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO audit_writer;

CREATE ROLE audit_reader;
GRANT SELECT ON audit_events TO audit_reader;

-- Application uses audit_writer for logging, audit_reader for queries
```

---

## 4. Warrant/Authority System Implementation

### 4.1 Warrant Service

```typescript
// server/src/services/WarrantService.ts

import { Pool } from 'pg';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';

export interface Warrant {
  id: string;
  warrantNumber: string;
  warrantType: 'search_warrant' | 'subpoena' | 'court_order' | 'consent';
  issuingAuthority: string;
  issuedDate: Date;
  expiryDate?: Date;
  jurisdiction: string;
  scopeDescription: string;
  scopeConstraints: {
    resourceTypes?: string[];
    allowedOperations?: string[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    purposes?: string[];
  };
  tenantId: string;
  status: 'active' | 'expired' | 'revoked' | 'superseded';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarrantUsage {
  warrantId: string;
  userId: string;
  tenantId: string;
  resourceType: string;
  resourceId?: string;
  operation: string;
  purpose: string;
  reasonForAccess: string;
  timestamp: Date;
  auditEventId?: string;
}

export class WarrantService {
  constructor(
    private db: Pool,
    private logger: Logger,
  ) {}

  /**
   * Create a new warrant
   */
  async createWarrant(warrant: Omit<Warrant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warrant> {
    const id = randomUUID();
    const now = new Date();

    const result = await this.db.query(
      `
      INSERT INTO warrants (
        id, warrant_number, warrant_type, issuing_authority, issued_date,
        expiry_date, jurisdiction, scope_description, scope_constraints,
        tenant_id, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
      `,
      [
        id,
        warrant.warrantNumber,
        warrant.warrantType,
        warrant.issuingAuthority,
        warrant.issuedDate,
        warrant.expiryDate,
        warrant.jurisdiction,
        warrant.scopeDescription,
        JSON.stringify(warrant.scopeConstraints),
        warrant.tenantId,
        warrant.status,
        warrant.createdBy,
        now,
        now,
      ],
    );

    this.logger.info({
      warrantId: id,
      warrantNumber: warrant.warrantNumber,
      tenantId: warrant.tenantId,
    }, 'Warrant created');

    return this.deserializeWarrant(result.rows[0]);
  }

  /**
   * Get warrant by ID
   */
  async getWarrant(id: string): Promise<Warrant | null> {
    const result = await this.db.query(
      'SELECT * FROM warrants WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserializeWarrant(result.rows[0]);
  }

  /**
   * Validate warrant for a specific access request
   */
  async validateWarrant(
    warrantId: string,
    resourceType: string,
    operation: string,
    purpose: string,
  ): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const warrant = await this.getWarrant(warrantId);

    if (!warrant) {
      return { valid: false, reason: 'Warrant not found' };
    }

    if (warrant.status !== 'active') {
      return { valid: false, reason: `Warrant is ${warrant.status}` };
    }

    if (warrant.expiryDate && new Date() > warrant.expiryDate) {
      return { valid: false, reason: 'Warrant has expired' };
    }

    // Check resource type constraints
    if (
      warrant.scopeConstraints.resourceTypes &&
      warrant.scopeConstraints.resourceTypes.length > 0 &&
      !warrant.scopeConstraints.resourceTypes.includes(resourceType)
    ) {
      return {
        valid: false,
        reason: `Warrant does not cover resource type: ${resourceType}`,
      };
    }

    // Check operation constraints
    if (
      warrant.scopeConstraints.allowedOperations &&
      warrant.scopeConstraints.allowedOperations.length > 0 &&
      !warrant.scopeConstraints.allowedOperations.includes(operation)
    ) {
      return {
        valid: false,
        reason: `Warrant does not allow operation: ${operation}`,
      };
    }

    // Check purpose constraints
    if (
      warrant.scopeConstraints.purposes &&
      warrant.scopeConstraints.purposes.length > 0 &&
      !warrant.scopeConstraints.purposes.includes(purpose)
    ) {
      return {
        valid: false,
        reason: `Warrant does not cover purpose: ${purpose}`,
      };
    }

    // Check time range
    if (warrant.scopeConstraints.timeRange) {
      const now = new Date();
      if (
        now < warrant.scopeConstraints.timeRange.start ||
        now > warrant.scopeConstraints.timeRange.end
      ) {
        return {
          valid: false,
          reason: 'Current time outside warrant time range',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Record warrant usage
   */
  async recordWarrantUsage(usage: WarrantUsage): Promise<void> {
    await this.db.query(
      `
      INSERT INTO warrant_usage (
        warrant_id, user_id, tenant_id, resource_type, resource_id,
        operation, purpose, reason_for_access, timestamp, audit_event_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        usage.warrantId,
        usage.userId,
        usage.tenantId,
        usage.resourceType,
        usage.resourceId,
        usage.operation,
        usage.purpose,
        usage.reasonForAccess,
        usage.timestamp,
        usage.auditEventId,
        null, // ip_address to be added from request context
      ],
    );
  }

  /**
   * Get warrant usage history
   */
  async getWarrantUsage(warrantId: string, limit = 100): Promise<WarrantUsage[]> {
    const result = await this.db.query(
      `
      SELECT * FROM warrant_usage
      WHERE warrant_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
      `,
      [warrantId, limit],
    );

    return result.rows.map(row => ({
      warrantId: row.warrant_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      operation: row.operation,
      purpose: row.purpose,
      reasonForAccess: row.reason_for_access,
      timestamp: row.timestamp,
      auditEventId: row.audit_event_id,
    }));
  }

  /**
   * List active warrants for a tenant
   */
  async listActiveWarrants(tenantId: string): Promise<Warrant[]> {
    const result = await this.db.query(
      `
      SELECT * FROM warrants
      WHERE tenant_id = $1 AND status = 'active'
      ORDER BY issued_date DESC
      `,
      [tenantId],
    );

    return result.rows.map(row => this.deserializeWarrant(row));
  }

  /**
   * Revoke a warrant
   */
  async revokeWarrant(warrantId: string, revokedBy: string): Promise<void> {
    await this.db.query(
      `
      UPDATE warrants
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1
      `,
      [warrantId],
    );

    this.logger.warn({
      warrantId,
      revokedBy,
    }, 'Warrant revoked');
  }

  private deserializeWarrant(row: any): Warrant {
    return {
      id: row.id,
      warrantNumber: row.warrant_number,
      warrantType: row.warrant_type,
      issuingAuthority: row.issuing_authority,
      issuedDate: row.issued_date,
      expiryDate: row.expiry_date,
      jurisdiction: row.jurisdiction,
      scopeDescription: row.scope_description,
      scopeConstraints: row.scope_constraints,
      tenantId: row.tenant_id,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

---

## 5. High-Value Path: Case Graph Viewing

### 5.1 Flow Diagram

```
User Request: View Investigation Case Graph
  |
  v
[1] Authentication
  - Extract JWT token
  - Validate signature
  - Load user context (tenant, roles, clearance)
  |
  v
[2] Context Extraction
  - Headers: X-Purpose, X-Legal-Basis, X-Warrant-Id, X-Reason-For-Access
  - Validate purpose is allowed for user
  - Validate warrant if required
  |
  v
[3] Tenant Validation
  - Ensure user belongs to requested tenant
  - Check compartment access
  |
  v
[4] OPA Authorization
  - Build policy input:
    * user: { tenant, roles, scopes, clearance }
    * resource: { type: 'investigation', id, tenant, policy_tags }
    * context: { purpose, legal_basis, warrant_id, reason }
  - Evaluate OPA policies
  - Get decision + deny_reasons + field_redactions
  |
  v
[5] Neo4j Query with Policy Tags
  - MATCH (i:Investigation {id: $id, tenantId: $tenantId})
  - WHERE i.policy_sensitivity <= $userClearance
  - AND $purpose IN i.policy_purpose
  - Optional: Annotate with warrant information
  - Apply field-level redactions
  |
  v
[6] Audit Logging
  - Record who/what/why/when
  - Include policy decision details
  - Link to warrant usage
  - Calculate hash chain
  |
  v
[7] Response
  - Return graph data
  - Include policy metadata
  - Show redacted fields (if any)
  - Provide appeal path (if denied)
```

### 5.2 Implementation

```typescript
// server/src/graphql/resolvers/investigation.ts

import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { withTenant } from '../../middleware/withTenant';
import { OPAClient } from '../../middleware/opa-abac';
import { WarrantService } from '../../services/WarrantService';
import { AdvancedAuditSystem } from '../../audit/advanced-audit-system';

export const investigationResolvers = {
  Query: {
    /**
     * Get investigation case graph with full governance
     */
    investigationCaseGraph: withTenant(async (
      _parent,
      args: { investigationId: string },
      context,
    ) => {
      const { investigationId } = args;
      const { user, opa, neo4j, warrantService, auditSystem, requestId } = context;

      // [1] Validate authentication
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      // [2] Extract governance context from headers
      const purpose = context.req.headers['x-purpose'] as string;
      const legalBasis = (context.req.headers['x-legal-basis'] as string)?.split(',') || [];
      const warrantId = context.req.headers['x-warrant-id'] as string;
      const reasonForAccess = context.req.headers['x-reason-for-access'] as string;

      if (!purpose) {
        throw new ForbiddenError('Purpose header (X-Purpose) is required');
      }

      if (!reasonForAccess) {
        throw new ForbiddenError('Reason for access (X-Reason-For-Access) is required');
      }

      const correlationId = requestId;

      try {
        // [3] Fetch investigation with policy tags
        const investigationResult = await neo4j.run(
          `
          MATCH (i:Investigation {id: $investigationId, tenantId: $tenantId})
          RETURN i {
            .*,
            policy_tags: {
              origin: i.policy_origin,
              sensitivity: i.policy_sensitivity,
              legal_basis: i.policy_legal_basis,
              purpose: i.policy_purpose,
              source_warrant: i.policy_source_warrant,
              data_classification: i.policy_data_classification,
              jurisdiction: i.policy_jurisdiction
            }
          } as investigation
          `,
          {
            investigationId,
            tenantId: user.tenant,
          },
        );

        if (investigationResult.records.length === 0) {
          await auditSystem.recordEvent({
            eventType: 'resource_access',
            level: 'warn',
            correlationId,
            sessionId: context.sessionId,
            requestId,
            userId: user.id,
            tenantId: user.tenant,
            serviceId: 'intelgraph-api',
            resourceType: 'investigation',
            resourceId: investigationId,
            action: 'view_case_graph',
            outcome: 'failure',
            message: 'Investigation not found',
            details: {
              purpose,
              legalBasis,
              warrantId,
              reasonForAccess,
              denyReason: 'not_found',
            },
            ipAddress: context.req.ip,
            userAgent: context.req.headers['user-agent'],
            complianceRelevant: true,
            complianceFrameworks: ['SOX', 'SOC2'],
          });

          throw new ForbiddenError('Investigation not found or access denied');
        }

        const investigation = investigationResult.records[0].get('investigation');
        const policyTags = investigation.policy_tags;

        // [4] Validate warrant if required
        if (warrantId) {
          const warrantValidation = await warrantService.validateWarrant(
            warrantId,
            'investigation',
            'view',
            purpose,
          );

          if (!warrantValidation.valid) {
            await auditSystem.recordEvent({
              eventType: 'policy_violation',
              level: 'error',
              correlationId,
              sessionId: context.sessionId,
              requestId,
              userId: user.id,
              tenantId: user.tenant,
              serviceId: 'intelgraph-api',
              resourceType: 'investigation',
              resourceId: investigationId,
              action: 'view_case_graph',
              outcome: 'failure',
              message: 'Invalid warrant',
              details: {
                purpose,
                legalBasis,
                warrantId,
                reasonForAccess,
                denyReason: warrantValidation.reason,
              },
              ipAddress: context.req.ip,
              userAgent: context.req.headers['user-agent'],
              complianceRelevant: true,
              complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
            });

            throw new ForbiddenError(
              `Warrant validation failed: ${warrantValidation.reason}. ` +
              `To request access, contact your compliance officer.`
            );
          }
        }

        // [5] OPA authorization
        const policyInput = {
          user: {
            id: user.id,
            tenant: user.tenant,
            roles: user.roles || [],
            scopes: user.scopes || [],
            clearance_levels: user.clearanceLevels || ['internal'],
            residency: user.residency || 'US',
          },
          resource: {
            type: 'investigation',
            id: investigationId,
            tenant: user.tenant,
            ...policyTags,
          },
          context: {
            purpose,
            legal_basis: legalBasis,
            warrant_id: warrantId,
            reason: reasonForAccess,
            purposes: [purpose], // For purpose_alignment_valid check
          },
          operation_type: 'query',
        };

        const policyStartTime = Date.now();
        const opaResult = await opa.evaluate('intelgraph.abac', policyInput);
        const policyEvaluationTime = Date.now() - policyStartTime;

        const allowed = opaResult?.allow || false;
        const denyReasons = opaResult?.deny_reason || [];
        const redactedFields = opaResult?.redact_fields || [];

        if (!allowed) {
          // Access denied - log and provide appeal path
          await auditSystem.recordEvent({
            eventType: 'policy_decision',
            level: 'warn',
            correlationId,
            sessionId: context.sessionId,
            requestId,
            userId: user.id,
            tenantId: user.tenant,
            serviceId: 'intelgraph-api',
            resourceType: 'investigation',
            resourceId: investigationId,
            action: 'view_case_graph',
            outcome: 'failure',
            message: 'Access denied by authorization policy',
            details: {
              purpose,
              legalBasis,
              warrantId,
              reasonForAccess,
              policyDecision: {
                allowed: false,
                denyReasons,
                appliedPolicies: ['intelgraph.abac.allow'],
                evaluationTimeMs: policyEvaluationTime,
              },
              resourcePolicyTags: policyTags,
              appealAvailable: true,
              appealContact: 'compliance@example.com',
              appealProcess: 'Submit access request via /api/access-requests',
            },
            ipAddress: context.req.ip,
            userAgent: context.req.headers['user-agent'],
            complianceRelevant: true,
            complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
          });

          throw new ForbiddenError(
            `Access denied: ${denyReasons.join(', ')}. ` +
            `You can appeal this decision by contacting compliance@example.com or ` +
            `submitting an access request at /api/access-requests.`
          );
        }

        // [6] Record warrant usage
        if (warrantId) {
          await warrantService.recordWarrantUsage({
            warrantId,
            userId: user.id,
            tenantId: user.tenant,
            resourceType: 'investigation',
            resourceId: investigationId,
            operation: 'view',
            purpose,
            reasonForAccess,
            timestamp: new Date(),
          });
        }

        // [7] Fetch case graph with policy constraints
        const caseGraphResult = await neo4j.run(
          `
          MATCH (i:Investigation {id: $investigationId, tenantId: $tenantId})
          MATCH (i)-[r*0..3]-(e)
          WHERE e.tenantId = $tenantId
          AND (
            e.policy_sensitivity <= $userClearance
            OR e.policy_sensitivity IS NULL
          )
          AND (
            $purpose IN e.policy_purpose
            OR e.policy_purpose IS NULL
            OR size(e.policy_purpose) = 0
          )
          RETURN DISTINCT e {
            .*,
            policy_tags: {
              origin: e.policy_origin,
              sensitivity: e.policy_sensitivity,
              legal_basis: e.policy_legal_basis,
              purpose: e.policy_purpose,
              source_warrant: e.policy_source_warrant
            }
          } as entity,
          collect(DISTINCT r) as relationships
          `,
          {
            investigationId,
            tenantId: user.tenant,
            userClearance: user.clearanceLevels?.[0] || 'internal',
            purpose,
          },
        );

        const entities = caseGraphResult.records.map(r => r.get('entity'));
        const relationships = caseGraphResult.records.flatMap(r => r.get('relationships'));

        // [8] Apply field-level redactions
        const redactedEntities = entities.map(entity => {
          const redacted = { ...entity };
          redactedFields.forEach(field => {
            if (redacted[field]) {
              redacted[field] = '[REDACTED]';
            }
          });
          return redacted;
        });

        // [9] Success audit log
        await auditSystem.recordEvent({
          eventType: 'resource_access',
          level: 'info',
          correlationId,
          sessionId: context.sessionId,
          requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'intelgraph-api',
          resourceType: 'investigation',
          resourceId: investigationId,
          action: 'view_case_graph',
          outcome: 'success',
          message: 'Case graph accessed successfully',
          details: {
            purpose,
            legalBasis,
            warrantId,
            reasonForAccess,
            policyDecision: {
              allowed: true,
              denyReasons: [],
              redactedFields,
              appliedPolicies: ['intelgraph.abac.allow'],
              evaluationTimeMs: policyEvaluationTime,
            },
            resourcePolicyTags: policyTags,
            entityCount: entities.length,
            relationshipCount: relationships.length,
          },
          ipAddress: context.req.ip,
          userAgent: context.req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
          dataClassification: policyTags.data_classification,
        });

        // [10] Return results with governance metadata
        return {
          investigation,
          entities: redactedEntities,
          relationships,
          governanceMetadata: {
            policyTags,
            warrantId,
            purpose,
            legalBasis,
            reasonForAccess,
            redactedFields,
            accessGrantedAt: new Date().toISOString(),
            auditTrailId: correlationId,
          },
        };
      } catch (error) {
        // Log error for debugging
        context.logger.error({
          error: error.message,
          investigationId,
          userId: user.id,
          tenantId: user.tenant,
        }, 'Failed to fetch investigation case graph');

        throw error;
      }
    }),
  },
};
```

---

## 6. Migration Plan

### 6.1 Phased Rollout

**Phase 1: Foundation (Week 1-2)**
- ✅ Database migrations: Add policy tag columns to Neo4j
- ✅ Create warrant tables in PostgreSQL
- ✅ Enhance audit schema
- ✅ Deploy OPA with initial policies
- ✅ Backward compatibility: All fields optional, defaults applied

**Phase 2: Pilot (Week 3-4)**
- ✅ Enable for 1-2 tenants (opt-in)
- ✅ Implement warrant service
- ✅ Add governance headers to API
- ✅ Monitor performance and adjust
- ✅ Gather feedback from pilot users

**Phase 3: Gradual Rollout (Week 5-8)**
- ✅ Enable for all new investigations
- ✅ Backfill policy tags for existing data (asynchronous)
- ✅ Make governance headers required for sensitive operations
- ✅ Train users on new access request process

**Phase 4: Full Enforcement (Week 9-12)**
- ✅ Enforce warrant requirements for restricted data
- ✅ Make reason-for-access mandatory
- ✅ Enable immutable audit log
- ✅ Complete OIDC integration
- ✅ Continuous monitoring and optimization

### 6.2 Backward Compatibility

```typescript
// server/src/middleware/governance-compatibility.ts

/**
 * Middleware to provide backward compatibility during migration
 */
export function governanceCompatibilityMiddleware(req, res, next) {
  // If governance headers are missing, inject defaults for non-restricted resources
  if (!req.headers['x-purpose']) {
    req.headers['x-purpose'] = 'general_access';
  }

  if (!req.headers['x-legal-basis']) {
    req.headers['x-legal-basis'] = 'legitimate_interest';
  }

  if (!req.headers['x-reason-for-access']) {
    req.headers['x-reason-for-access'] = 'Normal system access (auto-generated)';
  }

  // Log that defaults were applied
  if (req.user) {
    logger.debug({
      userId: req.user.id,
      path: req.path,
      defaultsApplied: true,
    }, 'Governance headers defaulted for backward compatibility');
  }

  next();
}
```

### 6.3 Feature Flags

```typescript
// server/src/config/feature-flags.ts

export const governanceFeatureFlags = {
  // Phase 1
  policyTagsEnabled: process.env.FEATURE_POLICY_TAGS === 'true',
  warrantsEnabled: process.env.FEATURE_WARRANTS === 'true',

  // Phase 2
  governanceHeadersRequired: process.env.FEATURE_GOVERNANCE_HEADERS === 'true',

  // Phase 3
  warrantEnforcementEnabled: process.env.FEATURE_WARRANT_ENFORCEMENT === 'true',

  // Phase 4
  immutableAuditEnabled: process.env.FEATURE_IMMUTABLE_AUDIT === 'true',
};
```

---

## 7. Acceptance Tests

### 7.1 Test Scenarios

```typescript
// server/tests/governance-acceptance.test.ts

describe('Governance Acceptance Tests', () => {
  describe('1. Tenant Isolation', () => {
    it('should deny access to resources from different tenant', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('X-Tenant-Id', 'tenant-b')
        .send({
          query: `
            query {
              investigation(id: "inv-123") { id }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].message).toContain('tenant_isolation_violation');
    });
  });

  describe('2. RBAC Enforcement', () => {
    it('should deny viewer role from creating investigations', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          query: `
            mutation {
              createInvestigation(title: "Test") { id }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].message).toContain('insufficient_rbac_permissions');
    });
  });

  describe('3. Policy Tag Enforcement', () => {
    it('should deny access to restricted data without clearance', async () => {
      // Create entity with "restricted" sensitivity
      await createEntity({
        id: 'entity-restricted',
        tenantId: 'tenant-a',
        policy_sensitivity: 'restricted',
      });

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${normalUserToken}`) // User with "internal" clearance
        .set('X-Purpose', 'investigation')
        .set('X-Reason-For-Access', 'Testing')
        .send({
          query: `
            query {
              entity(id: "entity-restricted") { id }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].message).toContain('insufficient_clearance');
      expect(response.body.errors[0].message).toContain('appeal');
    });
  });

  describe('4. Warrant Validation', () => {
    it('should require warrant for restricted data', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Purpose', 'investigation')
        .set('X-Reason-For-Access', 'Criminal investigation')
        // Missing X-Warrant-Id
        .send({
          query: `
            query {
              investigation(id: "restricted-inv") {
                caseGraph { entities { id } }
              }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].message).toContain('warrant_required');
    });

    it('should allow access with valid warrant', async () => {
      const warrant = await warrantService.createWarrant({
        warrantNumber: 'SW-2025-001',
        warrantType: 'search_warrant',
        issuingAuthority: 'District Court',
        issuedDate: new Date(),
        jurisdiction: 'US',
        scopeDescription: 'Investigation into case XYZ',
        scopeConstraints: {
          resourceTypes: ['investigation'],
          allowedOperations: ['view', 'export'],
          purposes: ['investigation'],
        },
        tenantId: 'tenant-a',
        status: 'active',
        createdBy: 'judge@court.gov',
      });

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Purpose', 'investigation')
        .set('X-Legal-Basis', 'court_order')
        .set('X-Warrant-Id', warrant.id)
        .set('X-Reason-For-Access', 'Executing search warrant SW-2025-001')
        .send({
          query: `
            query {
              investigation(id: "restricted-inv") {
                caseGraph { entities { id } }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.investigation).toBeDefined();
    });
  });

  describe('5. Reason for Access', () => {
    it('should require reason for access header', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Purpose', 'investigation')
        // Missing X-Reason-For-Access
        .send({
          query: `
            query {
              investigation(id: "inv-123") { id }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].message).toContain('Reason for access');
    });
  });

  describe('6. Audit Trail', () => {
    it('should record who/what/why/when for all access', async () => {
      const correlationId = randomUUID();

      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Request-Id', correlationId)
        .set('X-Purpose', 'investigation')
        .set('X-Legal-Basis', 'court_order')
        .set('X-Warrant-Id', warrantId)
        .set('X-Reason-For-Access', 'Reviewing evidence for case')
        .send({
          query: `
            query {
              investigation(id: "inv-123") { id title }
            }
          `,
        });

      // Verify audit log
      const auditEvents = await auditSystem.queryEvents({
        correlationIds: [correlationId],
      });

      expect(auditEvents).toHaveLength(1);
      const event = auditEvents[0];

      // WHO
      expect(event.userId).toBe('admin-user-id');
      expect(event.tenantId).toBe('tenant-a');
      expect(event.ipAddress).toBeDefined();

      // WHAT
      expect(event.resourceType).toBe('investigation');
      expect(event.resourceId).toBe('inv-123');
      expect(event.action).toBe('view_case_graph');

      // WHY
      expect(event.details.purpose).toBe('investigation');
      expect(event.details.legalBasis).toContain('court_order');
      expect(event.details.warrantId).toBe(warrantId);
      expect(event.details.reasonForAccess).toBe('Reviewing evidence for case');

      // WHEN
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.correlationId).toBe(correlationId);

      // INTEGRITY
      expect(event.hash).toBeDefined();
      expect(event.signature).toBeDefined();
      expect(event.previousEventHash).toBeDefined();
    });
  });

  describe('7. Appeal System', () => {
    it('should provide appeal path when access is denied', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .set('X-Purpose', 'investigation')
        .set('X-Reason-For-Access', 'Need to review case')
        .send({
          query: `
            query {
              investigation(id: "restricted-inv") { id }
            }
          `,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].message).toContain('appeal');
      expect(response.body.errors[0].message).toContain('compliance@example.com');
      expect(response.body.errors[0].message).toContain('/api/access-requests');
    });
  });

  describe('8. Immutable Audit Log', () => {
    it('should prevent modification of audit events', async () => {
      // Attempt to update an audit event directly via SQL
      const result = await db.query(
        `UPDATE audit_events SET message = 'tampered' WHERE id = $1`,
        [auditEventId],
      );

      // Should fail due to trigger
      expect(result).toThrow('Audit events are immutable');
    });

    it('should verify audit trail integrity', async () => {
      const verification = await auditSystem.verifyIntegrity();

      expect(verification.valid).toBe(true);
      expect(verification.invalidEvents).toHaveLength(0);
    });
  });
});
```

---

## 8. Implementation Checklist

### Database & Schema
- [ ] Create warrant tables in PostgreSQL
- [ ] Add policy tag properties to Neo4j entities
- [ ] Create Neo4j indexes for policy tags
- [ ] Set up immutable audit table with triggers
- [ ] Create access_purposes reference table
- [ ] Database migration scripts tested

### OPA Policies
- [ ] Implement main allow policy
- [ ] Implement policy tag validation
- [ ] Implement warrant validation policy
- [ ] Implement purpose limitation policy
- [ ] Implement field redaction policy
- [ ] Write OPA policy unit tests
- [ ] Deploy OPA server with policies

### Services & Middleware
- [ ] Implement WarrantService
- [ ] Enhance AuditSystem with governance fields
- [ ] Create governance context middleware
- [ ] Update authentication middleware for clearance levels
- [ ] Implement backward compatibility layer
- [ ] Add feature flags for gradual rollout

### API & Resolvers
- [ ] Update GraphQL schema with governance types
- [ ] Implement investigationCaseGraph resolver with full governance
- [ ] Add warrant management API endpoints
- [ ] Add access request API endpoints
- [ ] Update error messages with appeal paths
- [ ] Add governance metadata to responses

### Testing
- [ ] Write unit tests for WarrantService
- [ ] Write unit tests for policy tag queries
- [ ] Write integration tests for OPA policies
- [ ] Write acceptance tests for Wishbook criteria
- [ ] Performance test with policy evaluation
- [ ] Load test with 1000+ concurrent users

### Documentation
- [ ] Update API documentation with governance headers
- [ ] Create warrant creation guide
- [ ] Write access request workflow guide
- [ ] Document appeal process
- [ ] Create compliance officer handbook
- [ ] Update developer onboarding docs

### Deployment
- [ ] Deploy database migrations to dev
- [ ] Deploy OPA server to dev
- [ ] Deploy application changes to dev
- [ ] Run acceptance tests in dev
- [ ] Deploy to staging
- [ ] Run pilot with 2 tenants
- [ ] Deploy to production (phased)
- [ ] Monitor performance and errors
- [ ] Gather user feedback
- [ ] Iterate based on feedback

### Compliance & Audit
- [ ] Generate initial compliance report
- [ ] Review audit trail completeness
- [ ] Test audit trail integrity verification
- [ ] Document compliance controls
- [ ] Train compliance officers
- [ ] Schedule regular compliance reviews

---

## 9. Performance Considerations

### Expected Overhead
- **OPA Policy Evaluation**: 5-15ms per request
- **Audit Logging**: 2-5ms (buffered writes)
- **Neo4j Policy Tag Filtering**: 10-20ms additional (indexed)
- **Total Expected Overhead**: 20-40ms per request

### Optimization Strategies
1. **OPA Caching**: Cache policy decisions for 60 seconds with same input
2. **Audit Batching**: Buffer audit events and flush every 5 seconds
3. **Neo4j Indexes**: Index all policy tag properties
4. **Warrant Caching**: Cache active warrants in Redis (TTL: 5 minutes)
5. **Field Redaction**: Pre-compute redactions at data ingestion time

---

## 10. Monitoring & Alerts

### Key Metrics
- Policy evaluation time (p50, p95, p99)
- Policy denial rate by reason
- Warrant validation failures
- Audit log write latency
- OPA server availability
- Compliance score trends

### Critical Alerts
- OPA server down (fails closed - all access denied)
- Audit log write failures
- Warrant validation rate > 10% failures
- Policy evaluation time > 100ms
- Integrity verification failures

---

## Conclusion

This design provides a comprehensive governance framework that builds on Summit's existing security infrastructure. The incremental migration plan ensures minimal disruption while enabling powerful new capabilities for ABAC, warrant binding, and comprehensive audit trails.

**Key Success Metrics:**
- ✅ 100% of resource access logged with who/what/why/when
- ✅ Warrant validation for all restricted data access
- ✅ Policy denial rate < 5% (proper training and access requests)
- ✅ Audit trail integrity verification passing
- ✅ Zero security incidents related to unauthorized access
- ✅ Compliance score > 95% for all frameworks
