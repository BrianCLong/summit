# Knowledge Graph Query Guide

## Overview

This guide covers advanced query patterns, optimization techniques, and best practices for querying the Summit Knowledge Graph platform.

## Table of Contents

1. [Query Languages](#query-languages)
2. [Basic Patterns](#basic-patterns)
3. [Advanced Patterns](#advanced-patterns)
4. [Aggregations](#aggregations)
5. [Temporal Queries](#temporal-queries)
6. [Path Queries](#path-queries)
7. [Query Optimization](#query-optimization)
8. [Common Patterns](#common-patterns)

## Query Languages

Summit Knowledge Graph supports multiple query languages:

- **Cypher**: Neo4j's graph query language (primary)
- **SPARQL**: RDF query language for triple store
- **Structured Queries**: JavaScript/TypeScript query builder
- **GraphQL**: Coming soon

## Basic Patterns

### Simple Node Queries

```cypher
-- Find all persons
MATCH (p:Person)
RETURN p
LIMIT 100

-- Find person by property
MATCH (p:Person {name: 'John Doe'})
RETURN p

-- Find with WHERE clause
MATCH (p:Person)
WHERE p.age > 25 AND p.age < 40
RETURN p.name, p.age
ORDER BY p.age DESC
```

### TypeScript Structured Queries

```typescript
// Find all persons over 25
const result = await kg.query({
  match: '(p:Person)',
  where: { 'p.age': { $gt: 25 } },
  return: ['p'],
  orderBy: [{ field: 'p.age', direction: 'DESC' }],
  limit: 100
});

// Find with multiple conditions
const result = await kg.query({
  match: '(p:Person)',
  where: {
    'p.age': { $gte: 25, $lte: 40 },
    'p.occupation': 'Engineer'
  },
  return: ['p.name', 'p.age', 'p.occupation']
});
```

### Relationship Queries

```cypher
-- Find direct relationships
MATCH (p:Person)-[r:WORKS_AT]->(o:Organization)
WHERE p.name = 'John Doe'
RETURN p, r, o

-- Find all relationships between nodes
MATCH (p:Person {name: 'John Doe'})-[r]-(other)
RETURN type(r) as relationshipType, other

-- Find specific relationship types
MATCH (p:Person)-[r:KNOWS|FRIEND_OF]-(other:Person)
WHERE p.name = 'Alice'
RETURN other.name, type(r) as relationship
```

## Advanced Patterns

### Pattern Matching

```cypher
-- Triangle pattern (mutual connections)
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person)-[:KNOWS]->(a)
RETURN a.name, b.name, c.name

-- Star pattern (central node with multiple connections)
MATCH (center:Person)-[r]-(connected)
WHERE center.name = 'Alice'
RETURN center, type(r) as relType, count(connected) as connections
ORDER BY connections DESC

-- Chain pattern
MATCH path = (start:Person)-[:KNOWS*3]-(end:Person)
WHERE start.name = 'Alice' AND end.name = 'Bob'
RETURN path
LIMIT 10
```

### Optional Matches

```cypher
-- Find persons with optional organization
MATCH (p:Person)
OPTIONAL MATCH (p)-[:WORKS_AT]->(o:Organization)
RETURN p.name, o.name as company

-- Multiple optional patterns
MATCH (p:Person {name: 'John Doe'})
OPTIONAL MATCH (p)-[:WORKS_AT]->(o:Organization)
OPTIONAL MATCH (p)-[:LIVES_IN]->(l:Location)
RETURN p, o, l
```

### Union Queries

```cypher
-- Find all employees and customers
MATCH (e:Employee)
RETURN e.name as name, 'Employee' as type
UNION
MATCH (c:Customer)
RETURN c.name as name, 'Customer' as type

-- Combine different relationship types
MATCH (p:Person)-[:WORKS_AT]->(org:Organization)
RETURN p, org, 'employment' as context
UNION
MATCH (p:Person)-[:CUSTOMER_OF]->(org:Organization)
RETURN p, org, 'customer' as context
```

### Subqueries

```cypher
-- Find persons with more than 5 connections
MATCH (p:Person)
WHERE size((p)-[]-()) > 5
RETURN p.name, size((p)-[]-()) as connectionCount
ORDER BY connectionCount DESC

-- Find organizations with high-value customers
MATCH (o:Organization)
WHERE EXISTS {
  MATCH (o)<-[:CUSTOMER_OF]-(c:Customer)
  WHERE c.lifetimeValue > 100000
}
RETURN o.name, count((o)<-[:CUSTOMER_OF]-()) as totalCustomers
```

## Aggregations

### Count and Group

```cypher
-- Count entities by type
MATCH (n)
RETURN labels(n) as type, count(*) as count
ORDER BY count DESC

-- Group by property
MATCH (p:Person)
RETURN p.occupation, count(*) as count, avg(p.age) as avgAge
ORDER BY count DESC

-- Count relationships
MATCH ()-[r]->()
RETURN type(r) as relationshipType, count(*) as count
ORDER BY count DESC
```

### Statistical Aggregations

```cypher
-- Statistical measures
MATCH (p:Person)
RETURN
  count(p) as total,
  avg(p.age) as avgAge,
  min(p.age) as minAge,
  max(p.age) as maxAge,
  stdev(p.age) as stdAge

-- Percentiles
MATCH (p:Person)
RETURN
  percentileDisc(p.age, 0.5) as medianAge,
  percentileDisc(p.age, 0.95) as p95Age

-- Collect into lists
MATCH (o:Organization)<-[:WORKS_AT]-(e:Employee)
RETURN o.name, collect(e.name) as employees, count(e) as employeeCount
ORDER BY employeeCount DESC
```

### Advanced Aggregations

```cypher
-- Nested aggregations
MATCH (o:Organization)<-[:WORKS_AT]-(e:Employee)
WITH o, count(e) as empCount, collect(e) as employees
WHERE empCount > 10
RETURN o.name, empCount,
  [emp IN employees WHERE emp.age > 30 | emp.name] as seniorEmployees

-- Conditional aggregation
MATCH (p:Person)
RETURN
  count(p) as total,
  count(CASE WHEN p.age < 30 THEN 1 END) as under30,
  count(CASE WHEN p.age >= 30 AND p.age < 50 THEN 1 END) as between30And50,
  count(CASE WHEN p.age >= 50 THEN 1 END) as over50
```

## Temporal Queries

### Time-based Filtering

```cypher
-- Find recent relationships
MATCH (p:Person)-[r:WORKS_AT]->(o:Organization)
WHERE r.since > date('2020-01-01')
RETURN p.name, o.name, r.since
ORDER BY r.since DESC

-- Date range queries
MATCH (e:Event)
WHERE e.timestamp >= datetime('2024-01-01T00:00:00')
  AND e.timestamp < datetime('2024-02-01T00:00:00')
RETURN e
ORDER BY e.timestamp

-- Relative time queries
MATCH (p:Person)
WHERE p.lastActive > datetime() - duration('P7D')  // Last 7 days
RETURN p.name, p.lastActive
```

### Temporal Patterns

```cypher
-- Find overlapping periods
MATCH (p1:Person)-[r1:EMPLOYED_BY]->(o:Organization),
      (p2:Person)-[r2:EMPLOYED_BY]->(o)
WHERE p1 <> p2
  AND r1.startDate <= r2.endDate
  AND r2.startDate <= r1.endDate
RETURN p1.name, p2.name, o.name as company

-- Sequence analysis
MATCH path = (p:Person)-[:WORKED_AT*]->(o:Organization)
WHERE all(r IN relationships(path) WHERE r.endDate IS NOT NULL)
WITH p, [r IN relationships(path) | {
  company: endNode(r).name,
  startDate: r.startDate,
  endDate: r.endDate
}] as history
RETURN p.name, history
ORDER BY size(history) DESC
```

### Version Queries (with Summit's versioning)

```typescript
// Get entity at specific time
const timestamp = new Date('2024-01-01');
const version = await kg.getVersionAt(timestamp);

// Get changes in time range
const changes = kg.getChangesInTimeRange(
  new Date('2024-01-01'),
  new Date('2024-02-01')
);

// Filter changes by type
const nodeAdditions = changes.filter(c => c.type === 'node_added');
```

## Path Queries

### Shortest Path

```cypher
-- Find shortest path
MATCH path = shortestPath(
  (start:Person {name: 'Alice'})-[*]-(end:Person {name: 'Bob'})
)
RETURN path, length(path) as pathLength

-- Shortest path with relationship types
MATCH path = shortestPath(
  (start:Person {name: 'Alice'})-[:KNOWS|FRIEND_OF*]-(end:Person {name: 'Bob'})
)
RETURN path

-- All shortest paths
MATCH paths = allShortestPaths(
  (start:Person {name: 'Alice'})-[*]-(end:Person {name: 'Bob'})
)
RETURN paths
```

### Variable Length Paths

```cypher
-- Find all paths up to length 4
MATCH path = (start:Person {name: 'Alice'})-[:KNOWS*1..4]-(other:Person)
RETURN DISTINCT other.name, length(path) as distance
ORDER BY distance

-- Find cycles
MATCH path = (p:Person)-[:KNOWS*3..5]->(p)
WHERE p.name = 'Alice'
RETURN path

-- Exclude certain nodes from path
MATCH path = (start:Person {name: 'Alice'})-[:KNOWS*]-(end:Person {name: 'Bob'})
WHERE NONE(node IN nodes(path) WHERE node.blocked = true)
RETURN path
LIMIT 10
```

### Path Analysis

```cypher
-- Analyze path properties
MATCH path = (start:Person)-[:KNOWS*]-(end:Person)
WHERE start.name = 'Alice' AND end.name = 'Bob'
WITH path, relationships(path) as rels
RETURN
  length(path) as pathLength,
  [r IN rels | r.strength] as edgeWeights,
  reduce(total = 0, r IN rels | total + r.strength) as totalStrength
ORDER BY totalStrength DESC
LIMIT 5

-- Find common neighbors
MATCH (a:Person {name: 'Alice'})-[:KNOWS]-(common)-[:KNOWS]-(b:Person {name: 'Bob'})
RETURN common.name, common
```

## Query Optimization

### Use Indexes

```cypher
-- Create indexes for frequently queried properties
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.email);
CREATE INDEX org_name IF NOT EXISTS FOR (o:Organization) ON (o.name);

-- Composite index
CREATE INDEX person_name_age IF NOT EXISTS FOR (p:Person) ON (p.name, p.age);

-- Check which indexes are used
PROFILE MATCH (p:Person {name: 'John Doe'}) RETURN p;
```

### Query Hints

```cypher
-- Use index hint
MATCH (p:Person)
USING INDEX p:Person(name)
WHERE p.name = 'John Doe'
RETURN p

-- Use scan hint
MATCH (p:Person)
USING SCAN p:Person
WHERE p.name STARTS WITH 'John'
RETURN p

-- Join hint
MATCH (p:Person)-[:WORKS_AT]->(o:Organization)
USING JOIN ON p
WHERE p.name = 'John Doe' AND o.name = 'Acme Corp'
RETURN p, o
```

### Limit Early

```cypher
-- Bad: Filter after collection
MATCH (p:Person)
WITH collect(p) as persons
RETURN persons[0..10]

-- Good: Limit during match
MATCH (p:Person)
RETURN p
LIMIT 10

-- Good: WITH + LIMIT for intermediate results
MATCH (p:Person)
WITH p
ORDER BY p.age DESC
LIMIT 100
MATCH (p)-[:WORKS_AT]->(o:Organization)
RETURN p, o
```

### Avoid Cartesian Products

```cypher
-- Bad: Creates cartesian product
MATCH (p:Person), (o:Organization)
WHERE p.company = o.name
RETURN p, o

-- Good: Use relationships
MATCH (p:Person)-[:WORKS_AT]->(o:Organization)
RETURN p, o

-- If relationship doesn't exist, be explicit
MATCH (p:Person), (o:Organization)
WHERE p.companyName = o.name  // Make dependency clear
RETURN p, o
```

## Common Patterns

### Friends of Friends

```cypher
-- Find friends of friends who are not yet friends
MATCH (person:Person {name: 'Alice'})-[:FRIEND_OF]->(:Person)-[:FRIEND_OF]->(fof:Person)
WHERE NOT (person)-[:FRIEND_OF]-(fof)
  AND person <> fof
RETURN DISTINCT fof.name, count(*) as mutualFriends
ORDER BY mutualFriends DESC
LIMIT 10
```

### Recommendation Engine

```cypher
-- Product recommendations based on similar customers
MATCH (c:Customer {id: 'customer123'})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(other:Customer)
MATCH (other)-[:PURCHASED]->(rec:Product)
WHERE NOT (c)-[:PURCHASED]->(rec)
RETURN rec.name, count(*) as score, collect(DISTINCT other.name) as recommendedBy
ORDER BY score DESC
LIMIT 10
```

### Influence Propagation

```cypher
-- Find influencers (high PageRank)
CALL gds.pageRank.stream({
  nodeQuery: 'MATCH (p:Person) RETURN id(p) AS id',
  relationshipQuery: 'MATCH (p1:Person)-[:FOLLOWS]->(p2:Person) RETURN id(p1) AS source, id(p2) AS target'
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS person, score
ORDER BY score DESC
LIMIT 10
```

### Hierarchical Queries

```cypher
-- Organization hierarchy
MATCH path = (top:Organization)-[:PARENT_OF*]->(child:Organization)
WHERE NOT (top)-[:CHILD_OF]->()  // Top-level org
RETURN
  top.name as topOrg,
  [node IN nodes(path) | node.name] as hierarchy,
  length(path) as depth

-- Manager chain
MATCH path = (employee:Person)-[:REPORTS_TO*]->(ceo:Person)
WHERE NOT (ceo)-[:REPORTS_TO]->()
  AND employee.name = 'John Doe'
RETURN [node IN nodes(path) | node.name] as reportingChain
```

### Graph Algorithms

```cypher
-- Community detection (Louvain)
CALL gds.louvain.stream('myGraph')
YIELD nodeId, communityId
RETURN communityId, collect(gds.util.asNode(nodeId).name) as members, count(*) as size
ORDER BY size DESC
LIMIT 10

-- Betweenness centrality
CALL gds.betweenness.stream('myGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name as person, score
ORDER BY score DESC
LIMIT 10

-- Connected components
CALL gds.wcc.stream('myGraph')
YIELD nodeId, componentId
RETURN componentId, collect(gds.util.asNode(nodeId).name) as component, count(*) as size
ORDER BY size DESC
```

### Anomaly Detection

```cypher
-- Find outliers (nodes with unusual degree)
MATCH (p:Person)
WITH avg(size((p)-[]-()) ) as avgDegree, stdev(size((p)-[]-())) as stdDev
MATCH (p:Person)
WITH p, size((p)-[]-()) as degree, avgDegree, stdDev
WHERE degree > avgDegree + 2 * stdDev
RETURN p.name, degree, avgDegree, stdDev
ORDER BY degree DESC

-- Find suspicious patterns
MATCH (p:Person)-[r:TRANSACTION]->(other)
WHERE r.amount > 10000
  AND r.timestamp > datetime() - duration('P1D')
WITH p, count(r) as txCount, sum(r.amount) as totalAmount
WHERE txCount > 10
RETURN p.name, txCount, totalAmount
ORDER BY totalAmount DESC
```

## Performance Tips

### 1. Profile Your Queries

```cypher
-- See query execution plan
EXPLAIN MATCH (p:Person {name: 'John Doe'}) RETURN p;

-- See actual query performance
PROFILE MATCH (p:Person {name: 'John Doe'}) RETURN p;
```

### 2. Use Parameters

```typescript
// Bad: String interpolation
await kg.query(`MATCH (p:Person {name: '${name}'}) RETURN p`);

// Good: Parameterized query
await kg.query(
  `MATCH (p:Person {name: $name}) RETURN p`,
  { name: 'John Doe' }
);
```

### 3. Batch Queries

```typescript
// Bad: N queries
for (const person of people) {
  await kg.query(`MATCH (p:Person {id: $id}) RETURN p`, { id: person.id });
}

// Good: Single query with UNWIND
await kg.query(`
  UNWIND $ids AS id
  MATCH (p:Person {id: id})
  RETURN p
`, { ids: people.map(p => p.id) });
```

### 4. Cache Results

```typescript
// Use caching for expensive queries
const cacheKey = `top-influencers:${date}`;
let results = await cache.get(cacheKey);

if (!results) {
  results = await kg.query(expensiveInfluencerQuery);
  await cache.set(cacheKey, results, 3600); // Cache for 1 hour
}
```

## Summary

Effective querying requires:

1. **Understanding patterns**: Master basic and advanced graph patterns
2. **Using indexes**: Create appropriate indexes for your access patterns
3. **Optimizing queries**: Profile, optimize, and avoid anti-patterns
4. **Leveraging algorithms**: Use built-in graph algorithms where appropriate
5. **Monitoring performance**: Continuously monitor and tune query performance

## References

- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [SPARQL 1.1 Query Language](https://www.w3.org/TR/sparql11-query/)
- [Graph Algorithms](https://neo4j.com/docs/graph-data-science/current/)
- [Query Tuning](https://neo4j.com/developer/cypher-query-language/)
