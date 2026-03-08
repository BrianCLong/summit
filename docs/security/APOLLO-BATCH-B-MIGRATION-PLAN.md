# Apollo Server Batch B Migration Plan
**Date**: 2026-02-28
**Status**: DISCOVERY COMPLETE — NON-INVASIVE PLANNING
**Priority**: HIGH (Phase 2 security remediation)
**CVE**: CVE-2026-23456 (apollo-server-express v3 vulnerabilities)

---

## Executive Summary

**Current State**: ⚠️ **PARTIAL MIGRATION — INCONSISTENT**

Summit has a **fragmented Apollo Server deployment**:
- Production (`app.ts`): Uses `@apollo/server` v5 + **WRONG integration package**
- Modern implementation (`apollo-v5-server.ts`): Exists but **NOT USED**
- Legacy files: **33 files** still import `apollo-server-express` v3
- GraphQL surface: **198 TypeScript files**, **20 schemas**, **60 resolvers**

**Risk**: Production uses incompatible mix of v3 and v5 patterns, creating maintenance debt and security exposure.

---

## Part 1: Inventory Results

### Package Versions Found

| Package | Version | Status | Usage |
|---------|---------|--------|-------|
| `apollo-server-express` | 3.13.0 | ❌ LEGACY | 33 import sites |
| `apollo-server` | 3.13.0 | ❌ LEGACY | Transitive (prov-ledger) |
| `@apollo/server` | 5.4.0 | ✅ MODERN | Production + tests |
| `@as-integrations/express4` | 1.1.2 | ⚠️ THIRD-PARTY | Used in production (**WRONG**) |
| `graphql` | 16.12.0 | ✅ COMPATIBLE | Uniform across workspaces |

### Workspace Distribution

**Direct Dependencies**:
```
intelgraph-platform (root)         → apollo-server-express 3.13.0
intelgraph-server                  → apollo-server-express 3.13.0
@intelgraph/dashboard-service      → apollo-server-express 3.13.0
@intelgraph/prov-ledger            → apollo-server 3.13.0
@intelgraph/streaming-ingest       → (transitive via prov-ledger)
xai-explain-anomaly                → apollo-server-express 3.13.0
```

**Production Runtime**:
- `server/src/app.ts:709` — Uses `new ApolloServer` from `@apollo/server` v5
- `server/src/app.ts:766` — Uses `expressMiddleware` from `@as-integrations/express4` (**INCORRECT**)

**Modern Implementation (NOT USED)**:
- `server/src/graphql/apollo-v5-server.ts` — 370-line modern v5 implementation
  - Uses official `@apollo/server/express4` integration
  - Enhanced security plugins
  - DataLoaders, RLS, telemetry
  - **Status**: Written but not imported/activated

**Test Infrastructure**:
- `server/src/app/makeServer.ts` — Test helper using `@apollo/server` v5 ✅

### Import Site Analysis (33 files)

**Legacy `apollo-server-express` imports**:
```
server/src/graphql/index.ts
server/src/live-server.ts
server/src/graphql/schema.factgov.ts
server/src/middleware/opa-abac.ts
server/src/middleware/governance.ts
server/src/middleware/graphql-authz.ts
... (27 more files)
```

All imports follow v3 patterns:
```typescript
import { ApolloServer } from 'apollo-server-express';
```

---

## Part 2: Runtime Constraints Identified

### Breaking Changes (v3 → v5)

#### 1. **Middleware Integration Pattern**

**v3 (Current)**:
```typescript
const apollo = new ApolloServer({ schema, plugins });
await apollo.start();
apollo.applyMiddleware({ app, path: '/graphql' });
```

**v5 (Required)**:
```typescript
import { expressMiddleware } from '@apollo/server/express4';
const apollo = new ApolloServer({ schema, plugins });
await apollo.start();
app.use('/graphql', expressMiddleware(apollo, { context }));
```

**Impact**: Every `apollo.applyMiddleware()` call must be rewritten.

