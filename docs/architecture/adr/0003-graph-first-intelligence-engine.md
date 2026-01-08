# ADR-0003: Graph-First Intelligence Engine with Neo4j

**Date:** 2024-01-15
**Status:** Accepted
**Area:** Data
**Owner:** Data Platform Guild
**Tags:** neo4j, graph, cypher, intelligence, entity-resolution, provenance

## Context

Summit/IntelGraph is an intelligence analysis platform where relationship discovery is the core value proposition. Analysts need to:

- **Traverse networks**: Find connections N-hops deep between entities (people, organizations, events)
- **Pattern matching**: Identify fraud rings, influence networks, suspicious transaction patterns
- **Temporal reasoning**: Understand how relationships evolve over time
- **Provenance tracking**: Maintain chain-of-custody for evidence and derived insights
- **Policy enforcement**: Apply compartmentalization and authority rules to graph access

Traditional relational databases struggle with these requirements:

1. **Deep traversals**: SQL JOINs become exponentially complex and slow beyond 3-4 hops
2. **Schema rigidity**: Intelligence data has heterogeneous, evolving entity types
3. **Performance**: Join-heavy queries degrade as relationship density increases
4. **Query expressiveness**: Natural language questions like "who is connected to X via Y within 3 hops?" map poorly to SQL

Performance requirements:

- p95 query latency <500ms for typical 3-hop traversals
- 1000+ concurrent queries per second
- Support for graphs with 10M+ nodes and 100M+ relationships
- Real-time updates (entities visible within 1 second of creation)

## Decision

### Core Decision

We adopt a **graph-first architecture** with **Neo4j** as the primary graph store, implementing a **canonical data model** with 21 entity types, 30 relationship types, mandatory policy labels, and bitemporal support.

### Key Components

- **Neo4j 5.x Community/Enterprise**: Native property graph database with ACID guarantees
- **APOC + GDS Libraries**: Graph algorithms (PageRank, community detection, shortest path)
- **Canonical Model**: Standardized entity/relationship types with policy labels
- **Bitemporal Fields**: `validFrom/To` (business time) and `observedAt/recordedAt` (system time)
- **Provenance Chain**: Immutable audit trail for all data transformations
- **Outbox Sync**: Postgres -> Neo4j synchronization via outbox pattern

### Implementation Details

**Entity Types** (21 total):

```
Person, Organization, Asset, Account, Location, Event, Document,
Communication, Device, Vehicle, Infrastructure, FinancialInstrument,
Indicator, Claim, Case, Narrative, Campaign, InfrastructureService,
Sensor, Runbook, Authority, License
```

**Relationship Types** (30 total):

- Structure: `CONNECTED_TO, OWNS, WORKS_FOR, LOCATED_AT, MEMBER_OF, MANAGES, REPORTS_TO`
- Network: `COMMUNICATES_WITH, TRANSACTED_WITH, SIMILAR_TO, RELATED_TO`
- Hierarchy: `SUBSIDIARY_OF, PARTNER_OF, COMPETITOR_OF`
- Evidence: `SUPPORTS, CONTRADICTS, DERIVED_FROM, CITES`
- Authority: `AUTHORIZED_BY, GOVERNED_BY, REQUIRES`
- Temporal: `PRECEDES, FOLLOWS, CONCURRENT_WITH`

**Mandatory Policy Labels** (7 fields on every node/relationship):

```typescript
interface PolicyLabels {
  origin: string; // Source attribution
  sensitivity: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET";
  clearance: "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET";
  legalBasis: string; // Legal authority (required if sensitivity > INTERNAL)
  needToKnow: string[]; // Compartmentation tags
  purposeLimitation: string[]; // Allowable purposes
  retentionClass: "TRANSIENT" | "SHORT" | "MEDIUM" | "LONG" | "PERMANENT";
}
```

**Bitemporal Support**:

```typescript
interface BitemporalFields {
  validFrom: DateTime; // When fact became true
  validTo: DateTime; // When fact ceased being true
  observedAt: DateTime; // When we learned about it
  recordedAt: DateTime; // When we recorded it
}
```

## Alternatives Considered

### Alternative 1: PostgreSQL with Recursive CTEs

- **Description:** Use Postgres as graph database with recursive queries and adjacency lists
- **Pros:**
  - Single database technology (Postgres already in stack)
  - Familiar SQL syntax
  - Strong ACID guarantees
  - Lower operational complexity
- **Cons:**
  - Recursive CTEs extremely slow for deep traversals (>3 hops)
  - No native graph algorithms (must implement PageRank, etc.)
  - Poor performance on complex graph patterns
  - Schema rigidity requires migration for new entity types
- **Cost/Complexity:** Lower cost, inadequate performance for graph workloads

### Alternative 2: Amazon Neptune

- **Description:** AWS-managed graph database supporting Gremlin and openCypher
- **Pros:**
  - Fully managed service
  - Built-in AWS integration
  - Supports property graph and RDF
  - No operational overhead
- **Cons:**
  - OpenCypher support limited vs Neo4j
  - Less mature graph algorithms library
  - Vendor lock-in to AWS
  - Higher cost at scale (~$2000/month baseline)
  - Limited query optimization control
