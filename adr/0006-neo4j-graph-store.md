# ADR-0006: Neo4j as Primary Graph Store

**Date:** 2024-01-15
**Status:** Accepted
**Area:** Data
**Owner:** Data Platform Guild
**Tags:** neo4j, graph, cypher, database

## Context

Summit's intelligence platform requires a native graph database to model and query complex relationships between entities (people, organizations, events, evidence, documents). Traditional relational databases struggle with:

- **Deep relationship traversals**: Finding connections N-hops deep becomes exponentially complex in SQL
- **Schema flexibility**: Intelligence data has heterogeneous, evolving entity types and relationship patterns
- **Query expressiveness**: Natural representation of "find all entities connected via suspicious transactions within 3 hops"
- **Performance at scale**: JOIN-heavy queries degrade quickly as relationship density increases

The system must support:
- Multi-hop graph traversals (investigation trails, entity networks)
- Pattern matching (fraud rings, influence networks)
- Real-time query performance (<500ms p95 for typical queries)
- Graph algorithms (centrality, community detection, path finding)
- Multi-tenant data isolation
- Integration with vector search and time-series data

## Decision

We will use **Neo4j** as our primary graph store for entity and relationship modeling.

### Core Decision
Neo4j provides a native, ACID-compliant property graph database with:
- Native graph storage optimized for traversals
- Cypher query language for declarative graph patterns
- Built-in graph algorithms library (GDS)
- Enterprise features for multi-tenancy and security

### Key Components
- **Neo4j Enterprise**: Primary graph database (v5.x+)
- **Graph Data Science Library**: For graph algorithms and analytics
- **Neo4j Driver**: Official Node.js driver for application integration
- **Cypher Query Layer**: Abstraction layer for query building and execution
- **Sync Workers**: Outbox pattern for eventual consistency with Postgres

### Implementation Details
- Deploy Neo4j in HA cluster configuration (3+ core servers)
- Use Cypher for all graph queries and traversals
- Implement query parameterization to prevent injection
- Leverage indexes on node labels and relationship types
- Use composite indexes for common query patterns
- Implement tenant-based graph partitioning via label prefixing

## Alternatives Considered

### Alternative 1: Amazon Neptune
- **Description:** AWS-managed graph database supporting Gremlin and openCypher
- **Pros:**
  - Fully managed service (less operational overhead)
  - Built-in AWS integration
  - Supports both property graph and RDF
- **Cons:**
  - OpenCypher support limited compared to Neo4j
  - Less mature graph algorithms library
  - Vendor lock-in to AWS
  - Higher cost at scale
  - Limited query optimization control
- **Cost/Complexity:** ~$2000/month baseline, vendor lock-in risk

### Alternative 2: PostgreSQL with pg_graph extension
- **Description:** Use Postgres as graph database with recursive CTEs and extensions
- **Pros:**
  - Single database technology (Postgres already in stack)
  - Lower operational complexity
  - Familiar SQL/CTE syntax
- **Cons:**
  - Not optimized for graph traversals (pointer chasing)
  - Recursive CTEs are slow for deep traversals
  - No native graph algorithms
  - Poor performance on complex graph patterns
  - Schema rigidity
- **Cost/Complexity:** Lower cost, inadequate performance for graph workloads

### Alternative 3: TigerGraph
- **Description:** Distributed native graph database with GSQL
- **Pros:**
  - High performance for large-scale graphs
  - Distributed architecture
  - Strong analytics capabilities
- **Cons:**
  - Proprietary query language (GSQL learning curve)
  - Smaller ecosystem and community
  - Higher operational complexity
  - Less mature tooling
- **Cost/Complexity:** Similar cost to Neo4j, steeper learning curve

## Consequences

### Positive
- Native graph traversals provide 10-100x performance improvement over SQL JOINs for relationship queries
- Cypher's declarative syntax matches investigative query patterns naturally
- Built-in graph algorithms (PageRank, community detection, shortest path) accelerate analytics
- Schema flexibility enables rapid iteration on entity/relationship models
- Strong ACID guarantees maintain data consistency

### Negative
- Additional database technology increases operational complexity
- Team needs to learn Cypher query language
- Dual-write complexity (Postgres + Neo4j) requires careful synchronization
- Neo4j Enterprise licensing costs (~$150k/year for production cluster)
- Memory-intensive workloads require careful capacity planning

### Neutral
- Graph data duplicates some Postgres data (outbox sync pattern)
- Need to maintain consistency between Postgres (source of truth) and Neo4j (graph view)
- Graph queries and SQL queries solve different problems (not a replacement)