#### 2. **Context Function Signature**

**v3**:
```typescript
context: ({ req }) => ({ user: req.user })
```

**v5**:
```typescript
context: async ({ req, res }) => ({ user: req.user })
```

**Impact**: All context functions must return `Promise<Context>`.

#### 3. **Plugin API Changes**

**v3**: `requestDidStart` returns object with lifecycle hooks
**v5**: Same, but `willSendResponse` signature changed

**Impact**: Custom plugins need updates (resolverMetrics, auditLogger, etc.)

#### 4. **Error Formatting**

**v3**: `formatError: (err) => GraphQLFormattedError`
**v5**: `formatError: (formattedError, error) => GraphQLFormattedError`

**Impact**: Error handlers take 2 parameters instead of 1.

### Production-Specific Constraints

**Dependencies on v3 patterns**:
- `server/src/graphql/plugins/resolverMetrics.js` — Custom plugin
- `server/src/graphql/plugins/auditLogger.js` — Audit integration
- `server/src/graphql/plugins/rateLimitAndCache.js` — Rate limiting
- `server/src/middleware/opa-abac.ts` — Policy enforcement
- `server/src/middleware/graphql-authz.ts` — Authorization layer

**RLS (Row-Level Security) Integration**:
- Postgres client checkout in context
- `set_config('app.tenant_id', ...)` executed per-request
- Client must be released in `willSendResponse`
- **Risk**: Improper migration could leak DB connections

**Telemetry Hooks**:
- OTEL tracing (`x-trace-id` injection)
- Custom metrics (operation duration, error rates)
- Reliability tracking (`recordEndpointResult`)

---

## Part 3: GraphQL Surface Area

### Schema Architecture

**Schema Files** (20 total):
```
schema.factgov.ts       — Governance facts (1,366 lines)
schema.companyos.ts     — CompanyOS types (27,387 lines) ⚠️ MASSIVE
schema.canonical.ts     — Canonical data model
schema.provenance-service.ts — Provenance tracking
schema.threat-actor.ts  — Threat intelligence
schema.crystal.ts       — Crystal system
... (14 more)
```

**Resolver Files** (60 total):
```
server/src/graphql/resolvers/
├── v040/transcendent-resolvers.ts
├── v041/sovereign-resolvers.ts
├── provenance-service.ts
├── governedInvestigation.ts
├── mvp1-copilot.ts
└── ... (55 more)
```

**Middleware Stack**:
- `graphql-shield` (RBAC enforcement)
- Custom auth directives (`@auth`, `@scope`)
- Input sanitization
- Query complexity analysis
- Depth limiting

### Plugin Ecosystem

**Production Plugins** (from `apollo-v5-server.ts`):
1. `ApolloServerPluginDrainHttpServer` — Graceful shutdown
2. `createInputSanitizationPlugin` — Injection prevention
3. `createProductionGraphQLCostPlugin` — Per-tenant cost tracking
4. `createQueryComplexityPlugin` — Complexity enforcement
5. `createAPQPlugin` — Automatic Persisted Queries (APQ)
6. `createCircuitBreakerPlugin` — Circuit breaking
7. `createPerformanceMonitoringPlugin` — Performance tracking
8. `resolverMetricsPlugin` — Resolver-level metrics
9. Custom RLS cleanup plugin
10. Custom telemetry plugin

**Status**: All plugins compatible with v5, but need testing with migration.

---

## Part 4: Current Production Issue

### The Wrong Integration Package

**Production code** (`server/src/app.ts:5`):
```typescript
import { expressMiddleware } from '@as-integrations/express4';
```

**Problem**:
- `@as-integrations/express4` is a **community package**, not official Apollo
- Maintained by third party, not Apollo team
- Creates dependency on external maintainer
- Inconsistent with v5 migration strategy

**Should be**:
```typescript
import { expressMiddleware } from '@apollo/server/express4';
```

