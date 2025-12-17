# Threat Model: IntelGraph Queries

> **Owner**: Graph Team
> **Last Updated**: 2025-12-06
> **Risk Tier**: High
> **Status**: Approved

## 1. Feature Overview

**Description**: IntelGraph Queries enable users to search, traverse, and analyze the intelligence graph database (Neo4j) through GraphQL APIs with multi-tenant isolation and classification-aware access controls.

**Scope**:
- GraphQL query endpoints for graph data
- Entity and relationship CRUD operations
- Graph traversal and path finding
- Full-text and semantic search
- Analytics and aggregation queries
- Persisted query execution
- Real-time subscriptions

**Out of Scope**:
- Data ingestion pipelines (separate threat model)
- AI-powered analytics (see maestro-runs.md)
- Report generation and export

**Related Components**:
- `server/src/graphql/intelgraph/*` - GraphQL schema, resolvers
- `server/src/intelgraph/client.ts` - Neo4j client
- `services/api/*` - API service layer
- `SECURITY/policy/opa/*` - Query authorization

---

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| Intelligence entities | Critical | Persons, organizations, locations, events |
| Relationships | Critical | Connections between entities with metadata |
| Investigation data | High | Analyst findings, hypotheses, evidence links |
| Query patterns | Medium | User search behaviors and interests |
| Graph schema | Medium | Structure revealing data model |
| Persisted queries | High | Pre-approved query templates |

---

## 3. Entry Points

| Entry Point | Protocol | Authentication | Trust Level | Description |
|-------------|----------|----------------|-------------|-------------|
| `/graphql` | HTTPS | JWT | Authenticated | Primary GraphQL endpoint |
| `/graphql/ws` | WSS | JWT | Authenticated | Real-time subscriptions |
| `/api/search` | HTTPS | JWT | Authenticated | Full-text search |
| `/api/graph/traverse` | HTTPS | JWT | Authenticated | Path finding APIs |
| Neo4j Bolt | Bolt/TLS | Service account | Internal | Direct database access |

---

## 4. Trust Boundaries

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        IntelGraph Query Flow                                │
│                                                                            │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐  │
│  │ Client  │───▶│ GraphQL API  │───▶│ OPA Policy  │───▶│    Neo4j      │  │
│  │         │    │   Server     │    │   Engine    │    │   Database    │  │
│  └─────────┘    └──────────────┘    └─────────────┘    └───────────────┘  │
│       │               │                   │                   │            │
│  [Untrusted]    [Query Parsing]     [Authorization]      [Data Store]     │
│                       │                   │                   │            │
│                       ▼                   ▼                   ▼            │
│               [Depth/Complexity]   [Tenant Filter]    [Classification]    │
│                    Limits          [Clearance Check]     [Encryption]     │
└────────────────────────────────────────────────────────────────────────────┘
```

| Boundary | From | To | Controls |
|----------|------|-----|----------|
| Client → API | Untrusted | Application | TLS, JWT, rate limiting |
| API → OPA | Application | Policy | Localhost, sync call |
| API → Neo4j | Application | Database | TLS, connection pool, parameterized queries |
| Query → Data | Query context | Data nodes | Classification check, tenant filter |

---

## 5. Threats

### 5.1 STRIDE Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| T01 | Spoofing | Query impersonation | Stolen JWT used for unauthorized queries | Medium | High | High |
| T02 | Tampering | Query manipulation | Modify query in transit to access other data | Low | Critical | High |
| T03 | Tampering | Result tampering | MITM modifies query results | Low | High | Medium |
| T04 | Repudiation | Query denial | User denies executing sensitive queries | Medium | Medium | Medium |
| T05 | Info Disclosure | Cross-tenant data leak | Query returns data from other tenants | Medium | Critical | Critical |
| T06 | Info Disclosure | Classification breach | Access data above clearance level | Low | Critical | High |
| T07 | Info Disclosure | Schema exposure | Introspection reveals sensitive schema | Medium | Medium | Medium |
| T08 | Info Disclosure | Query timing attacks | Infer data existence from response times | Low | Medium | Low |
| T09 | DoS | Query complexity attack | Deeply nested queries exhaust resources | High | High | Critical |
| T10 | DoS | Batch query abuse | Large batch operations overwhelm system | Medium | High | High |
| T11 | DoS | Subscription flooding | Open many WebSocket connections | Medium | Medium | Medium |
| T12 | Elevation | Field-level access bypass | Access restricted fields via aliases | Low | High | Medium |
| T13 | Elevation | Directive injection | Inject malicious GraphQL directives | Low | High | Medium |

### 5.2 Graph-Specific Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| G01 | Injection | Cypher injection | Malicious input in query parameters | Medium | Critical | Critical |
| G02 | Info Disclosure | Graph traversal leak | Follow relationships to unauthorized nodes | Medium | Critical | Critical |
| G03 | Info Disclosure | Inference attacks | Combine query results to infer sensitive data | Medium | High | High |
| G04 | DoS | Unbounded traversal | Query traverses entire graph | High | High | Critical |

---

## 6. Mitigations

| Threat ID | Mitigation | Status | Implementation | Owner |
|-----------|------------|--------|----------------|-------|
| T01 | Short-lived JWT, anomaly detection | Implemented | Auth middleware | Auth Team |
| T02 | TLS 1.3, request signing | Implemented | Infrastructure | Platform |
| T03 | Response integrity headers | Implemented | `server/src/security/security-headers.ts` | Platform |
| T04 | Comprehensive query audit logging | Implemented | `server/src/middleware/audit-logger.ts` | Security |
| T05 | OPA tenant isolation in every query | Implemented | `SECURITY/policy/opa/multi-tenant-abac.rego` | Security |
| T06 | Clearance check before data return | Implemented | `server/src/graphql/intelgraph/resolvers.ts` | Graph Team |
| T07 | Disable introspection in production | Implemented | `server/src/graphql/intelgraph/schema.ts` | Graph Team |
| T08 | Constant-time responses for non-existence | Planned | Backlog | Graph Team |
| T09 | Query depth limit (6), complexity limit (1000) | Implemented | `server/src/middleware/graphql-hardening.ts` | Graph Team |
| T10 | Batch size limits, rate limiting | Implemented | GraphQL config | Graph Team |
| T11 | Connection limits per user, heartbeat | Implemented | WebSocket config | Platform |
| T12 | Field-level authorization | Implemented | Resolver middleware | Graph Team |
| T13 | Directive allowlist | Implemented | Schema validation | Graph Team |
| G01 | Parameterized Cypher queries | Implemented | `server/src/intelgraph/client.ts` | Graph Team |
| G02 | Tenant-scoped traversal bounds | Implemented | Query middleware | Graph Team |
| G03 | Result aggregation limits | Implemented | Resolver logic | Graph Team |
| G04 | Traversal depth limits (max 5 hops) | Implemented | Neo4j query config | Graph Team |

### Mitigation Details

#### M-GRAPH-01: Query Hardening
**Addresses**: T09, T10, G04
**Description**: Comprehensive query limits to prevent resource exhaustion.
**Implementation**:
```typescript
// server/src/middleware/graphql-hardening.ts
const queryLimits = {
  maxDepth: 6,
  maxComplexity: 1000,
  maxBatchSize: 10,
  maxAliases: 15,
  maxDirectives: 5,
  introspection: process.env.NODE_ENV !== 'production',
};
```

#### M-GRAPH-02: Cypher Injection Prevention
**Addresses**: G01
**Description**: All Cypher queries use parameterized statements, never string interpolation.
**Implementation**:
```typescript
// server/src/intelgraph/client.ts
// CORRECT - Parameterized
const result = await session.run(
  'MATCH (n:Entity {id: $id}) WHERE n.tenant_id = $tenantId RETURN n',
  { id: entityId, tenantId: context.tenantId }
);

