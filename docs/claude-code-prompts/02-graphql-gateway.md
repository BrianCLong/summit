# Prompt 2: GraphQL Gateway (Apollo) + Contracts

## Role
Graph/API Engineer

## Context
The API gateway fronts multiple data sources:
- **Neo4j**: Graph operations (entities, relationships)
- **PostgreSQL**: Metadata and relational data
- **Redis**: Caching layer

The gateway must support high-performance reads and writes while maintaining strict SLOs.

## Task
Implement an Apollo Server (TypeScript) with:

1. **GraphQL SDL** for canonical entities:
   - `Person`
   - `Entity`
   - `Event`
   - `Source`
   - `Relationship`

2. **Core Features**:
   - Persisted queries for security and performance
   - ABAC (Attribute-Based Access Control) hooks
   - Data source integrations (Neo4j, Postgres, Redis)
   - Cursor-based pagination
   - Response caching strategy
   - Backpressure handling

## Guardrails (SLOs)

### Performance Targets
- **Reads**:
  - p95 ≤ 350 ms
  - p99 ≤ 900 ms
- **Writes**:
  - p95 ≤ 700 ms
  - p99 ≤ 1.5 s

### Security
- All mutations require authentication
- ABAC policy enforcement via OPA integration
- Input validation on all mutations

## Deliverables

### 1. API Gateway Implementation
- [ ] `api-gateway/` service with Apollo Server setup
- [ ] GraphQL SDL schema files defining all types
- [ ] Resolver skeleton for all queries and mutations
- [ ] Data source implementations:
  - [ ] Neo4j data source
  - [ ] PostgreSQL data source
  - [ ] Redis cache layer
- [ ] Persisted query map and generation script
- [ ] Caching strategy implementation (Redis + Apollo cache)
- [ ] Cursor-based pagination helpers
- [ ] Backpressure middleware

### 2. Testing
- [ ] Jest unit tests for resolvers
- [ ] Contract tests for GraphQL schema
- [ ] Example queries and mutations with expected responses
- [ ] Load testing script (k6) to validate SLOs

### 3. Documentation
- [ ] API documentation (SDL + examples)
- [ ] Data source integration guide
- [ ] Caching strategy documentation
- [ ] Performance tuning notes

## Acceptance Criteria
- ✅ `pnpm test` runs all tests successfully
- ✅ k6 smoke test shows p95 read latency < 350 ms
- ✅ k6 smoke test shows p95 write latency < 700 ms
- ✅ Persisted queries compile and validate
- ✅ ABAC hooks integrate with OPA policies
- ✅ All SDL validates with no schema errors

## Example Schema Structure

```graphql
type Person {
  id: ID!
  name: String!
  aliases: [String!]
  relationships: [Relationship!]!
  metadata: JSON
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Entity {
  id: ID!
  type: EntityType!
  name: String!
  attributes: JSON
  relationships: [Relationship!]!
  sources: [Source!]!
  provenance: Provenance!
}

type Relationship {
  id: ID!
  type: RelationType!
  source: Entity!
  target: Entity!
  confidence: Float
  metadata: JSON
  provenance: Provenance!
}

type Query {
  entity(id: ID!): Entity
  entities(filter: EntityFilter, pagination: CursorPagination): EntityConnection!
  relationship(id: ID!): Relationship
  searchEntities(query: String!, limit: Int): [Entity!]!
}

type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
  updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
  deleteEntity(id: ID!): Boolean!
  createRelationship(input: CreateRelationshipInput!): Relationship!
}
```

## Related Files
- `/home/user/summit/packages/graphql/` - Existing GraphQL schemas
- `/home/user/summit/services/api/` - API service implementations
- `/home/user/summit/docs/api.graphql.md` - GraphQL API documentation

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 2: GraphQL Gateway implementation"

# Or use the slash command (if configured)
/graphql-gateway
```

## Notes
- Align with existing GraphQL patterns in the codebase
- Use Apollo Server 4+ features (standalone server)
- Implement OpenTelemetry instrumentation for SLO tracking
- Follow GraphQL best practices for schema design