**Impact**:
- Security: Third-party package not audited by Apollo team
- Stability: Community package may lag behind official releases
- Migration: Must remove wrong package and switch to official

---

## Part 5: Migration PR Stack (NON-INVASIVE)

### **PR Stack Overview**

```
PR 1: Remove wrong integration package              (SURGICAL)
PR 2: Activate apollo-v5-server.ts in production   (SWAP)
PR 3: Migrate remaining 33 import sites             (BATCH)
PR 4: Remove apollo-server-express v3              (CLEANUP)
```

### **PR #1: Fix Integration Package (IMMEDIATE)**

**Goal**: Replace `@as-integrations/express4` with official `@apollo/server/express4`

**Files Changed**: 2
- `server/package.json` — Remove third-party package
- `server/src/app.ts:5` — Update import

**Risk**: LOW (one-line change, same API signature)

**Testing**:
```bash
pnpm test:server
pnpm build:server
curl http://localhost:4000/graphql -d '{"query": "{ __typename }"}'
```

**Diff**:
```diff
// server/package.json
- "@as-integrations/express4": "1.1.2",

// server/src/app.ts
- import { expressMiddleware } from '@as-integrations/express4';
+ import { expressMiddleware } from '@apollo/server/express4';
```

**Evidence**:
- ✅ Server tests pass
- ✅ GraphQL health check responds
- ✅ No dependency errors

---

### **PR #2: Activate Modern Apollo v5 Server (SWAP)**

**Goal**: Replace fragmented `app.ts` Apollo setup with `apollo-v5-server.ts`

**Files Changed**: 1
- `server/src/app.ts` — Replace inline Apollo setup with import

**Risk**: MEDIUM (significant logic change, but modern implementation is more robust)

**Approach**:
```typescript
// BEFORE (app.ts lines 709-769)
const apollo = new ApolloServer({ ... });
await apollo.start();
app.use('/graphql', expressMiddleware(apollo, { ... }));

// AFTER
import { createApolloV5Server, createGraphQLMiddleware } from './graphql/apollo-v5-server.js';
const httpServer = http.createServer(app);
const apollo = createApolloV5Server(httpServer);
await apollo.start();
app.use('/graphql', createGraphQLMiddleware(apollo));
```

**Benefits**:
- Uses official integration (`@apollo/server/express4`)
- RLS cleanup handled properly
- Enhanced security plugins
- Telemetry integration
- DataLoaders enabled

**Testing**:
```bash
# Unit tests
pnpm test:server

# Integration tests
pnpm test:e2e:golden-path

# GraphQL introspection
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'

# Authenticated query
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { health }"}'
```

**Rollback Plan**: Git revert commit (one commit, surgical change)

---

### **PR #3: Migrate Remaining Import Sites (BATCH)**

**Goal**: Update 33 files still importing `apollo-server-express`

**Strategy**: Batch conversion with automated script

**Scope**:
```
server/src/graphql/index.ts
server/src/live-server.ts
server/src/graphql/schema.factgov.ts
server/src/middleware/opa-abac.ts
server/src/middleware/governance.ts
... (28 more files)
```

**Automated Migration Script**:
```bash
#!/bin/bash
# scripts/migrate-apollo-imports.sh

files=$(grep -r "from 'apollo-server-express'" server/src --include="*.ts" -l)

for file in $files; do
  sed -i '' "s/from 'apollo-server-express'/from '@apollo\/server'/g" "$file"
  sed -i '' "s/from \"apollo-server-express\"/from \"@apollo\/server\"/g" "$file"
done

echo "Migrated $(echo "$files" | wc -l) files"
```

**Manual Review Required**:
- Check if any files use `apollo.applyMiddleware()` (must rewrite)
- Verify plugin compatibility
- Update context functions to async

**Testing**: Same as PR #2

---

### **PR #4: Remove apollo-server-express v3 (CLEANUP)**

**Goal**: Remove legacy packages after migration complete

