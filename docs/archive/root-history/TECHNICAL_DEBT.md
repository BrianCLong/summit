# Technical Debt Analysis - December 7, 2025

## Overview

Analysis of TODO/FIXME/HACK/XXX comments in codebase (excluding venv and node_modules).

## Summary Statistics

- **Total TODOs found**: 50+ in project code
- **Category breakdown**:
  - GraphQL schema reactivation: 8 instances
  - Missing implementations: 12 instances
  - Navigation/UI completion: 10 instances
  - Test robustness: 4 instances
  - Integration TODOs: 16 instances

## Critical TODOs (High Priority)

### 1. GraphQL Schema Missing

**Impact**: Multiple features disabled due to missing/unavailable GraphQL schema

**Files affected**:

- `client/src/components/dashboard/LiveActivityFeed.tsx:24,108,119`
- `client/src/components/dashboard/StatsOverview.tsx:5`
- `client/src/hooks/usePrefetch.ts:3,16,29,43`

**Comment pattern**:

```typescript
// TODO: Re-enable GraphQL subscription when schema is available
// TODO: Re-enable GraphQL query when schema is available
```

**Action needed**:

- Restore GraphQL schema definitions
- Re-enable subscriptions and queries
- Test live activity feed functionality
- Verify stats overview data fetching

**Estimated effort**: 2-3 days

---

### 2. Stub Service Implementations

**Impact**: Core services return mock data instead of real functionality

**Files**:

- `api/search.js:6` - "TODO: call Typesense search; for now, return empty"
- `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts:150` - "TODO: Integrate with actual Neo4j sandbox connection"
- `server/src/copilot/orchestrator.enhanced.js:227-246` - Multiple service stubs (Neo4j, analytics, summarization, enrichment)
- `server/src/copilot/orchestrator.js:19` - "TODO: call existing service/repo; here we simulate"

**Action needed**:

- Implement Typesense integration for search
- Connect NL-to-Cypher service to Neo4j
- Wire up copilot orchestrator to real services
- Remove simulation/stub code

**Estimated effort**: 5-7 days

---

### 3. Missing Metrics Tracking

**Impact**: Performance and reliability metrics not collected

**Files**:

- `src/build-cache/CacheManager.ts:222` - "hitRate: 0, // TODO: Track hit rate"
- `server/src/middleware/opa-enforcer.ts:414` - "cacheHitRate: 0 // TODO: Track cache hits/misses"
- `server/src/middleware/idempotency.ts:397` - "errorRate: 0 // TODO: Track error rate in metrics"

**Action needed**:

- Implement cache hit rate tracking
- Add OPA policy cache metrics
- Track idempotency error rates
- Set up dashboards for metrics

**Estimated effort**: 2-3 days

---

## Medium Priority TODOs

### 4. Navigation and UI Completion

**Impact**: User experience incomplete for certain workflows

**Files**:

- `client/src/pages/Search/components/ResultList.tsx:219,265`
- `client/src/pages/Hunting/HuntList.tsx:441,510`
- `client/src/pages/IOC/IOCList.tsx:520,585,636`
- `client/src/components/IntelGraphWorkbench.tsx:601,642`

**TODOs**:

- Navigate to detail pages (search results, hunts, IOCs)
- Filter by tag functionality
- Create hunt logic
- Add/import IOC logic
- Show tooltips on hover

**Estimated effort**: 3-4 days

---

### 5. Test Coverage Gaps

**Impact**: Tests not robust enough for production confidence

**Files**:

- `tests/e2e/maestro-api-ui-flow.spec.ts:46,56` - More robust status/listing checks needed
- `tests/unit/graphql_schema.test.ts:47` - Need specific field type/argument/directive tests
- `tests/chaos/lease_drop.test.ts:41` - Implement actual API calls for state verification
- `sprint-kits/proof-first-core-ga/tests/cypress/time_to_path.cy.ts:8` - Assert timer budget

**Action needed**:

