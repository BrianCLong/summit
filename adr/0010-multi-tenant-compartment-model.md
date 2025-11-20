# ADR-0010: Multi-Tenant Compartment Model

**Date:** 2024-03-05
**Status:** Accepted
**Area:** Auth/Security
**Owner:** Security & Platform Guilds
**Tags:** multi-tenant, isolation, compartments, security, rbac

## Context

Summit serves multiple organizations with strict data isolation requirements:
- **Regulatory compliance**: Government, healthcare, financial data cannot leak across tenants
- **Competitive intelligence**: Competitor organizations must never access each other's data
- **Hierarchical tenancy**: Organizations have sub-orgs, teams, projects with nested permissions
- **Shared infrastructure**: Cost-efficient multi-tenancy on shared Postgres, Neo4j, object storage

Requirements:
- **Hard isolation**: No cross-tenant data access even in case of bugs
- **Efficient queries**: Filter by tenant without performance degradation
- **Compartments**: Nested isolation boundaries (org → team → project → investigation)
- **Audit trail**: All cross-boundary access logged
- **Emergency access**: Break-glass procedures for compliance/support

## Decision

We will implement a **hierarchical compartment model** with defense-in-depth isolation.

### Core Decision
Multi-layered isolation strategy:
1. **Database-level**: Tenant ID columns on all tables, enforced via RLS (Row-Level Security)
2. **Application-level**: Tenant context injection, verified at service boundaries
3. **Graph-level**: Neo4j label prefixing (`tenant_123:Entity`)
4. **Object storage**: Tenant-specific buckets or prefixes with IAM policies
5. **Network-level**: Service mesh policies for cross-service calls

Compartments form a hierarchy:
```
Organization (tenant_id)
  └─ Team (team_id)
      └─ Project (project_id)
          └─ Investigation (investigation_id)
```

Each compartment has:
- Unique ID
- Parent compartment reference
- Access control list (subjects with permissions)
- Data residency constraints
- Audit log

### Key Components
- **Tenant Context Middleware**: Injects tenant ID from JWT into request context
- **RLS Policies**: Postgres Row-Level Security on all multi-tenant tables
- **Compartment Service**: Manages compartment hierarchy and permissions
- **Tenant Isolation Tests**: Automated tests verify no cross-tenant leaks

## Alternatives Considered

### Alternative 1: Database-per-Tenant
- **Pros:** Perfect isolation, independent scaling, simple queries
- **Cons:** Operational nightmare (1000s of DBs), expensive, slow provisioning
- **Cost/Complexity:** Prohibitively expensive at scale

### Alternative 2: Schema-per-Tenant
- **Pros:** Good isolation, manageable with automation
- **Cons:** Connection pool exhaustion, migration complexity, still expensive
- **Cost/Complexity:** High operational burden

### Alternative 3: Application-Only Filtering
- **Pros:** Simple, flexible
- **Cons:** Bug-prone, no defense-in-depth, regulatory non-compliant
- **Cost/Complexity:** Dangerous for sensitive data

## Consequences

### Positive
- Defense-in-depth provides multiple isolation layers
- RLS ensures database-level enforcement even if app bugs exist
- Hierarchical compartments match organizational structures naturally
- Efficient queries (tenant_id indexes, partition pruning)
- Cost-effective shared infrastructure

### Negative
- Complexity in managing tenant context across service calls
- RLS policies add overhead to every query (~5-10%)
- Tenant migrations (move data between tenants) are complex
- Testing requires multi-tenant test data setup

### Operational Impact
- **Monitoring**: Track cross-tenant access attempts (should be zero)
- **Security**: Audit all compartment boundary crossings
- **Compliance**: RLS policies provide audit evidence of isolation

## Code References

### Core Implementation
- `server/src/middleware/tenant-context.ts` - Tenant context injection
- `server/src/db/rls-policies.sql` - Row-Level Security policies
- `server/src/services/CompartmentService.ts` - Compartment management
- `server/src/graph/tenant-labels.ts` - Neo4j tenant label prefixing

### Data Models
- `server/src/db/schema/tenants.ts` - Tenant and compartment schema
- `server/src/db/migrations/XXX-rls-policies.sql` - RLS policy definitions

### API Integration
- `server/src/graphql/directives/tenant.ts` - @tenant directive for GraphQL
- `services/authz-gateway/src/tenant-isolation.ts` - Authorization checks

## Tests & Validation

### Unit Tests
- `tests/unit/CompartmentService.test.ts` - Compartment hierarchy logic
- Expected coverage: 95%+

### Integration Tests
- `tests/integration/tenant-isolation.test.ts` - Multi-tenant isolation verification
- Test: User A cannot access User B's data across tenants
- Test: RLS policies block unauthorized queries

### Security Tests
- `tests/security/cross-tenant-leakage.test.ts` - Automated leak detection
- Run on every PR: attempt cross-tenant access, verify all blocked

### CI Enforcement
- `.github/workflows/tenant-isolation.yml` - Tenant isolation tests
- All new tables must have tenant_id column and RLS policy

## References

### Related ADRs
- ADR-0002: ABAC Step-Up Auth (compartment-aware authorization)
- ADR-0011: Provenance Ledger (compartment boundaries in audit trail)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-03-05 | Security Guild | Initial version |
