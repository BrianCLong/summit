# Summit Monorepo Architecture Refactoring Plan

> **Version**: 1.0.0
> **Date**: 2025-11-21
> **Author**: Architecture Team
> **Status**: Proposed

---

## Executive Summary

This document outlines a comprehensive refactoring plan for the Summit/IntelGraph monorepo to address critical architectural issues discovered during analysis:

- **417 workspaces** with unclear boundaries between apps/packages/services
- **194 services** with significant overlap (5+ auth services, 7+ graph services)
- **212 CI workflows** creating maintenance burden
- **Build times of 15-25 minutes** (cold) due to incomplete optimization
- **TypeScript strict mode disabled**, allowing unsafe code patterns

**Goals:**
1. Reduce workspaces from 417 → 80-120 (70% reduction)
2. Consolidate services from 194 → 30-50 (75% reduction)
3. Improve build times by 2-3x (target: 5-8 min cold, <2 min cached)
4. Establish clear workspace taxonomy and ownership

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Refactoring Phases](#refactoring-phases)
4. [Migration Strategy](#migration-strategy)
5. [Risk Mitigation](#risk-mitigation)
6. [Success Metrics](#success-metrics)
7. [Timeline](#timeline)
8. [Related ADRs](#related-adrs)

---

## Current State Analysis

### Workspace Distribution

| Category | Current Count | Issues |
|----------|---------------|--------|
| **Apps** | 21 | Includes stubs (`apps/server`), types packages misplaced |
| **Packages** | 202 | Many contain server logic, unclear boundaries |
| **Services** | 194 | Massive overlap, unclear responsibilities |
| **Root** | 2 | `server/` and `client/` are production apps |

### Critical Pain Points

#### 1. Workspace Type Confusion
- `apps/server` (26KB stub) vs `server/` (27MB production)
- `apps/types` should be in `packages/`
- Business logic scattered across all three categories

#### 2. Service Sprawl
```
Authentication (5 services):
├── services/authz-gateway
├── services/authz_svc
├── services/identity-fusion
├── services/identity-spiffe
└── apps/gateway (RBAC logic)

Graph Operations (7 services):
├── packages/graph-ai-core
├── packages/graph-analytics
├── packages/graph-viz
├── services/graph-api
├── services/graph-core
├── services/graph-compute
└── apps/graph-analytics

Data Ingestion (5 services):
├── packages/ingest-wizard
├── services/feed-processor
├── services/ingest
├── services/ingest_svc
└── services/ingest-sandbox
```

#### 3. Build Performance
- Only **46/417 workspaces** in TypeScript project references
- Serial build chains: `test → build → ^build`
- **35 separate Jest configs** (fragmented testing)
- Estimated **30-50% slower** than optimal

#### 4. CI/CD Complexity
- **212 active GitHub workflows**
- Overlapping: `ci.yml`, `ci-main.yml`, `ci.unified.yml`, `ci-comprehensive.yml`
- **74 docker-compose files**, **94 Dockerfiles**

---

## Target Architecture

### Workspace Taxonomy

```
summit/
├── apps/                     # User-facing entrypoints ONLY
│   ├── web/                  # Primary React UI
│   ├── gateway/              # API Gateway
│   ├── mobile-native/        # Mobile app (if applicable)
│   └── cli/                  # CLI tools
│
├── packages/                 # Pure libraries (NO side effects)
│   ├── @platform/            # Core platform utilities
│   │   ├── common-types/     # Shared TypeScript types
│   │   ├── sdk/              # Client SDKs
│   │   ├── config/           # Configuration management
│   │   └── testing/          # Test utilities
│   │
│   ├── @domain/              # Domain-specific logic
│   │   ├── graph/            # Graph operations (merged)
│   │   ├── auth/             # Auth utilities (pure)
│   │   ├── intelligence/     # Intel domain logic
│   │   └── ml/               # ML/AI primitives
│   │
│   └── @ui/                  # UI component libraries
│       ├── components/       # Shared React components
│       └── themes/           # Design system
│
├── services/                 # Backend workers & APIs
│   ├── api/                  # Primary GraphQL API
│   ├── graph/                # Graph service (consolidated)
│   ├── auth/                 # Auth service (consolidated)
│   ├── ingest/               # Ingestion service (consolidated)
│   ├── copilot/              # AI copilot
│   ├── analytics/            # Analytics engine
│   └── workers/              # Background workers
│       ├── prov-ledger/
│       ├── feed-processor/
│       └── notifications/
│
├── tools/                    # Development tools
└── infra/                    # Infrastructure as code
```

### Service Consolidation Map

| Current Services | Consolidated Service | Rationale |
|------------------|---------------------|-----------|
| `authz-gateway`, `authz_svc`, `identity-fusion`, `identity-spiffe` | `services/auth` | Single auth boundary |
| `graph-api`, `graph-core`, `graph-compute` | `services/graph` | Unified graph operations |
| `ingest`, `ingest_svc`, `ingest-sandbox`, `feed-processor` | `services/ingest` | Single ingestion pipeline |
| `conductor`, `maestro-core` | `services/orchestrator` | Unified workflow engine |

### Target Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Workspaces | 417 | 80-120 | 70% reduction |
| Services | 194 | 30-50 | 75% reduction |
| CI Workflows | 212 | 10-20 | 90% reduction |
| Jest Configs | 35 | 3 | 90% reduction |
| Cold Build | 15-25 min | 5-8 min | 2-3x faster |
| Cached Build | 3-8 min | 30s-2 min | 4-6x faster |

---

## Refactoring Phases

### Phase 1: Quick Wins (Week 1-2)
**Goal:** Immediate performance improvements with minimal risk

1. **Expand TypeScript Project References**
   - Add all 417 workspaces to `tsconfig.build.json`
   - Enable `"composite": true` in base config
   - Expected: 30-50% build speedup

2. **Consolidate Jest Configurations**
   - Merge 35 configs into root `jest.projects.cjs`
   - Standardize test patterns across workspaces
   - Expected: Consistent test environment

3. **Archive Unused Workspaces**
   - Move stubs and experiments to `.archive/`
   - Target: `apps/server`, `apps/example-app`, 10-15 unused services
   - Expected: Faster `pnpm install`, reduced cognitive load

4. **Optimize Turbo Pipeline**
   - Remove unnecessary build dependencies
   - Enable parallel test execution
   - Expected: 40% CI time reduction

### Phase 2: Taxonomy Enforcement (Week 3-4)
**Goal:** Clear workspace boundaries and ownership

1. **Define Workspace Categories**
   - Create `WORKSPACE_TAXONOMY.md` with rules
   - Add linting rules to enforce taxonomy
   - Assign owners to each category

2. **Relocate Misplaced Packages**
   - Move `apps/types` → `packages/@platform/types`
   - Move server logic from packages → services
   - Update all import paths

3. **Introduce Namespace Scopes**
   - `@platform/*` - Core utilities
   - `@domain/*` - Domain logic
   - `@ui/*` - UI components
   - Update `package.json` names accordingly

### Phase 3: Service Consolidation (Week 5-8)
**Goal:** Reduce service count by 75%

1. **Auth Service Consolidation**
   - Merge 5 auth services → `services/auth`
   - Migrate endpoints incrementally
   - Maintain backward compatibility

2. **Graph Service Consolidation**
   - Merge 7 graph services → `services/graph`
   - Unify Neo4j operations
   - Consolidate GraphQL resolvers

3. **Ingestion Pipeline Consolidation**
   - Merge 5 ingestion services → `services/ingest`
   - Create unified ingestion API
   - Deprecate old endpoints

4. **General Service Audit**
   - Identify services with <5% usage
   - Merge or deprecate unused services
   - Target: 194 → 50 services

### Phase 4: Build System Modernization (Week 9-10)
**Goal:** Optimal build performance

1. **Enable TypeScript Strict Mode**
   - Incrementally enable per package
   - Fix type errors as they surface
   - Target: 100% strict coverage

2. **Optimize Docker Builds**
   - Consolidate 94 Dockerfiles → 20-30
   - Implement multi-stage builds
   - Enable BuildKit caching

3. **CI/CD Pipeline Consolidation**
   - Merge 212 workflows → 10-20
   - Implement change-based CI
   - Add merge queue support

### Phase 5: Legacy Migration (Week 11-12)
**Goal:** Clean up archived and deprecated code

1. **Archive Assessment**
   - Review `.archive/` contents
   - Extract reusable code
   - Document archived decisions

2. **JavaScript → TypeScript Migration**
   - Convert remaining `.js` files
   - Target files:
     - `server/src/graphql/resolvers.copilot.js`
     - `conductor-ui/frontend/src/maestro/main-maestro.js`

3. **Dependency Modernization**
   - Update deprecated packages
   - Remove unused dependencies
   - Run `pnpm audit fix`

---

## Migration Strategy

### Backward Compatibility

All changes must maintain:
1. **API Compatibility** - No breaking changes to GraphQL schema
2. **Import Paths** - Use `paths` aliases for migration
3. **CI/CD** - Keep old workflows until new ones are verified
4. **Golden Path** - `make bootstrap && make up && make smoke` must pass

### Migration Patterns

#### Pattern 1: Facade Migration
```typescript
// Old location: services/authz-gateway/src/auth.ts
// New location: services/auth/src/auth.ts

// Facade in old location:
// services/authz-gateway/src/auth.ts
export * from '@intelgraph/auth-service';
console.warn('DEPRECATED: Import from services/auth instead');
```

#### Pattern 2: Feature Flags
```typescript
// Use feature flags for gradual rollout
const useNewAuthService = process.env.USE_NEW_AUTH_SERVICE === 'true';

if (useNewAuthService) {
  return newAuthService.authenticate(token);
} else {
  return legacyAuthService.authenticate(token);
}
```

#### Pattern 3: Strangler Fig
```
Phase 1: New service shadows old service (read-only)
Phase 2: New service handles 10% traffic (canary)
Phase 3: New service handles 50% traffic (blue-green)
Phase 4: New service handles 100% traffic (cutover)
Phase 5: Old service deprecated and archived
```

### Rollback Plan

Each phase includes rollback procedures:
1. **Git tags** before major changes
2. **Feature flags** for instant rollback
3. **Database migrations** are reversible
4. **CI/CD** keeps old workflows for 30 days

---

## Risk Mitigation

### High Risk Items

| Risk | Mitigation | Owner |
|------|------------|-------|
| Breaking production | Feature flags, canary releases | Platform Team |
| Build system breakage | Parallel CI pipeline during migration | DevOps Team |
| Developer disruption | Clear communication, migration guides | Tech Lead |
| Data loss during consolidation | Database backups, audit logging | Data Team |

### Testing Strategy

1. **Unit Tests** - Must pass before merge
2. **Integration Tests** - Required for service changes
3. **Smoke Tests** - Golden path validation
4. **Load Tests** - Before service consolidation
5. **Chaos Tests** - After major migrations

### Communication Plan

- **Weekly updates** in #engineering channel
- **Migration guides** in docs/
- **Office hours** for questions
- **Runbook updates** for operations

---

## Success Metrics

### Build Performance

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Cold build time | 15-25 min | 5-8 min | CI pipeline duration |
| Cached build time | 3-8 min | <2 min | Turbo cache hit builds |
| `pnpm install` | 2-3 min | <1 min | Fresh install time |
| Test execution | 10-15 min | 3-5 min | Jest run duration |

### Maintainability

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Workspace count | 417 | 80-120 | `ls -la apps packages services | wc -l` |
| Service count | 194 | 30-50 | `ls services | wc -l` |
| CI workflow count | 212 | 10-20 | `ls .github/workflows | wc -l` |
| TODO/FIXME count | 366 | <100 | `grep -r "TODO\|FIXME" --include="*.ts" | wc -l` |

### Developer Experience

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Onboarding time | 2-3 days | <1 day | New dev survey |
| PR review cycle | 2-4 hours | <1 hour | GitHub metrics |
| Merge conflicts | High | Low | Git conflict frequency |
| Documentation accuracy | 70% | 95% | Doc audit score |

---

## Timeline

```
Week 1-2:   Phase 1 - Quick Wins
            ├── Expand TS project references
            ├── Consolidate Jest configs
            ├── Archive unused workspaces
            └── Optimize Turbo pipeline

Week 3-4:   Phase 2 - Taxonomy Enforcement
            ├── Define workspace categories
            ├── Relocate misplaced packages
            └── Introduce namespace scopes

Week 5-8:   Phase 3 - Service Consolidation
            ├── Auth service consolidation
            ├── Graph service consolidation
            ├── Ingestion pipeline consolidation
            └── General service audit

Week 9-10:  Phase 4 - Build System Modernization
            ├── Enable TypeScript strict mode
            ├── Optimize Docker builds
            └── CI/CD pipeline consolidation

Week 11-12: Phase 5 - Legacy Migration
            ├── Archive assessment
            ├── JavaScript → TypeScript migration
            └── Dependency modernization

Total Duration: 12 weeks (3 months)
```

---

## Related ADRs

The following Architecture Decision Records support this plan:

1. **[ADR-001: Workspace Taxonomy](./adr/ADR-001-workspace-taxonomy.md)** - Defines rules for apps/packages/services
2. **[ADR-002: Service Consolidation](./adr/ADR-002-service-consolidation.md)** - Strategy for reducing service count
3. **[ADR-003: Build Optimization](./adr/ADR-003-build-optimization.md)** - Turbo and TypeScript configuration
4. **[ADR-004: TypeScript Strict Mode](./adr/ADR-004-typescript-strict-mode.md)** - Migration to strict mode
5. **[ADR-005: CI/CD Consolidation](./adr/ADR-005-cicd-consolidation.md)** - Workflow rationalization

---

## Appendix

### A. Workspace Audit Results

Full audit available in `docs/architecture/WORKSPACE_AUDIT.md`

### B. Service Dependency Graph

Generated by `npx madge --image docs/architecture/service-deps.svg services/`

### C. Build Performance Baseline

Captured via:
```bash
# Cold build
time turbo run build --force

# Cached build
time turbo run build

# Test execution
time turbo run test
```

### D. Migration Checklist Template

```markdown
## Migration: [Service Name]

### Pre-Migration
- [ ] Backup database
- [ ] Document current API surface
- [ ] Identify dependent services
- [ ] Create rollback plan

### Migration
- [ ] Create new service structure
- [ ] Migrate core logic
- [ ] Update import paths
- [ ] Add deprecation warnings to old code

### Post-Migration
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Archive old code after 30 days
```

---

**Document Owner**: Architecture Team
**Review Cadence**: Bi-weekly during migration, quarterly thereafter
**Last Updated**: 2025-11-21