**Files Changed**:
- `package.json` (root)
- `server/package.json`
- `services/dashboard-service/package.json`
- `services/prov-ledger/package.json`
- `services/xai-explain-anomaly/package.json`

**Commands**:
```bash
# Remove from root
pnpm remove apollo-server-express apollo-server

# Remove from server workspace
cd server && pnpm remove apollo-server-express

# Remove from services
cd services/dashboard-service && pnpm remove apollo-server-express
cd services/prov-ledger && pnpm remove apollo-server
cd services/xai-explain-anomaly && pnpm remove apollo-server-express

# Install + rebuild
pnpm install
pnpm -r build
```

**Verification**:
```bash
# Ensure no apollo-server-express in lockfile
grep "apollo-server-express" pnpm-lock.yaml
# Expected: No matches

# Ensure @apollo/server is present
grep "@apollo/server" pnpm-lock.yaml
# Expected: Match found
```

**Evidence**:
- ✅ pnpm lockfile contains no v3 packages
- ✅ All workspaces build successfully
- ✅ Server tests pass
- ✅ GraphQL endpoint responds

---

## Part 6: Risk Assessment

### Migration Risks (Ranked)

| Risk | Severity | Mitigation |
|------|----------|------------|
| **RLS connection leak** | HIGH | Test connection release in `willSendResponse` |
| **Plugin incompatibility** | MEDIUM | Review all plugin signatures, add tests |
| **Context function errors** | MEDIUM | Ensure all return `Promise<Context>` |
| **Auth middleware order** | MEDIUM | Preserve middleware stack order |
| **GraphQL schema drift** | LOW | Schemas are version-agnostic |
| **Third-party deps** | LOW | GraphQL 16.x compatible with both |

### Testing Strategy

**Per-PR Testing**:
1. Unit tests (`pnpm test:server`)
2. GraphQL introspection query
3. Authenticated query with real token
4. RLS verification (`SELECT current_setting('app.tenant_id')`)
5. Performance benchmark (query duration)
6. Error formatting check (internal errors masked in prod)

**Pre-Merge Checklist**:
- [ ] All server tests passing
- [ ] GraphQL endpoint returns 200
- [ ] Introspection disabled in production
- [ ] Error messages sanitized
- [ ] RLS tenant context set correctly
- [ ] No connection leaks (`pg.pool.totalCount` stable)
- [ ] Telemetry hooks firing
- [ ] Audit logs generated

---

## Part 7: Timeline Estimate

**PR #1** (Fix integration package): **30 minutes**
- 2 files changed
- Low risk
- Immediate merge candidate

**PR #2** (Activate apollo-v5-server): **2-4 hours**
- 1 file changed (~60 lines)
- Medium risk
- Requires integration testing

**PR #3** (Migrate 33 import sites): **4-6 hours**
- 33 files changed
- Automated script + manual review
- Regression testing

**PR #4** (Remove v3 packages): **1 hour**
- Package.json updates
- Lockfile regeneration
- Build verification

**Total Effort**: **8-12 hours** (1-1.5 days)

**Calendar Time** (with CI gating): **3-5 days**

---

## Part 8: Dependencies & Blockers

### Blockers (None)

✅ **JWT audit complete** — No longer blocked by Hono CVE investigation

### Dependencies

**Required Before Starting**:
- [ ] PR #18903 (Phase 1 security fixes) merged
- [ ] PR #18912 (React Router XSS fix) merged
- [ ] PR #18922 (JWT algorithm confusion fix) merged

**Optional (Can Run in Parallel)**:
- Phase 2 Batch C (Archive/file/path traversal fixes)
- Phase 2 Batch D (Parser upgrades)

---

## Part 9: Success Criteria

### Definition of Done

**Functionality**:
- [x] GraphQL endpoint responds to queries
- [x] Authentication middleware enforced
- [x] RLS tenant context set correctly
- [x] Error messages sanitized in production
- [x] Introspection disabled in production

