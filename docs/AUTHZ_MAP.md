# Summit Authorization Architecture Map

## EXECUTIVE SUMMARY

Summit has a **partially implemented** enterprise spine with JWT auth, OIDC, OPA-based authorization, and multi-tenancy groundwork. The mission is to **complete and harden** tenant isolation, enforce defense-in-depth authz checks, and add comprehensive regression testing.

---

## 1. ENTRYPOINTS (API Edge)

### CompanyOS API
- **Location**: `/companyos/services/companyos-api/`
- **Auth**: OPA-based authorization middleware
- **Endpoint**: `http://companyos-opa:8181/v1/data/companyos/authz/customer/decision`
- **Context**: `authContext.ts` extracts tenant from headers/JWT
- **Status**: ✅ OPA integrated | ⚠️ Tenant enforcement incomplete

### IntelGraph API (GraphQL)
- **Location**: `/apps/intelgraph-api/`, `/server/src/lib/auth.ts`
- **Auth**: GraphQL directives `@auth`, `@scope`, `@rateLimit`
- **Context**: `getContext()` extracts JWT → `{ userId, email, role, tenantId }`
- **Status**: ✅ Directives exist | ⚠️ Not applied uniformly

### IntelGraph REST API
- **Location**: `/services/api/src/middleware/auth.ts`
- **Auth**: OIDC token verification (JWKS-RSA)
- **Headers**: `Authorization: Bearer <jwt>`, `X-Tenant-ID`, `X-User-ID`, `X-User-Roles`
- **Status**: ✅ OIDC verified | ⚠️ Tenant propagation gaps

### Switchboard Ingestion
- **Location**: `/apps/switchboard-web/`, `/apps/gateway/`
- **Auth**: BullMQ queue + auth middleware on gateway routes
- **Status**: ⚠️ **GAP**: No explicit tenant attribution in ingestion flow

### Maestro Orchestration API
- **Location**: `/server/src/middleware/maestro-authz.ts`
- **Auth**: OPA policy engine (`maestro/authz`)
- **Context**: Builds `requestContext` with `tenantId`, `principal`, `traceId`
- **Status**: ✅ OPA enforced | ⚠️ Downstream enforcement gaps

---

## 2. SERVICE ACTIONS (Authorization Points)

### Maestro Workflow Execution
- **File**: `/server/src/middleware/maestro-authz.ts:33-112`
- **Flow**:
  1. Extract `requestContext` (tenant, user, role, trace)
  2. Map HTTP method → action (GET=read, POST=create, etc.)
  3. Call OPA: `POST /v1/data/maestro/authz`
  4. Return 403 on deny
- **Decision Structure**: `{ allow, reason, dataFilters, conditions, tags }`
- **Status**: ✅ **GOOD** - PEP enforced with OPA PDP

### IntelGraph Persistence (Neo4j)
- **Queries**: Active Measures Engine uses Neo4j sessions
- **Pattern**: `MATCH (s:Signal) WHERE s.tenant_id = $tenantId`
- **Status**: ⚠️ **GAP**: Tenant filtering not uniform across all Cypher queries

### IntelGraph Query API
- **GraphQL Resolvers**: Use `@auth` directive for field-level protection
- **Example**: `@auth(roles: ["ADMIN"], permissions: ["entity:read"])`
- **Permission Cache**: Redis `user:permissions:${userId}` (15-min TTL)
- **Status**: ⚠️ **GAP**: Directives not enforced on all sensitive fields

### Switchboard Data Ingestion
- **Queue**: BullMQ for report generation
- **Status**: ⚠️ **GAP**: No tenant context in queue jobs; no provenance tracking

---

## 3. DATA LAYER (Storage & Isolation)

### PostgreSQL - Auth Tables

| Table | Tenant Column | Constraints | Status |
|-------|---------------|-------------|--------|
| `users` | `id` (base) | None | ⚠️ No tenant_id |
| `tenants` | `id` (PK) | Unique name | ✅ Core table |
| `user_tenants` | `tenant_id` (FK) | Multi-tenant membership | ✅ Junction table |
| `roles` | `tenant_id` | System roles tenant_id nullable | ✅ Tenant-scoped |
| `user_roles` | `tenant_id` | FK to roles + tenants | ✅ Tenant-scoped |
| `user_sessions` | ❌ | None | ⚠️ **GAP** |
| `token_blacklist` | ❌ | None | ⚠️ **GAP** |
| `role_assignment_audits` | `tenant_id` | FK to tenants | ✅ Audit trail |

