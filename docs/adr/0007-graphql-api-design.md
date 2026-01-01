# ADR-0007: GraphQL API Design & Schema Strategy

**Date:** 2023-11-20
**Status:** Accepted
**Area:** API
**Owner:** API Platform Guild
**Tags:** graphql, api, schema, federation

## Context

Summit requires a flexible, type-safe API for multiple clients (web UI, mobile apps, CLI tools, integrations). The API must support:

- **Complex data fetching**: Clients need to fetch nested, related data (entities, relationships, evidence, timeline events) in a single request
- **Type safety**: Strong typing for both server and client code generation
- **Rapid iteration**: Frontend teams need to add fields without backend deployments
- **Multiple data sources**: Postgres, Neo4j, vector stores, external APIs, ML inference
- **Real-time updates**: Subscriptions for live data (presence, notifications, streaming results)
- **Performance**: Minimize over-fetching and under-fetching
- **Security**: Field-level authorization, query complexity limits, rate limiting

Traditional REST APIs struggle with:
- N+1 query problems and over-fetching
- Versioning complexity
- Rigid coupling between client needs and endpoint design
- Difficulty composing data from multiple sources

## Decision

We will use **GraphQL** as our primary API layer with a federated schema architecture.

### Core Decision
Adopt GraphQL with:
- **Apollo Server** for the gateway and subgraph servers
- **Schema Federation v2** for composing multiple subgraphs
- **Code-first schema** using TypeScript and type-graphql
- **DataLoader** for batching and caching
- **Persisted queries** for production clients

### Key Components
- **Apollo Gateway**: Federated schema composition and query planning
- **Subgraphs**: Domain-specific GraphQL services (entities, graph, intelligence, analytics)
- **Schema Registry**: Centralized schema versioning and validation
- **GraphQL Code Generator**: Auto-generate TypeScript types for client and server
- **Apollo Studio**: Schema exploration, query analytics, performance monitoring

### Implementation Details
- Use schema federation to decompose the API into domain subgraphs
- Implement DataLoader pattern for efficient batching (prevents N+1)
- Enforce query complexity limits (max depth: 10, max complexity: 5000)
- Use persisted queries in production (whitelist approach)
- Enable field-level authorization via custom directives
- Implement query cost analysis for rate limiting
- Support both query polling and subscriptions for real-time data

## Alternatives Considered

### Alternative 1: REST API with OpenAPI
- **Description:** Traditional REST API with OpenAPI/Swagger specs
- **Pros:**
  - Well-understood industry standard
  - Broad tooling support
  - Simple caching (HTTP-level)
  - Easier rate limiting per endpoint
- **Cons:**
  - Over-fetching/under-fetching requires multiple round trips
  - Versioning complexity (/v1, /v2, breaking changes)
  - Rigid endpoint design couples backend and frontend
  - Difficult to compose data from multiple services
  - No built-in type safety across client/server
- **Cost/Complexity:** Lower initial complexity, higher long-term maintenance

### Alternative 2: gRPC with Protobuf
- **Description:** High-performance RPC with protocol buffers
- **Pros:**
  - Strong typing via protobuf
  - High performance (binary protocol)
  - Efficient streaming
  - Code generation for multiple languages
- **Cons:**
  - Not browser-native (requires grpc-web proxy)
  - Rigid schemas (versioning challenges)
  - Less flexible than GraphQL for varied client needs
  - Steeper learning curve for frontend developers
  - Poor fit for public-facing APIs
- **Cost/Complexity:** High performance, poor developer experience for web clients

### Alternative 3: tRPC
- **Description:** TypeScript-first RPC framework with end-to-end type safety
- **Pros:**
  - Excellent TypeScript integration
  - Minimal boilerplate
  - Type inference across client/server
  - Good DX for full-stack TypeScript
- **Cons:**
  - TypeScript-only (no multi-language clients)
  - Less mature ecosystem than GraphQL
  - No native federation/composition
  - Limited to request/response (no declarative queries)
- **Cost/Complexity:** Great for TypeScript monorepos, limited flexibility

## Consequences

### Positive
- Clients fetch exactly the data they need in a single request (eliminates over/under-fetching)
- Strong typing via GraphQL schema enables code generation and IntelliSense
- Federation allows teams to own their domain subgraphs independently
- DataLoader pattern eliminates N+1 queries automatically
- Subscriptions provide real-time updates without polling
- Introspection enables excellent developer tooling (GraphiQL, Apollo Studio)
- Schema evolution via additive changes (no versioning)

### Negative
- Learning curve for developers unfamiliar with GraphQL
- Query complexity analysis required to prevent DoS
- Caching more complex than REST (field-level vs. URL-based)
- Debugging can be harder (single endpoint, nested resolvers)
- Monitoring requires specialized tooling (Apollo Studio)
- Over-fetching still possible with poorly designed queries

### Neutral
- Need to design schema carefully (graph thinking vs. REST endpoints)
- Subscriptions require WebSocket infrastructure
- Federation introduces distributed schema management

