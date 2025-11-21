# Summit/IntelGraph Codebase Research Summary
## Data Trading Marketplace Design Foundations

**Date**: 2025-11-21  
**Focus**: Service architecture patterns, GraphQL schemas, database patterns, and authorization mechanisms

---

## 1. Current Service Architecture Patterns

### Service Structure
- **Framework**: Express.js for REST APIs, Apollo Server for GraphQL
- **Architecture**: Microservices with pnpm workspace
- **Language**: TypeScript (strict: false for gradual migration)
- **Port Convention**: Services use environment-configurable ports (e.g., CATALOG_SERVICE_PORT)

### Catalog Service Pattern (Most Relevant)
Located in `services/catalog-service/`:

```typescript
// Route structure
- GET  /api/v1/catalog/assets
- POST /api/v1/catalog/assets
- PATCH /api/v1/catalog/assets/:id
- DELETE /api/v1/catalog/assets/:id
- POST /api/v1/catalog/assets/:id/tags
- PATCH /api/v1/catalog/assets/:id/owner
- POST /api/v1/catalog/assets/:id/deprecate
- GET /api/v1/catalog/assets/:id/relationships
- POST /api/v1/catalog/relationships
```

### Key Middleware Stack
- **Helmet**: Security headers
- **CORS**: Cross-origin handling
- **Compression**: Response compression
- **Express Validator**: Input validation
- **Zod**: Schema validation
- **Error Handler**: Centralized error handling

### Resolver Pattern
```typescript
// Controllers + Routes pattern
controller.method(req, res) -> router.get/post/patch/delete -> error handler
```

---

## 2. GraphQL Schema Patterns

### Current Schema Structure (`services/api/src/graphql/schema.ts`)

**Core Types**:
- `Entity` - Intelligence data with tenantId, provenance tracking
- `Relationship` - Connections between entities with confidence scoring
- `Source` - Provenance and data lineage
- `Investigation` - Investigation management with access control
- `User` - User and permission management
- `CentralityMetrics` & `ClusteringMetrics` - Analytics

**Key Fields in Entity**:
```graphql
type Entity {
  id: ID!
  type: EntityType!
  name: String!
  description: String
  properties: JSON
  confidence: Float!
  createdAt: DateTime!
  updatedAt: DateTime!
  validFrom: DateTime
  validTo: DateTime
  tenantId: String!           # Multi-tenant isolation
  sources: [Source!]!          # Provenance
  createdBy: User!             # Attribution
  outgoingRelationships: [Relationship!]!
  incomingRelationships: [Relationship!]!
  centrality: CentralityMetrics
}
```

### Existing Marketplace Schema
Located in `packages/marketplace/schema.graphql`:
```graphql
type Extension {
  id: ID!
  name: String!
  description: String
  pluginType: String!
  version: String!
  endpoint: String!
  price: Float!
}

query: extensions(pluginType: String): [Extension!]!
mutation: installExtension(input: InstallExtensionInput!): Boolean!
```

**Observation**: Minimal marketplace schema exists - opportunity for expansion to include:
- Pricing models
- Listing status
- Usage metrics
- Reviews/ratings
- Version history

---

## 3. Authentication & Authorization Patterns

### Authentication Layers

**1. OIDC/JWT Verification** (`services/api/src/middleware/auth.ts`)
```typescript
- JWKS client for token verification
- RS256 algorithm signature
- Token expiration checks
- Token blacklist in Redis
- User lookup from PostgreSQL

// JWT Payload
interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  tenant_id?: string;
  role?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}
```

**2. Role-Based Access Control (RBAC)**

Base roles with built-in permissions:
- **viewer**: entity:read, relationship:read, investigation:read, copilot:query
- **analyst**: viewer + create/update permissions
- **investigator**: analyst + analytics:export, data:export
- **supervisor**: investigator + delete permissions, audit:read, user:read
- **admin**: *:* (all permissions)

**3. Attribute-Based Access Control (ABAC)**

Located in `services/api/src/graphql/abac.ts`:
```typescript
interface OPADecision {
  allow: boolean;
  fields: string[];      // Field-level filtering
  reason?: string;
}

export function withABAC<TArgs>(resolver: Function, action = 'read') {
  // Calls OPA (Open Policy Agent) for policy decisions
  // Filters result fields based on allowed_fields
  // Returns filtered response
}
```