**Migrations**:
- **024_auth_tenancy.ts**: Added `tenants`, `user_tenants`, backfilled 'global' tenant
- **028_user_role_management.ts**: Added `roles`, `user_roles`, audit triggers

### PostgreSQL - Application Tables
- **Status**: ⚠️ **GAP**: Most app tables (reports, investigations, etc.) lack `tenant_id`
- **Required**: Audit all tables and add `tenant_id` + indexes + NOT NULL constraints

### Neo4j - Graph Data
- **Signal Nodes**: `s.tenant_id` property exists in some queries
- **Status**: ⚠️ **GAP**: No schema-level tenant isolation; no indexes on `tenant_id`
- **Risk**: Cross-tenant reads possible if query doesn't filter by tenant

### Redis Cache
- **Token Blacklist**: `blacklist:${token}` (no tenant scoping)
- **Permissions**: `user:permissions:${userId}` (global, not tenant-scoped)
- **Status**: ⚠️ **GAP**: Cache keys don't include tenant_id (cache poisoning risk)

---

## 4. INTER-SERVICE PROPAGATION

### HTTP Header Propagation

| Header | Source | Destination | Status |
|--------|--------|-------------|--------|
| `Authorization: Bearer <jwt>` | Client | All services | ✅ Propagated |
| `X-Tenant-ID` | JWT/header | Downstream | ⚠️ Partial |
| `X-User-ID` | JWT | Downstream | ⚠️ Partial |
| `X-User-Roles` | JWT/header | OPA | ⚠️ Partial |
| `X-Trace-ID` | Generated/header | All services | ✅ Propagated |
| `X-Request-ID` | Generated | All services | ✅ Propagated |

**Chain**: Client → Gateway → CompanyOS → Maestro → IntelGraph

### Service-to-Service Auth
- **Pattern**: mTLS with SPIFFE certificates
- **File**: `/services/auth-gateway/src/auth/service-authenticator.ts`
- **Format**: `spiffe://mesh.summit.internal/ns/<namespace>/sa/<service>`
- **Status**: ✅ **GOOD** - Certificate validation enforced

### Queue Jobs (BullMQ)
- **Context**: No explicit tenant context in job data
- **Status**: ⚠️ **GAP**: Jobs can't enforce tenant isolation

---

## 5. AUTHORIZATION POLICY ENGINE (OPA)

### Policy Endpoints

| Policy Path | Purpose | Input | Output |
|-------------|---------|-------|--------|
| `maestro/authz` | Maestro action authz | `{tenantId, userId, role, action, resource}` | `{allow, reason}` |
| `conductor/tenant_isolation` | Tenant boundary enforcement | Context + resource | Allow/deny |
| `conductor/data_access` | Data access policies | User + data classification | Allow/deny + filters |
| `conductor/cross_tenant` | Cross-tenant ops | Source/target tenants | Allow/deny |
| `companyos/authz/customer/decision` | CompanyOS API authz | Customer context | Allow/deny |

### Policy Decision Structure
```typescript
{
  allow: boolean,
  reason: string,
  reasons: string[],
  attrsUsed: string[],
  policyBundleVersion: string,
  conditions: string[],
  tags: string[],
  dataFilters?: {
    tenantScope: string[],
    fieldMask?: string[],
    rowLevelFilters?: Record<string, unknown>
  }
}
```

### Status
- ✅ OPA integrated at CompanyOS, Maestro
- ⚠️ **GAP**: OPA not called at IntelGraph data layer (defense in depth missing)
- ⚠️ **GAP**: No OPA enforcement in Switchboard ingestion

---

## 6. AUDIT & COMPLIANCE

### Audit System
- **File**: `/server/src/audit/advanced-audit-system.ts`
- **Events**: Auth success/failure, authz decisions, policy violations, token revocation, role changes
- **Audit Table**: `role_assignment_audits` (trigger-based)
- **Status**: ✅ Audit system exists | ⚠️ Not comprehensive for all actions

### RFA (Request For Action)
- **Policy**: `/ci/policies/audit.rego`
- **Enforcement**: Privileged routes must have `auditRfaMiddleware`
- **Status**: ⚠️ **GAP**: Not enforced in CI