### Operational Impact
- **Monitoring**: Track resolver performance, query complexity, cache hit rates
- **Performance**: Implement DataLoader, optimize N+1 queries, tune batching
- **Security**: Enforce query complexity limits, persisted queries, field-level auth
- **Compliance**: Log all queries for audit trail, redact sensitive fields in logs

## Code References

### Core Implementation
- `gateway/supergraph/supergraph.graphql` - Federated supergraph schema composition
- `server/src/app.ts:L200-L250` - Apollo Server initialization and middleware
- `apps/api/schema.graphql` - Main API schema (legacy monolith)
- `apps/intelgraph-api/schema/base.graphql` - IntelGraph federated subgraph

### Schema Definitions
- `server/src/graphql/schema/graphrag.graphql` - GraphRAG queries and mutations
- `server/src/graphql/schema/risk.graphql` - Risk assessment schema
- `server/src/graphql/schema/watchlists.graphql` - Watchlist management
- `server/src/schema/ai.graphql` - AI/ML inference schema
- `graphql/schema/mc-admin.graphql` - Multi-cloud admin operations

### Resolvers
- `server/src/graphql/resolvers/` - GraphQL resolver implementations
- `server/src/graphql/dataloaders/` - DataLoader batching implementations
- `server/src/graphql/directives/` - Custom directives (@auth, @cost, @tenant)

### Client Integration
- `client/schema.graphql` - Client-side schema (generated from server)
- `client/src/graphql/queries/` - Client query definitions
- `client/src/generated/graphql.ts` - Auto-generated TypeScript types

## Tests & Validation

### Unit Tests
- `tests/unit/graphql/resolvers.test.ts` - Resolver logic correctness
- `tests/unit/graphql/dataloaders.test.ts` - DataLoader batching validation
- Expected coverage: 90%+

### Integration Tests
- `tests/integration/graphql/queries.test.ts` - End-to-end query execution
- `tests/integration/graphql/subscriptions.test.ts` - Real-time subscription tests
- `tests/integration/graphql/federation.test.ts` - Subgraph composition validation

### Schema Tests
- `tests/schema/breaking-changes.test.ts` - Detect breaking schema changes
- `tests/schema/field-coverage.test.ts` - Ensure all types are resolvable
- GraphQL schema linting via `@graphql-eslint`

### Performance Tests
- `tests/perf/graphql/query-complexity.test.ts` - Complexity analysis validation
- `tests/perf/graphql/dataloader.test.ts` - N+1 prevention verification
- Target: p95 query latency <200ms for typical queries

### Evaluation Criteria
- Query complexity limits prevent DoS (max depth: 10, max cost: 5000)
- DataLoader reduces database queries by 80%+ for nested fetches
- Schema coverage: all domain entities accessible via GraphQL

### CI Enforcement
- `.github/workflows/graphql-schema.yml` - Schema validation and breaking change detection
- `.github/workflows/codegen.yml` - Auto-generate TypeScript types on schema changes
- Pre-commit hooks enforce GraphQL query linting

## Migration & Rollout

### Migration Steps
1. **Phase 1 - Gateway Setup (Weeks 1-2)**
   - Deploy Apollo Gateway with initial subgraphs
   - Set up schema registry and CI validation
   - Configure monitoring and query analytics

2. **Phase 2 - Schema Migration (Weeks 3-6)**
   - Port existing REST endpoints to GraphQL resolvers
   - Implement DataLoader for all relationship fetches
   - Create federated subgraphs by domain (entities, graph, analytics)

3. **Phase 3 - Client Migration (Weeks 7-10)**
   - Generate TypeScript types from schema
   - Migrate frontend queries from REST to GraphQL
   - Implement subscriptions for real-time features

4. **Phase 4 - Production Optimization (Weeks 11-12)**
   - Enable persisted queries for production
   - Tune query complexity limits and caching
   - Optimize slow resolvers and N+1 queries

### Rollback Plan
- Feature flags control GraphQL vs. REST routing per query type
- REST endpoints remain available during transition
- GraphQL Gateway can be disabled without data loss
- Schema changes are additive (backward compatible)

### Timeline
- Phase 1: Gateway Setup (Q4 2023)
- Phase 2: Schema Migration (Q1 2024)
- Phase 3: Client Migration (Q1-Q2 2024)
- Completion: REST deprecation (Q3 2024)

## References

### Related ADRs
- ADR-0006: Neo4j as Primary Graph Store (graph queries via GraphQL)
- ADR-0012: Copilot GraphRAG Architecture (GraphQL schema for copilot queries)
- ADR-0002: ABAC Step-Up Auth (field-level auth via GraphQL directives)

### External Resources
- [GraphQL Specification](https://spec.graphql.org/)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Production Ready GraphQL](https://book.productionreadygraphql.com/)

### Discussion
- [RFC-0018: GraphQL API Design](internal-link)
- [Design Doc: Schema Federation Strategy](internal-link)
- [ADR Review: GraphQL vs REST Trade-offs](internal-link)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2023-11-20 | API Platform Guild | Initial version |
| 2024-02-15 | API Platform Guild | Updated with federation patterns |
| 2024-06-01 | API Platform Guild | Added persisted queries guidance |