**OPA Integration**:
- External policy engine at OPA_URL (default: http://opa:8181)
- Policy endpoint: `/v1/data/intelgraph/authz`
- Input parameters: user.role, action, resource.sensitivity

### Permission Caching
- Redis cache: `user:permissions:{userId}` with 15-minute TTL
- Wildcard permission support: "entity:*" matches "entity:read"
- Claim mapping from OIDC token

---

## 4. Database Patterns

### Neo4j (Graph Database)
Location: `services/api/src/db/neo4j.ts`

**Connection Management**:
- Connection pooling: max 50 connections
- Connection lifetime: 30 minutes
- Auto-retry on failure

**Key Constraints & Indexes**:
```cypher
CREATE CONSTRAINT entity_id_unique FOR (e:Entity) REQUIRE e.id IS UNIQUE
CREATE CONSTRAINT entity_tenant_isolation FOR (e:Entity) REQUIRE (e.id, e.tenantId) IS UNIQUE
CREATE INDEX entity_type_idx FOR (e:Entity) ON (e.type)
CREATE INDEX entity_tenant_idx FOR (e:Entity) ON (e.tenantId)
CREATE FULLTEXT INDEX entity_search_idx FOR (e:Entity) ON EACH [e.name, e.description]
```

**Specialized Methods**:
- `findShortestPath(sourceId, targetId, tenantId, maxDepth, relationshipTypes)`
- `findNeighbors(entityId, tenantId, depth, direction)`
- `calculateCentrality(entityIds, tenantId, algorithm)` - requires APOC

**Tenant Isolation**: Enforced at Neo4j query level via tenantId parameter

### PostgreSQL (Relational Database)
Location: `services/api/src/db/postgres.ts`

**Configuration**:
- Connection pool: max 20 clients
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds
- SSL in production only

**Query Features**:
- Slow query logging (>1000ms)
- Transaction support with ACID guarantees
- Error handling with parameter masking
- Prepared statements for SQL injection prevention

**Key Tables** (from schema references):
- users (with external_id, email, tenant_id, role, is_active, last_active_at)
- audit logs
- investigation metadata
- investigation assignments

### Redis (Cache & Pub/Sub)
Location: `services/api/src/db/redis.ts`

**Multi-client Architecture**:
- Main client for caching
- Separate subscriber for pub/sub
- Separate publisher for pub/sub
- Key prefix: `intelgraph:` (configurable)

**Advanced Features**:
- TTL caching: `cacheWithTTL(key, fetcher, ttlSeconds)`
- Hash operations for complex objects
- Distributed locking: `acquireLock(key, ttlSeconds)` / `releaseLock(key, lockId)`
- Analytics result caching: `cacheAnalyticsResult(algorithm, parameters, result, tenantId, ttlHours)`

**Pub/Sub Pattern**:
- `subscribe(channels, callback)` - Listen for messages
- `publish(channel, message)` - Publish messages
- Used for real-time updates across clients

---

## 5. GraphQL Context & Resolver Patterns

### Context Object
Located in `services/api/src/graphql/context.ts`:

```typescript
interface GraphQLContext {
  req: Request;
  res: Response;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
  tenant?: {
    id: string;
    name: string;
    settings: Record<string, any>;
  };
  dataSources: {
    neo4j: typeof neo4jDriver;
    postgres: typeof postgresPool;
    redis: typeof redisClient;
  };
  logger: typeof logger;
  requestId: string;
  startTime: number;
}
```

### Resolver Structure
```typescript
export const resolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Query: {
    // Individual resolver modules merged
    ...entityResolvers.Query,
    ...relationshipResolvers.Query,
    ...investigationResolvers.Query,
    // High-value queries wrapped with ABAC
    entity: withABAC(entityResolvers.Query.entity, 'read'),
  },
  Mutation: { /* ... */ }
}
```

---

## 6. Tenant Isolation & Multi-tenancy

### Isolation Mechanisms
1. **Database-level**: tenantId field on all major entities
2. **Application-level**: User.tenantId verified in auth middleware
3. **Cache-level**: Redis keys prefixed with tenant context
4. **Graph-level**: Neo4j queries filter by tenantId
5. **WebSocket**: Rooms scoped to `tenant:{tenantId}`

### Patterns
- Investigations scoped to tenant
- Entities/Relationships tagged with tenantId
- Source records tagged with tenantId
- Audit logging includes tenantId

---

## 7. Audit & Provenance Patterns

### Audit Logging
Located in `services/api/src/middleware/auditLog.ts`:
```typescript
auditLog(req, action: string, details?: any)
// Automatically logs:
// - auth.success / auth.failed
// - authz.allow / authz.deny
// - Entity/Relationship create/update/delete
// - Permission changes
```

### Provenance Tracking
Located in `services/prov-ledger/`:
- Dedicated FastAPI service for provenance ledger
- Stores claims and evidence chain
- Used for investigation attestation

**Entity Provenance Fields**:
- `sources: [Source!]!` - Data lineage
- `createdBy: User!` - Attribution
- `createdAt / updatedAt` - Temporal tracking
- `validFrom / validTo` - Temporal validity

---

## 8. Real-time Collaboration Patterns

### WebSocket Integration
Located in `services/api/src/realtime/socket.ts`:

**Features**:
- User presence tracking: `presence:{tenantId}:{userId}`
- Entity locking: prevents concurrent edits
- Graph update caching: `cacheGraphUpdate(data, userId, tenantId)`
- Cursor/selection sharing among analysts
- Tenant-scoped broadcasts: `socket.to(tenant:{tenantId})`

**Events**:
- `entity:locked` / `entity:unlocked`
- `user:connected` / `user:disconnected`
- `graph:updated`
- `user:selection` (cursor sharing)

---

## 9. Cost & Analytics Patterns

### Cost Estimation
Located in `services/api/src/utils/cost.ts`:
```typescript
estimateCost(prompt: string) {
  // Analyzes query complexity:
  // - hops (graph depth)
  // - allPaths (complexity multiplier)
  // - filters (optimization bonus)
  // - community detection
  // Returns: { score: number, factors: Record }
}
```

### Analytics Caching
- Result caching by algorithm & parameters
- TTL configurable by hours
- Hash-based cache keys from parameters

---

## 10. Existing Marketplace Infrastructure

### Files & Components
1. **GraphQL Schema**: `packages/marketplace/schema.graphql`
   - Minimal Extension type (plugin marketplace focus)
   - Basic query and mutation stubs
   
2. **Client UI**: `client/src/features/marketplace/`
   - `PaymentsPanel.tsx` - Stub component
   - Not fully implemented

3. **CI/CD**: `.github/workflows/marketplace-ga-ci.yml`
   - Basic Node.js lint/test workflow
   - Container image: node:18
   - No network access in tests

4. **Monitoring**: `monitoring/dashboards/marketplace_sla.json`
   - SLA dashboard exists
   - Metrics for marketplace health

### Related Services
- **billing** service: `/home/user/summit/services/billing/` (minimal - only metrics.ts)
- **prov-ledger**: Transaction audit trail capability
- **audit_svc**: Event logging infrastructure

---

## 11. Key Insights for Data Trading Marketplace

### Strengths to Leverage
1. **Multi-tenant architecture**: Easily supports multiple data providers
2. **ABAC + RBAC**: Fine-grained access control for data sharing
3. **Audit trail**: Complete provenance and audit logging
4. **Real-time collab**: WebSocket infrastructure for live updates
5. **Neo4j**: Perfect for relationship-heavy data (supplier chains, data flows)
6. **Redis**: Efficient caching for marketplace operations, distributed locking for transactions
7. **Horizontal scaling**: Microservice design with stateless services

### Existing Patterns to Adopt
1. **Controller + Routes pattern** for REST endpoints
2. **ABAC wrapper pattern** for fine-grained GraphQL access control
3. **Context object pattern** for passing auth/tenant context
4. **Singleton instance pattern** for database connections
5. **Error handler middleware pattern** for consistency
6. **Audit logging pattern** for compliance

### Data Structures to Model
1. **DataAsset** - Marketplace item (similar to Entity with marketplace metadata)
2. **Transaction** - Trade event with provenance
3. **DataProvider** - Seller profile with credentials
4. **AccessGrant** - Time-limited data access permissions
5. **Pricing** - Variable pricing models (per-use, subscription, custom)
6. **Listing** - Public marketplace catalog entry

### Authorization Patterns Needed
1. Provider-owned asset permissions (RBAC)
2. Buyer access revocation (temporal permissions)
3. Data residency policy enforcement (OPA policies)
4. Revenue split auditing (audit logs)
5. Terms of service enforcement (ABAC)

---

## 12. Recommended Technology Stack Alignment

| Component | Pattern | Implementation |
|-----------|---------|-----------------|
| **Data Model** | Property graph | Neo4j + PostgreSQL |
| **API** | GraphQL + REST | Apollo Server + Express |
| **Auth** | OIDC/JWT + RBAC + ABAC | Existing auth.ts + OPA |
| **Caching** | Multi-level | Redis (distributed + local) |
| **Real-time** | Pub/Sub | Redis + WebSocket |
| **Audit** | Immutable ledger | prov-ledger service |
| **Transactions** | ACID + Event sourcing | PostgreSQL + audit logs |
| **Rate Limiting** | Token bucket | Redis |
| **Notifications** | Event-driven | Kafka/Redpanda (if available) |

---

## 13. Critical Files & Locations

### Must Study
- `/home/user/summit/services/api/src/middleware/auth.ts` - Auth patterns
- `/home/user/summit/services/api/src/graphql/abac.ts` - ABAC patterns
- `/home/user/summit/services/api/src/graphql/context.ts` - Context creation
- `/home/user/summit/services/api/src/db/` - Database patterns
- `/home/user/summit/services/catalog-service/` - REST API patterns
- `/home/user/summit/services/prov-ledger/` - Audit/ledger patterns

### Build Upon
- `packages/marketplace/schema.graphql` - Extend with marketplace types
- `services/billing/metrics.ts` - Add transaction tracking
- Existing resolver patterns for CRUD operations

---

## 14. Gaps to Address

1. **No payment processor integration** - Need Stripe/PayPal integration
2. **No marketplace listing management** - Can build from catalog patterns
3. **No user ratings/reviews** - New feature to add
4. **No data validation/quality metrics** - Can extend Entity metadata
5. **No usage metering** - Need analytics service extension
6. **No contract management** - Can leverage audit logging
7. **Minimal billing service** - Needs expansion for marketplace