### Missing Audit Events
- ❌ Data ingestion (Switchboard)
- ❌ Graph query (IntelGraph reads)
- ❌ Cross-tenant access attempts (denied reads)
- ❌ Workflow execution (Maestro runs)
- ❌ Admin actions (tenant creation, user invites)

---

## 7. CRITICAL GAPS SUMMARY

### 🔴 **HIGH SEVERITY**

1. **Incomplete Tenant Isolation in Data Layer**
   - Most tables lack `tenant_id` column
   - Neo4j queries don't uniformly filter by `tenant_id`
   - Risk: Cross-tenant data access via direct queries

2. **No Defense-in-Depth at Repository Layer**
   - No "tenant guard" at ORM/repository level
   - Queries don't require `tenant_id` parameter
   - Risk: Bypassing API-layer checks via service calls

3. **Cache Poisoning Risk**
   - Redis keys not tenant-scoped (`user:permissions:${userId}`)
   - Risk: User in Tenant A sees cached data from Tenant B

4. **Switchboard Ingestion Lacks Tenant Attribution**
   - No tenant context in BullMQ jobs
   - No provenance tracking (who ingested what for which tenant)
   - Risk: Data attribution ambiguity, compliance failure

### 🟡 **MEDIUM SEVERITY**

5. **Incomplete Audit Trail**
   - Missing audit for: ingestion, reads, workflow runs, admin actions
   - No correlation IDs in all audit events

6. **Inconsistent Header Propagation**
   - `X-Tenant-ID` not always propagated CompanyOS → Maestro → IntelGraph
   - Risk: Downstream services operate without tenant context

7. **No CI Regression Tests for Tenant Isolation**
   - No integration test suite validating cross-tenant access is blocked

### 🟢 **LOW SEVERITY**

8. **GraphQL Directive Coverage Gaps**
   - Not all sensitive fields have `@auth` directives

9. **Session/Token Tables Lack Tenant Scoping**
   - `user_sessions`, `token_blacklist` don't have `tenant_id`

---

## 8. RECOMMENDED PR SERIES (TAILORED)

### **PR-1: Repository Layer Tenant Guard + Test Helpers**
**Scope**: Enforce tenant_id required at data access layer
- Add `TenantContext` interface (tenant_id, subject_id, trace_id)
- Create repository base class requiring tenant context
- Add test helpers: `createTenantContext()`, `mockAuthContext()`
- Add integration tests: attempt cross-tenant read → must fail

**Files**:
- `server/src/repositories/base.repository.ts` (new)
- `server/src/test/helpers/tenant-context.ts` (new)
- `server/src/test/integration/tenant-isolation.test.ts` (new)

---

### **PR-2: PostgreSQL Schema - tenant_id Rollout**
**Scope**: Add `tenant_id` to all application tables
- Add `tenant_id` to: `user_sessions`, `token_blacklist`, reports, investigations, etc.
- Add NOT NULL constraints + foreign keys to `tenants.id`
- Create indexes: `(tenant_id, id)` for all tables
- Add migration + backfill strategy (default to 'global' tenant)
- Add DB trigger preventing updates that change `tenant_id`

**Files**:
- `server/src/migrations/030_tenant_id_rollout.ts` (new)
- Update all entity classes with `@Column() tenant_id`

---

### **PR-3: Neo4j Tenant Isolation + Cypher Query Audit**
**Scope**: Ensure all Neo4j queries filter by `tenant_id`
- Add `tenant_id` property to all node types (Signal, Entity, etc.)
- Create constraint: `:TenantBoundary` label on all nodes
- Audit all Cypher queries and add `WHERE n.tenant_id = $tenantId`
- Add Neo4j session wrapper requiring tenant context
- Add integration tests: create nodes in tenant A, query in tenant B → empty result

**Files**:
- `active-measures-module/src/core/ActiveMeasuresEngine.ts`
- `server/src/neo4j/tenant-session-wrapper.ts` (new)
- `server/src/test/integration/neo4j-tenant-isolation.test.ts` (new)

---

### **PR-4: Tenant-Scoped Cache Keys (Redis)**
**Scope**: Prevent cache poisoning attacks
- Change cache key format: `tenant:${tenantId}:user:permissions:${userId}`
- Update all cache read/write/invalidate operations
- Add cache isolation tests: set key in tenant A, read in tenant B → miss