// NEVER - String interpolation
// const result = await session.run(`MATCH (n:Entity {id: '${entityId}'}) RETURN n`);
```

#### M-GRAPH-03: Tenant-Scoped Queries
**Addresses**: T05, G02
**Description**: Every graph query automatically includes tenant isolation.
**Implementation**:
```typescript
// Automatically injected into all queries
function addTenantFilter(query: string, tenantId: string): string {
  // Ensures all MATCH clauses include tenant_id filter
  return queryTransformer.injectTenantScope(query, tenantId);
}
```

---

## 7. Residual Risk

| Threat ID | Residual Risk | Severity | Acceptance Rationale | Accepted By | Date |
|-----------|---------------|----------|---------------------|-------------|------|
| T08 | Timing variations may leak existence | Low | Minimal information, low exploitability | Security Lead | 2025-12-06 |
| G03 | Sophisticated inference still possible | Medium | Acceptable for authorized users; audit mitigates | Graph Lead | 2025-12-06 |
| T09 | Edge cases may bypass complexity limits | Low | Monitoring + manual review for anomalies | Graph Lead | 2025-12-06 |

---

## 8. Security Controls Summary

### Preventive Controls
- [x] Query depth limiting (max 6)
- [x] Query complexity analysis (max 1000)
- [x] Parameterized Cypher queries
- [x] Tenant ID injection in all queries
- [x] Classification-aware data filtering
- [x] Persisted queries in production
- [x] Introspection disabled in production
- [x] Rate limiting per user

### Detective Controls
- [x] Query audit logging with correlation IDs
- [x] Slow query monitoring
- [x] Cross-tenant access attempt alerts
- [x] Anomaly detection on query patterns
- [x] Resource utilization monitoring

### Responsive Controls
- [x] Query cancellation for long-running queries
- [x] Connection termination for abuse
- [x] Emergency read-only mode
- [x] Query blocklist capability

---

## 9. Testing Requirements

| Threat ID | Test Type | Test Description | Automation |
|-----------|-----------|------------------|------------|
| T05 | Integration | Cross-tenant query isolation | Yes |
| T06 | Integration | Classification boundary enforcement | Yes |
| T09 | Unit | Query complexity rejection | Yes |
| G01 | Unit | Cypher injection attempts | Yes |
| G02 | Integration | Traversal boundary tests | Yes |
| G04 | Integration | Unbounded traversal prevention | Yes |

---

## 10. References

- [GraphQL Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [Neo4j Security Guide](https://neo4j.com/docs/operations-manual/current/security/)
- [IntelGraph Schema](../../../server/src/graphql/intelgraph/schema.ts)
- [Multi-Tenant ABAC](../../../SECURITY/policy/opa/multi-tenant-abac.rego)

---

## 11. Review History

| Date | Reviewer | Changes | Version |
|------|----------|---------|---------|
| 2025-12-06 | Graph Team | Initial threat model | 1.0 |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | Graph Team | 2025-12-06 | Approved |
| Security Review | Security Lead | 2025-12-06 | Approved |
| Tech Lead | Graph Lead | 2025-12-06 | Approved |