### Operational Impact
- **Monitoring**: Add Neo4j-specific metrics (query latency, heap usage, page cache hit rate)
- **Performance**: Tune page cache size, query planner, index strategy
- **Security**: Implement role-based access control, query timeouts, resource quotas
- **Compliance**: Ensure graph data sync maintains audit trail and provenance

## Code References

### Core Implementation
- `server/src/workers/OutboxNeo4jSync.ts` - Outbox pattern sync worker from Postgres to Neo4j
- `server/src/app.ts:L145-L180` - Neo4j driver initialization and connection pool
- `services/graph-core/src/routes/query.ts` - Graph query API endpoint
- `server/src/observability/metrics.ts:L89-L112` - Neo4j metrics collection

### Data Models
- `server/src/graph/models/` - Neo4j node and relationship type definitions
- `server/src/graph/schema/` - Cypher schema constraints and indexes
- `server/src/graph/migrations/` - Graph schema migrations

### APIs
- `server/src/graphql/schema/graph.graphql` - GraphQL schema for graph queries
- `client/src/graphql/queries/graphQueries.graphql` - Client graph query examples

### Query Layer
- `server/src/graph/CypherQueryBuilder.ts` - Type-safe Cypher query construction
- `server/src/graph/GraphRepository.ts` - Repository pattern for graph operations

## Tests & Validation

### Unit Tests
- `tests/unit/graph/CypherQueryBuilder.test.ts` - Query builder correctness
- `tests/unit/coalescer.test.ts` - Graph coalescing logic
- Expected coverage: 85%+

### Integration Tests
- `tests/integration/neo4j/sync.test.ts` - Postgres-to-Neo4j sync validation
- `tests/integration/neo4j/queries.test.ts` - End-to-end graph query tests
- `tests/integration/neo4j/multi-tenant.test.ts` - Tenant isolation validation

### Performance Tests
- `tests/perf/neo4j/traversal-benchmarks.ts` - Graph traversal performance benchmarks
- Target: p95 query latency <500ms for 3-hop traversals
- Target: 1000+ queries/second sustained throughput

### Evaluation Criteria
- Query latency benchmarks vs. baseline SQL implementation
- Graph algorithm performance (PageRank on 1M node graph)
- Sync lag measurement (Postgres → Neo4j consistency window)

### CI Enforcement
- `.github/workflows/neo4j-tests.yml` - Neo4j integration tests on PR
- `docker-compose.test.yml` - Local Neo4j test environment
- Cypher query linting via custom pre-commit hook

## Migration & Rollout

### Migration Steps
1. **Phase 1 - Infrastructure (Weeks 1-2)**
   - Provision Neo4j cluster (dev, staging, prod)
   - Set up monitoring, alerting, backup pipelines
   - Create initial schema (node labels, indexes, constraints)

2. **Phase 2 - Sync Pipeline (Weeks 3-4)**
   - Implement outbox pattern in Postgres
   - Build Neo4j sync workers (entity, relationship, delete events)
   - Validate sync correctness and lag metrics
   - Backfill historical data (throttled, monitored)

3. **Phase 3 - Query Migration (Weeks 5-8)**
   - Migrate complex relationship queries from SQL to Cypher
   - Implement GraphQL resolvers backed by Neo4j
   - Run shadow queries (dual execution) to validate correctness
   - Measure performance improvements

4. **Phase 4 - Production Cutover (Week 9)**
   - Feature flag rollout (10% → 50% → 100%)
   - Monitor error rates, latency, sync lag
   - Optimize slow queries, tune indexes

### Rollback Plan
- Feature flags allow instant rollback to SQL queries
- Neo4j is read-only (Postgres remains source of truth)
- Sync workers can be paused without data loss
- No schema migration required in Postgres (backward compatible)

### Timeline
- Phase 1: Infrastructure (Jan 2024)
- Phase 2: Sync Pipeline (Feb 2024)
- Phase 3: Query Migration (Mar-Apr 2024)
- Completion: Production at 100% traffic (May 2024)

## References

### Related ADRs
- ADR-0007: GraphQL API Design (uses Neo4j for graph queries)
- ADR-0011: Provenance Ledger Schema (syncs provenance to graph)
- ADR-0012: Copilot GraphRAG Architecture (uses Neo4j for knowledge graph)

### External Resources
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Graph Data Science](https://neo4j.com/docs/graph-data-science/current/)
- [Graph Databases Book](https://neo4j.com/graph-databases-book/) by Robinson, Webber, Eifrem

### Discussion
- [RFC-0023: Graph Database Evaluation](internal-link)
- [Design Doc: Postgres-Neo4j Sync Architecture](internal-link)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-01-15 | Data Platform Guild | Initial version |
| 2024-03-10 | Data Platform Guild | Updated with production rollout results |