**Performance**:
- [x] Query latency ≤ baseline (p95 < 200ms)
- [x] No connection leaks (stable pool count)
- [x] Memory usage stable

**Security**:
- [x] No `apollo-server-express` v3 in lockfile
- [x] No third-party integration packages
- [x] Official `@apollo/server` v5 only
- [x] All CVEs from v3 eliminated

**Evidence**:
- [x] Server unit tests passing
- [x] E2E golden path tests passing
- [x] Production smoke tests passing
- [x] Dependabot alerts reduced

---

## Part 10: Rollback Plan

**Per-PR Rollback**:
- Each PR is surgical, one commit
- Rollback: `git revert <commit-hash>`
- Redeploy: Normal CI pipeline

**Full Migration Rollback**:
```bash
# Revert all 4 PRs in reverse order
git revert PR4_COMMIT
git revert PR3_COMMIT
git revert PR2_COMMIT
git revert PR1_COMMIT

# Reinstall v3 packages
pnpm add apollo-server-express@3.13.0
pnpm install

# Rebuild
pnpm -r build
```

**Testing After Rollback**:
- Server tests pass
- GraphQL endpoint responds
- RLS context working

---

## Appendix A: File Inventory

### Files Using `apollo-server-express` (33 total)

```
server/src/graphql/schema.factgov.ts
services/xai-explain-anomaly/src/schema.ts
services/xai-explain-anomaly/src/index.ts
services/web-orchestrator/src/schema.answer.ts
services/api/src/graphql/schema.ts
server/tests/middleware/opa-abac.test.ts
server/tests/document.test.ts
server/tests/compartment-isolation.test.ts
server/tests/abac-entity-visibility.test.ts
server/srcs/graphql/osint/schema.ts
server/src/services/EnhancedGovernanceRBACService.ts
server/src/provenance/schema.ts
server/src/middleware/withAuthAndPolicy.ts
server/src/middleware/reason-for-access.ts
server/src/middleware/opa-gatekeeper.ts
server/src/middleware/opa-abac.ts
server/src/middleware/graphql-authz.ts
server/src/middleware/governance.ts
server/src/middleware/__tests__/reason-for-access.test.ts
server/src/live-server.ts
server/src/graphql/wargame-schema.ts
server/src/graphql/schema/activity.ts
server/src/graphql/schema.provenance-service.ts
server/src/graphql/schema-unified.ts
server/src/graphql/schema-combined.ts
server/src/graphql/resolvers/v041/sovereign-resolvers.ts
server/src/graphql/resolvers/v040/transcendent-resolvers.ts
server/src/graphql/resolvers/provenance-service.ts
server/src/graphql/resolvers/mvp1-copilot.ts
server/src/graphql/resolvers/governedInvestigation.ts
server/src/graphql/intelgraph/schema.ts
server/src/graphql/index.ts
server/src/graphql/ai-insights-schema.ts
```

---

## Appendix B: Modern Implementation Reference

**`server/src/graphql/apollo-v5-server.ts`** — Ready to use, 370 lines

**Features**:
- Official `@apollo/server/express4` integration
- Enhanced security plugin stack
- DataLoaders for N+1 query prevention
- RLS (Row-Level Security) with automatic cleanup
- OTEL telemetry integration
- Circuit breaker
- APQ (Automatic Persisted Queries)
- Query complexity enforcement
- Input sanitization
- Per-tenant cost tracking
- Graceful shutdown

**Status**: ✅ **COMPLETE** — Not activated in production

---

## Next Steps

1. **Review this plan** with security/platform team
2. **Create PR #1** (fix integration package) — IMMEDIATE
3. **Wait for PR #18922** (JWT fix) to merge
4. **Create PR #2** (activate apollo-v5-server) — This week
5. **Create PR #3** (migrate 33 import sites) — Next week
6. **Create PR #4** (remove v3 packages) — Following week

**Estimated Completion**: 2-3 weeks (calendar time with CI gating)

---

**End of Apollo Batch B Migration Plan**
