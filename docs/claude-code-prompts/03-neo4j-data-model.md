# Prompt 3: Neo4j Data Model + Cypher Patterns

## Role
Graph Data Engineer

## Context
IntelGraph is a relationship-centric intelligence analysis platform. Graph queries are central to the user experience:
- **Common patterns**: 1-3 hop traversals
- **Use cases**: Entity resolution, relationship discovery, pattern matching
- **Scale**: Millions of nodes, tens of millions of relationships

Performance is critical for analyst workflows.

## Task
Design and implement the Neo4j graph data model:

1. **Schema Definition**:
   - Node labels (Person, Organization, Event, Location, Source, etc.)
   - Relationship types (AFFILIATED_WITH, LOCATED_AT, PARTICIPATED_IN, etc.)
   - Property constraints and indexes
   - Uniqueness constraints

2. **Cypher Query Library**:
   - 1-hop neighborhood queries
   - 2-3 hop filtered path queries (by purpose tags, date ranges)
   - Entity resolution patterns
   - Pattern matching templates

3. **Performance Optimization**:
   - Index strategy
   - Query profiling and tuning
   - EXPLAIN/PROFILE analysis documentation

## Guardrails (SLOs)

### Performance Targets
- **1-hop queries**: p95 ≤ 300 ms
- **2-3 hop queries**: p95 ≤ 1,200 ms

### Data Quality
- All entities must have provenance
- Timestamps required on all nodes and relationships
- Purpose tags for data governance

## Deliverables

### 1. Schema Definition
- [ ] `services/graph/schema.cypher` - Complete schema definition
- [ ] `services/graph/migrations/` - Migration scripts for:
  - [ ] Indexes
  - [ ] Constraints
  - [ ] Node labels
  - [ ] Relationship types

### 2. Query Library
- [ ] `services/graph/queries/` - Reusable Cypher query templates:
  - [ ] `1-hop-neighborhood.cypher`
  - [ ] `2-3-hop-paths.cypher`
  - [ ] `entity-resolution.cypher`
  - [ ] `pattern-matching.cypher`
  - [ ] `temporal-queries.cypher`

### 3. Performance Documentation
- [ ] `QUERY_TUNING.md` with:
  - [ ] EXPLAIN plans for key queries
  - [ ] PROFILE results on seeded datasets
  - [ ] Index coverage analysis
  - [ ] Query optimization notes
  - [ ] Benchmarking methodology

### 4. Load Testing
- [ ] k6 load test scripts for:
  - [ ] 1-hop queries
  - [ ] 2-3 hop path traversals
  - [ ] Concurrent query patterns
- [ ] Seeded test dataset (representative scale)

## Acceptance Criteria
- ✅ All PROFILE'd queries meet SLO targets on seeded data
- ✅ Load tests validate p95 latencies
- ✅ `make graph-benchmark` runs successfully
- ✅ All indexes created and constraints enforced
- ✅ Query library documented with examples

## Example Schema

```cypher
// Node Labels and Constraints
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type);

// Composite indexes for common queries
CREATE INDEX entity_type_created IF NOT EXISTS FOR (e:Entity) ON (e.type, e.createdAt);

// Full-text search indexes
CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (e:Entity) ON EACH [e.name, e.description];

// Example relationship with properties
CREATE (p1:Person {id: 'p1', name: 'Alice'})-[:KNOWS {
  since: datetime('2020-01-01'),
  confidence: 0.95,
  source: 'intel-report-123',
  purpose: 'investigation-456'
}]->(p2:Person {id: 'p2', name: 'Bob'});
```

## Example Queries

### 1-Hop Neighborhood
```cypher
// Find all entities directly connected to a person
MATCH (p:Person {id: $personId})-[r]-(connected)
WHERE r.purpose = $purpose
  AND r.createdAt >= datetime($startDate)
RETURN connected, r
LIMIT 100;
```

### 2-3 Hop Filtered Paths
```cypher
// Find paths of 2-3 hops with purpose filtering
MATCH path = (start:Entity {id: $entityId})-[*2..3]-(end)
WHERE ALL(r IN relationships(path) WHERE r.purpose = $purpose)
  AND ALL(r IN relationships(path) WHERE r.createdAt >= datetime($startDate))
RETURN path, length(path) as hopCount
ORDER BY hopCount
LIMIT 50;
```

## Related Files
- `/home/user/summit/docs/graph-db/GUIDE.md` - Graph database guide
- `/home/user/summit/docs/graph-db/QUERY_LANGUAGE.md` - Query patterns
- `/home/user/summit/services/graph/` - Graph service implementation

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 3: Neo4j data model design"

# Or use the slash command (if configured)
/neo4j-schema
```

## Notes
- Use Neo4j 5.x features (node labels, relationship properties)
- Implement bitemporal modeling if needed for time-travel queries
- Consider APOC procedures for complex operations
- Profile queries with realistic data volumes
