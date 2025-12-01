# ADR-002: Service Consolidation Strategy

**Status**: Proposed
**Date**: 2025-11-21
**Deciders**: Architecture Team, Platform Team
**Technical Story**: Reduce service sprawl from 194 to 30-50 services

## Context and Problem Statement

The Summit monorepo contains **194 services** with significant overlap:
- **5 authentication services** handling similar concerns
- **7 graph-related services** with duplicated Neo4j logic
- **5 ingestion services** processing data in parallel

This sprawl causes:
- Maintenance burden (194 services × N maintainers)
- Deployment complexity (194 potential deployment targets)
- Inconsistent implementations of shared functionality
- Resource waste (redundant containers, connections)

## Decision Drivers

- Reduce operational complexity
- Improve consistency of shared functionality
- Lower infrastructure costs
- Simplify developer mental model

## Considered Options

### Option 1: Aggressive Consolidation (Recommended)
Merge services by domain into **30-50 unified services**.

### Option 2: Moderate Consolidation
Merge obvious duplicates only, targeting **80-100 services**.

### Option 3: No Consolidation
Keep all 194 services, improve documentation only.

## Decision Outcome

**Chosen Option: Option 1 - Aggressive Consolidation**

Target: **194 → 40 services** (79% reduction)

### Consolidation Map

#### Authentication & Authorization
**Current (5 services):**
- `services/authz-gateway`
- `services/authz_svc`
- `services/identity-fusion`
- `services/identity-spiffe`
- `apps/gateway` (RBAC logic)

**Target (1 service):**
- `services/auth` - Unified auth service handling:
  - OIDC/JWKS SSO
  - RBAC + ABAC (OPA integration)
  - Identity federation
  - SPIFFE/SPIRE integration
  - Session management

#### Graph Operations
**Current (7 services):**
- `packages/graph-ai-core`
- `packages/graph-analytics`
- `packages/graph-viz`
- `services/graph-api`
- `services/graph-core`
- `services/graph-compute`
- `apps/graph-analytics`

**Target (2 services + 1 package):**
- `services/graph` - Unified graph service:
  - Neo4j operations
  - Graph algorithms
  - GraphQL resolvers for graph data
- `services/graph-compute` - Heavy computation jobs (keep separate for scaling)
- `packages/@domain/graph` - Pure graph utilities (no Neo4j connection)

#### Data Ingestion
**Current (5 services):**
- `packages/ingest-wizard`
- `services/feed-processor`
- `services/ingest`
- `services/ingest_svc`
- `services/ingest-sandbox`

**Target (1 service + 1 package):**
- `services/ingest` - Unified ingestion pipeline:
  - Feed processing
  - Data transformation
  - Validation sandbox
  - Queue management
- `packages/@domain/ingest` - Pure transformation utilities

#### AI/ML Services
**Current (8+ services):**
- `services/copilot`
- `services/conductor`
- `packages/maestro-core`
- `services/ai-worker`
- `apps/ml-engine`
- Multiple model-specific services

**Target (3 services):**
- `services/copilot` - User-facing AI assistant
- `services/ml-inference` - Model serving and inference
- `services/ml-training` - Model training jobs (separate for GPU scaling)

#### Core Platform
**Target services:**
- `services/api` - Primary GraphQL API
- `services/notifications` - Email, push, webhooks
- `services/audit` - Audit logging
- `services/prov-ledger` - Provenance tracking
- `services/search` - Elasticsearch/OpenSearch
- `services/cache` - Redis operations
- `services/scheduler` - Job scheduling

### Migration Strategy

#### Phase 1: Shadow Mode (Week 1-2)
New consolidated service runs alongside old services, receiving mirrored traffic.

```typescript
// Traffic mirror configuration
export const mirrorConfig = {
  source: 'services/authz-gateway',
  target: 'services/auth',
  mirrorPercentage: 100,  // Mirror all traffic
  compareResponses: true,  // Log differences
};
```

#### Phase 2: Canary (Week 3-4)
Route 10% of production traffic to new service.

```yaml
# Kubernetes canary configuration
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
spec:
  route:
    - destination:
        host: auth-legacy
      weight: 90
    - destination:
        host: auth-new
      weight: 10
```

#### Phase 3: Blue-Green (Week 5-6)
Route 50% traffic, then 100% with instant rollback capability.

#### Phase 4: Deprecation (Week 7-8)
- Add deprecation warnings to old service endpoints
- Update all internal callers
- Archive old service code

### API Compatibility

All consolidated services must:
1. **Maintain existing API contracts** - No breaking changes
2. **Support versioning** - `/v1/auth`, `/v2/auth`
3. **Emit compatibility metrics** - Track usage of deprecated endpoints
4. **Log migration warnings** - Help identify callers still using old APIs

```typescript
// Deprecation decorator
@Deprecated({
  message: 'Use POST /v2/auth/verify instead',
  removeBy: '2026-01-01',
  replacement: '/v2/auth/verify',
})
@Post('/v1/verify-token')
async verifyTokenV1(token: string) {
  // Old implementation
}
```

## Consequences

### Positive
- 79% reduction in service count (194 → 40)
- Simplified deployment and monitoring
- Consistent implementations
- Lower infrastructure costs (fewer containers, connections)

### Negative
- Significant migration effort
- Risk of introducing bugs during consolidation
- Larger services may be harder to scale independently

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking production | Medium | High | Canary releases, feature flags |
| Performance regression | Medium | Medium | Load testing before cutover |
| Team resistance | Low | Medium | Clear communication, involvement |
| Data inconsistency | Low | High | Database migrations, dual writes |

## Service Ownership

| Service | Owner | On-Call |
|---------|-------|---------|
| `services/auth` | Platform Team | @platform-oncall |
| `services/graph` | Graph Team | @graph-oncall |
| `services/ingest` | Data Team | @data-oncall |
| `services/copilot` | AI Team | @ai-oncall |
| `services/api` | API Team | @api-oncall |

## Related Documents

- [Monorepo Refactoring Plan](../MONOREPO_REFACTORING_PLAN.md)
- [ADR-001: Workspace Taxonomy](./ADR-001-workspace-taxonomy.md)
- [ADR-003: Build Optimization](./ADR-003-build-optimization.md)