**Files**:
- `services/api/src/middleware/auth.ts` (lines 70-78)
- `server/src/cache/tenant-cache.ts` (new wrapper)

---

### **PR-5: Switchboard Tenant Attribution + Provenance**
**Scope**: Add tenant context to ingestion pipeline
- Add `tenant_id` + `ingested_by` to BullMQ job data
- Add provenance table: `data_provenance` (source, tenant_id, timestamp, user_id)
- Ensure Switchboard API extracts tenant from auth context
- Add audit event: `data.ingested` with tenant/user/source

**Files**:
- `apps/switchboard-web/` - API endpoints
- `apps/gateway/src/routes/` - Queue job creation
- `server/src/migrations/031_data_provenance.ts` (new)

---

### **PR-6: Comprehensive Audit Logging**
**Scope**: Complete audit trail for all sensitive actions
- Add audit events:
  - `workflow.executed` (Maestro runs)
  - `graph.queried` (IntelGraph sensitive reads)
  - `data.ingested` (Switchboard)
  - `admin.action` (tenant/user management)
  - `authz.denied` (cross-tenant access attempts)
- Ensure all events include: `tenant_id`, `subject_id`, `trace_id`, `request_id`
- Add audit query API for compliance reporting

**Files**:
- `server/src/audit/advanced-audit-system.ts` (extend)
- Add audit event emitters in all sensitive code paths

---

### **PR-7: Cross-Service Header Propagation (Defense in Depth)**
**Scope**: Ensure tenant context propagates end-to-end
- Add HTTP client interceptor: auto-attach `X-Tenant-ID`, `X-Trace-ID`
- Add OPA check at IntelGraph data layer (defense in depth)
- Add middleware assertion: reject requests missing `X-Tenant-ID`

**Files**:
- `server/src/lib/http-client.ts` (new interceptor)
- `apps/intelgraph-api/src/middleware/tenant-assertion.ts` (new)

---

### **PR-8: CI Gate - Tenant Isolation Regression Suite**
**Scope**: Prevent future regressions
- Add integration test suite:
  1. Create tenant A + tenant B
  2. Ingest data in tenant A
  3. Attempt read/write from tenant B → 403
  4. Validate audit trail shows denied access
- Add to CI: Must pass on every PR to main
- Add to pre-commit hook

**Files**:
- `.maestro/tests/integration/tenant-isolation.test.ts` (extend existing)
- `.github/workflows/tenant-isolation-gate.yml` (new)

---

## 9. DEFINITION OF DONE

- [ ] All PostgreSQL tables have `tenant_id` column + index
- [ ] All Neo4j queries filter by `tenant_id`
- [ ] All cache keys include `tenant_id`
- [ ] All BullMQ jobs include `tenant_id`
- [ ] All HTTP requests propagate `X-Tenant-ID` header
- [ ] Repository layer rejects queries without tenant context
- [ ] OPA enforced at API edge + service layer (defense in depth)
- [ ] Audit events emitted for all sensitive actions
- [ ] CI gate blocks PRs that fail tenant isolation tests
- [ ] No `SELECT * FROM <table>` without `WHERE tenant_id = $1`

---

## APPENDIX: Key Files Reference

### Authentication Core
- `/server/src/lib/auth.ts` - JWT logic, token generation, context extraction
- `/server/src/services/AuthService.ts` - Login, registration, token refresh, revocation
- `/services/api/src/middleware/auth.ts` - OIDC verification, permission mapping
- `/services/auth-gateway/src/auth/service-authenticator.ts` - mTLS/SPIFFE validation

### Authorization & OPA
- `/server/src/middleware/maestro-authz.ts` - Maestro OPA integration
- `/server/src/conductor/governance/opa-integration.ts` - OPA client, policy evaluation
- `/companyos/services/companyos-api/src/authz/opa-client.ts` - CompanyOS OPA client
- `/graphql/directives/auth.ts` - GraphQL field-level authz

### Database
- `/server/src/migrations/024_auth_tenancy.ts` - Tenant tables
- `/server/src/migrations/028_user_role_management.ts` - Roles + audit
- `/server/src/db/postgres.ts` - Connection pool
- `/server/src/security/permissions.ts` - Role-permission mappings

### Audit & Compliance
- `/server/src/audit/advanced-audit-system.ts` - Audit event system
- `/.ci/policies/audit.rego` - Audit policy enforcement