- **Cost/Complexity:** Higher cost, vendor dependency

### Alternative 3: TigerGraph

- **Description:** Distributed native graph database with GSQL
- **Pros:**
  - High performance for large-scale graphs
  - Distributed architecture
  - Strong real-time analytics
- **Cons:**
  - Proprietary query language (GSQL learning curve)
  - Smaller ecosystem and community
  - Higher operational complexity
  - Less mature tooling
- **Cost/Complexity:** Similar cost to Neo4j, steeper learning curve

### Alternative 4: ArangoDB

- **Description:** Multi-model database (graph + document + key-value)
- **Pros:**
  - Single database for multiple data models
  - Good performance for moderate graph sizes
  - Flexible schema
- **Cons:**
  - "Jack of all trades" - not as optimized as dedicated graph DB
  - Smaller community than Neo4j
  - Less mature graph algorithms
  - AQL less expressive than Cypher for complex patterns
- **Cost/Complexity:** Medium complexity, compromise on graph performance

## Consequences

### Positive

- **10-100x faster traversals**: Native graph storage eliminates JOIN overhead
- **Expressive queries**: Cypher naturally matches investigation patterns
- **Built-in algorithms**: PageRank, community detection, shortest path accelerate analytics
- **Schema flexibility**: New entity types added without migrations
- **Provenance built-in**: Graph structure naturally represents evidence chains
- **Visual exploration**: Neo4j Browser enables analyst self-service

### Negative

- **Operational complexity**: Additional database technology to manage
- **Learning curve**: Team must learn Cypher query language
- **Dual-write complexity**: Postgres -> Neo4j sync requires careful coordination
- **Licensing costs**: Neo4j Enterprise ~$150k/year for production cluster
- **Memory intensive**: Large graphs require significant RAM for performance

### Neutral

- Graph data duplicates some Postgres data (outbox sync pattern)
- Postgres remains source of truth for transactional data
- Different query patterns for relational vs graph questions

### Operational Impact

- **Monitoring**: Neo4j-specific metrics (query latency, heap usage, page cache hit rate)
- **Performance**: Tune page cache (aim for 80%+ hit rate), query planner, indexes
- **Security**: Role-based access, query timeouts, resource quotas
- **Backup**: Regular snapshots + transaction logs for point-in-time recovery
- **Scaling**: Read replicas for query load, causal clustering for HA

## Code References

### Core Implementation

- `services/graph-core/src/canonical/types.ts` - Entity and relationship type definitions
- `server/src/workers/OutboxNeo4jSync.ts` - Postgres to Neo4j sync worker
- `server/src/app.ts:L145-L180` - Neo4j driver initialization
- `services/graph-core/src/routes/query.ts` - Graph query API

### Data Models

- `server/src/graph/models/` - Node and relationship type definitions
- `server/src/graph/schema/` - Cypher constraints and indexes
- `server/src/graph/migrations/` - Graph schema migrations

### Query Layer

- `server/src/graph/CypherQueryBuilder.ts` - Type-safe Cypher construction
- `server/src/graph/GraphRepository.ts` - Repository pattern for graph ops

### Configuration

- `docker-compose.dev.yml` - Neo4j service definition (lines 41-62)
- Environment: `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`

## Tests & Validation

### Unit Tests

- `tests/unit/graph/CypherQueryBuilder.test.ts` - Query builder correctness
- `tests/unit/coalescer.test.ts` - Graph coalescing logic
- Expected coverage: 85%+

### Integration Tests

- `tests/integration/neo4j/sync.test.ts` - Postgres-to-Neo4j sync validation
- `tests/integration/neo4j/queries.test.ts` - End-to-end graph queries
- `tests/integration/neo4j/multi-tenant.test.ts` - Tenant isolation

### Performance Tests

- `tests/perf/neo4j/traversal-benchmarks.ts` - Traversal performance
- Target: p95 <500ms for 3-hop traversals
- Target: 1000+ queries/second sustained

### CI Enforcement

- Neo4j integration tests in CI pipeline
- `docker-compose.test.yml` - Test environment with Neo4j
- Cypher query linting via pre-commit hooks

## Related ADRs

- ADR-0001: Monorepo Structure (graph-core as shared package)
- ADR-0002: LLM Client Architecture (copilot uses graph for context)
- ADR-0007: GraphQL API Design (uses Neo4j for graph queries)
- ADR-0011: Provenance Ledger Schema (syncs to graph)
- ADR-0012: Copilot GraphRAG Architecture (graph-augmented retrieval)

## References

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Graph Data Science](https://neo4j.com/docs/graph-data-science/current/)
- [Graph Databases Book](https://neo4j.com/graph-databases-book/)
- [Bitemporal Data](https://martinfowler.com/eaaDev/timeNarrative.html)

---

## Revision History

| Date       | Author              | Change                                        |
| ---------- | ------------------- | --------------------------------------------- |
| 2024-01-15 | Data Platform Guild | Initial version                               |
| 2024-03-10 | Data Platform Guild | Updated with production rollout results       |
| 2024-09-20 | Data Platform Guild | Added canonical model documentation           |
| 2025-12-06 | Architecture Team   | Migrated to /docs/architecture/adr/ framework |