- Enhance E2E test assertions
- Add GraphQL schema validation tests
- Implement chaos testing for task leases
- Establish performance baselines

**Estimated effort**: 4-5 days

---

### 6. Security and Auth Improvements

**Impact**: Security implementations incomplete

**Files**:

- `gateway/src/index.ts:42,47,53,58` - Admin-only checks and actual export/delete logic needed
- `server/src/middleware/opa-abac.ts:156` - "TODO: Implement proper OIDC validation with issuer verification"
- `server/src/middleware/opa-abac.ts:295` - "TODO: Detect mutation vs query" for operation typing

**Action needed**:

- Implement admin authorization checks
- Add proper OIDC issuer verification
- Detect GraphQL operation types (query/mutation)
- Complete export/delete functionality

**Estimated effort**: 3-4 days

---

## Low Priority TODOs

### 7. Feature Enhancements

**Files**:

- `client/src/components/IntelGraphWorkbench.tsx:307` - Implement layout algorithms (dagre, radial)
- `client/src/components/graph/InteractiveGraphExplorer.jsx:466` - Highlight cluster nodes
- `server/src/services/MultimodalDataService.js:710` - Add relationship search
- `server/src/conductor/steps/embedUpsert.ts:25` - Call Python/HTTP embedding generator
- `server/src/conductor/steps/cleanroomAggregate.ts:4` - Apply per-metric DP noise
- `server/src/conductor/router/router-v2.ts:713` - Implement based on routing history

**Estimated effort**: 6-8 days (can be spread across sprints)

---

## Deprecated/Commented TODOs

### Old TODOs (Already Resolved)

These appear to be old TODOs that were commented out but left in the code:

- `gateway/src/index.ts` - Multiple "// Old: // TODO:" comments
- `client/src/components/ErrorBoundary.tsx:5` - "// Old: // TODO: wire to your telemetry"
- `server/server.ts:15` - "// Old: // TODO: ping DB/queue"

**Action**: Clean up these commented-out TODOs during next refactoring pass.

---

## Recommendation by Week

### Week 2 Focus (December 14-20)

1. **Fix test suite failures** (from current test run)
2. **Restore GraphQL schema** - Unblocks 8 disabled features
3. **Implement cache/metrics tracking** - Observability baseline

### Week 3 Focus (December 21-27)

1. **Wire up stub services** - Search, NL-to-Cypher, Copilot
2. **Complete navigation flows** - Detail pages, filtering
3. **Add OIDC validation** - Security hardening

### Week 4+ Focus (January 2026)

1. **Enhance test robustness** - E2E assertions, chaos testing
2. **Feature completions** - Layout algorithms, embedding generation
3. **Code cleanup** - Remove old commented TODOs

---

## Dependency Updates Needed

From pnpm install output, 45 deprecated subdependencies found:

**Critical**:

- `apollo-server-express@3.13.0` - End of life, migrate to `@apollo/server`
- `@playwright/test@1.40.1` - Update to 1.57.0 (security patches)
- `supertest@6.3.3/6.3.4` - Update to latest
- `puppeteer@22.15.0` - Update or remove if unused

**Medium priority**:

- `@opentelemetry/*` packages - Multiple version conflicts (1.5.0 → 1.9.0)
- `eslint@8.57.1` - Update to ESLint 9
- `glob@7.2.3/8.1.0` - Update to glob 10+
- `inflight@1.0.6` - Deprecated, use built-in Promise patterns

**Action**: Create `DEPENDENCY_UPDATES.md` with migration plan

---

## Metrics

- **Total project TODOs**: 50+
- **Critical**: 3 categories (GraphQL, Stubs, Metrics)
- **Medium**: 3 categories (Navigation, Tests, Security)
- **Low**: 1 category (Enhancements)
- **Deprecated dependencies**: 45
- **Estimated total effort**: 25-35 days

---

_Generated by Claude Code on 2025-12-07_
_Analysis excludes vendor code (venv, node_modules)_
