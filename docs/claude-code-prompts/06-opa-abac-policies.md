# Prompt 6: OPA/Rego ABAC Policies + Purpose/Retention

## Role
Policy Engineer

## Context
IntelGraph is a multi-tenant platform requiring fine-grained access control based on:
- **Tenant isolation** - Users only access their tenant's data
- **OIDC claims** - User attributes from SSO provider
- **Purpose tags** - Data access restricted by investigation purpose
- **Retention tiers** - Automatic data lifecycle management
- **Privacy-by-default** - PII redaction and k-anonymity

Open Policy Agent (OPA) provides declarative policy enforcement across all services.

## Task
Author Rego policies and supporting infrastructure:

### 1. ABAC Policies
- Tenant scoping (multi-tenancy enforcement)
- OIDC claim-based authorization
- Purpose-based access control
- Retention tier policies

### 2. Retention Tiers
Define and implement:
- **Ephemeral**: 7 days
- **Short**: 30 days
- **Standard**: 365 days
- **Long**: 1,825 days (5 years)
- **Legal Hold**: Indefinite (until released)

### 3. Privacy Helpers
- PII redaction functions
- k-anonymity helpers
- Data minimization utilities

## Guardrails

### Security
- **Deny-by-default** - All policies start with deny
- **Explicit allow** - Access requires positive policy match
- **No policy bypass** - All mutations go through OPA

### Testing
- Policy simulation in CI
- Test coverage for all decision paths
- Performance testing (policy evaluation < 10ms p95)

## Deliverables

### 1. Policy Files
- [ ] `policy/` directory with Rego policies:
  - [ ] `tenant-isolation.rego` - Multi-tenant scoping
  - [ ] `oidc-claims.rego` - OIDC-based authorization
  - [ ] `purpose-based-access.rego` - Purpose tag enforcement
  - [ ] `retention.rego` - Retention tier policies
  - [ ] `privacy.rego` - PII redaction and k-anonymity
  - [ ] `rbac.rego` - Role-based access control (baseline)

### 2. Test Cases
- [ ] `policy/tests/` with OPA test files:
  - [ ] Positive test cases (allow scenarios)
  - [ ] Negative test cases (deny scenarios)
  - [ ] Edge cases (missing claims, expired tokens, etc.)

### 3. Policy Simulation
- [ ] CLI script for policy simulation
- [ ] CI integration (`opa test`)
- [ ] Example policy traces with explanations

### 4. SCIM Integration
- [ ] SCIM user/group mapping stubs
- [ ] Attribute mapping documentation
- [ ] Example SCIM payloads

### 5. Documentation
- [ ] Policy architecture overview
- [ ] Rego policy guide for developers
- [ ] Testing and debugging guide
- [ ] Performance tuning notes

## Acceptance Criteria
- ✅ `opa test` passes all test cases
- ✅ Simulated traces show correct allow/deny decisions
- ✅ Purpose and retention enforcement validated
- ✅ PII redaction functions work correctly
- ✅ Deny-by-default proven (no policy = deny)
- ✅ Policy evaluation latency p95 < 10ms

## Example Policy Structure

### Tenant Isolation
```rego
package intelgraph.tenant

import future.keywords.if
import future.keywords.in

default allow = false

# Allow if user's tenant matches resource tenant
allow if {
    input.user.tenantId == input.resource.tenantId
}

# Deny if tenant mismatch
deny["Tenant mismatch"] if {
    input.user.tenantId != input.resource.tenantId
}
```

### Purpose-Based Access
```rego
package intelgraph.purpose

import future.keywords.if
import future.keywords.in

default allow = false

# Allow if user has purpose in their active investigations
allow if {
    input.resource.purpose in input.user.activePurposes
}

# Allow if user has global purpose access (admin)
allow if {
    "purpose:*" in input.user.permissions
}

# Deny if purpose not in user's active list
deny["Purpose not authorized"] if {
    not input.resource.purpose in input.user.activePurposes
    not "purpose:*" in input.user.permissions
}
```

### Retention Policy
```rego
package intelgraph.retention

import future.keywords.if

# Retention tier definitions (in days)
retention_days := {
    "ephemeral": 7,
    "short": 30,
    "standard": 365,
    "long": 1825,
    "legal-hold": -1  # Indefinite
}

# Check if data should be purged
should_purge(data) if {
    tier := data.retentionTier
    tier != "legal-hold"

    days_since_creation := time.now_ns() - time.parse_rfc3339_ns(data.createdAt)
    retention_period := retention_days[tier] * 86400 * 1000000000  # Convert to nanoseconds

    days_since_creation > retention_period
}

# Legal hold prevents purging
should_purge(data) = false if {
    data.retentionTier == "legal-hold"
}
```

### PII Redaction
```rego
package intelgraph.privacy

import future.keywords.if

# Redact PII fields based on user permissions
redact_pii(entity, user) := redacted if {
    not has_pii_access(user)
    redacted := {
        "id": entity.id,
        "type": entity.type,
        "name": "[REDACTED]",
        "attributes": redact_attributes(entity.attributes),
    }
}

redact_pii(entity, user) := entity if {
    has_pii_access(user)
}

has_pii_access(user) if {
    "pii:read" in user.permissions
}

redact_attributes(attrs) := {k: v |
    some k, v in attrs
    not k in {"ssn", "dob", "email", "phone"}
}
```

## Policy Input Schema

```typescript
interface PolicyInput {
  user: {
    userId: string;
    tenantId: string;
    permissions: string[];         // e.g., ["entity:read", "pii:read"]
    activePurposes: string[];      // e.g., ["investigation-123"]
    oidcClaims: Record<string, unknown>;
  };

  resource: {
    resourceId: string;
    resourceType: string;          // "Entity", "Relationship", etc.
    tenantId: string;
    purpose: string;               // Purpose tag
    retentionTier: 'ephemeral' | 'short' | 'standard' | 'long' | 'legal-hold';
    classification?: string;       // Data classification
  };

  operation: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT';
}
```

## Example CLI Usage

```bash
# Test all policies
opa test policy/ -v

# Simulate a policy decision
opa eval \
  --data policy/ \
  --input input.json \
  'data.intelgraph.tenant.allow'

# Run policy with tracing (debug)
opa eval \
  --data policy/ \
  --input input.json \
  --explain=full \
  'data.intelgraph.tenant.allow'

# Benchmark policy evaluation
opa bench policy/ \
  --data data.json \
  'data.intelgraph.tenant.allow'
```

## Related Files
- `/home/user/summit/policy/` - Existing OPA policies
- `/home/user/summit/docs/privacy.md` - Privacy requirements
- `/home/user/summit/services/policy/` - OPA service integration

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 6: OPA ABAC policies implementation"

# Or use the slash command (if configured)
/opa-policies
```

## Notes
- Use OPA v0.60+ with Rego v1 syntax (`future.keywords`)
- Integrate with API gateway for request-time authorization
- Cache policy decisions in Redis (with TTL)
- Emit decision logs for audit
- Consider OPA bundles for policy distribution
