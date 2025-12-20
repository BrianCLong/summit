# Graph Query Language Reference

## Overview

Summit's Graph Database supports multiple query languages to accommodate different use cases and user preferences. This guide covers Cypher, Gremlin, and SPARQL query syntax.

## Table of Contents

1. [Cypher Query Language](#cypher-query-language)
2. [Gremlin Traversal Language](#gremlin-traversal-language)
3. [SPARQL for RDF](#sparql-for-rdf)
4. [Query Optimization](#query-optimization)
5. [Best Practices](#best-practices)

## Cypher Query Language

Cypher is a declarative graph query language originally created for Neo4j. Summit provides Cypher-compatible query support.

### Basic Pattern Matching

#### Match Nodes

```cypher
-- Find all person nodes
MATCH (p:Person)
RETURN p

-- Find nodes with specific property
MATCH (p:Person)
WHERE p.name = 'John Doe'
RETURN p

-- Multiple labels
MATCH (p:Person:Agent)
RETURN p
```

#### Match Relationships

```cypher
-- Direct relationship
MATCH (a:Person)-[r:REPORTS_TO]->(b:Person)
RETURN a, r, b

-- Any relationship
MATCH (a)-[r]->(b)
RETURN a, type(r), b

-- Specific relationship with properties
MATCH (a)-[r:COMMUNICATED_WITH]->(b)
WHERE r.timestamp > 1640000000000
RETURN a, r, b
```

#### Variable Length Paths

```cypher
-- 1 to 3 hops
MATCH (a:Person)-[r*1..3]->(b:Person)
WHERE a.name = 'John Doe'
RETURN a, r, b

-- Any length (be careful with large graphs)
MATCH (a)-[r*]->(b)
WHERE a.id = 'node123'
RETURN a, r, b

-- Specific relationship types
MATCH (a)-[r:REPORTS_TO*1..5]->(b)
RETURN a, b
```

### Filtering with WHERE

```cypher
-- Property comparison
MATCH (p:Person)
WHERE p.age > 30 AND p.role = 'analyst'
RETURN p

-- IN clause
MATCH (p:Person)
WHERE p.country IN ['USA', 'UK', 'Canada']
RETURN p

-- String operations
MATCH (p:Person)
WHERE p.name STARTS WITH 'John'
RETURN p

MATCH (p:Person)
WHERE p.email ENDS WITH '@agency.gov'
RETURN p

MATCH (p:Person)
WHERE p.name CONTAINS 'Smith'
RETURN p

-- Regular expressions
MATCH (p:Person)
WHERE p.phone =~ '\\d{3}-\\d{3}-\\d{4}'
RETURN p

-- NULL checks
MATCH (p:Person)
WHERE p.clearance IS NOT NULL
RETURN p
```

### Aggregation

```cypher
-- Count
MATCH (p:Person)
RETURN COUNT(p) AS totalPeople

-- Group by
MATCH (p:Person)
RETURN p.role, COUNT(p) AS count
ORDER BY count DESC

-- Multiple aggregations
MATCH (p:Person)
RETURN p.department,
       COUNT(p) AS people,
       AVG(p.age) AS avgAge,
       MAX(p.salary) AS maxSalary

-- COLLECT for arrays
MATCH (p:Person)-[:WORKS_IN]->(d:Department)
RETURN d.name, COLLECT(p.name) AS employees
```

### Ordering and Limiting

```cypher
-- Order by single property
MATCH (p:Person)
RETURN p
ORDER BY p.age DESC

-- Multiple ordering
MATCH (p:Person)
RETURN p
ORDER BY p.department ASC, p.salary DESC

-- Limit results
MATCH (p:Person)
RETURN p
ORDER BY p.salary DESC
LIMIT 10

-- Skip and limit (pagination)
MATCH (p:Person)
RETURN p
ORDER BY p.name
SKIP 20
LIMIT 10
```

### Creating Data

```cypher
-- Create node
CREATE (p:Person {name: 'John Doe', role: 'analyst'})
RETURN p

-- Create with multiple labels
CREATE (p:Person:Agent {name: 'Jane Smith', clearance: 'top_secret'})
RETURN p

-- Create relationship
MATCH (a:Person {name: 'John Doe'})
MATCH (b:Person {name: 'Jane Smith'})
CREATE (a)-[r:REPORTS_TO {since: '2024-01-01'}]->(b)
RETURN r

-- Create path
CREATE (a:Person {name: 'Alice'})-[:REPORTS_TO]->(b:Person {name: 'Bob'})
RETURN a, b
```

### Updating Data

```cypher
-- Update properties
MATCH (p:Person {name: 'John Doe'})
SET p.role = 'senior_analyst', p.updatedAt = timestamp()
RETURN p

-- Add label
MATCH (p:Person {name: 'John Doe'})
SET p:Supervisor
RETURN p

-- Remove property
MATCH (p:Person)
WHERE p.tempData IS NOT NULL
REMOVE p.tempData
RETURN p
```

### Deleting Data

```cypher
-- Delete node (must delete relationships first)
MATCH (p:Person {name: 'John Doe'})
DELETE p

-- Delete with relationships
MATCH (p:Person {name: 'John Doe'})
DETACH DELETE p

-- Delete relationships only
MATCH (a:Person)-[r:REPORTS_TO]->(b:Person)
WHERE r.endDate < timestamp()
DELETE r
```

### Complex Queries

#### Shortest Path

```cypher
-- Single shortest path
MATCH path = shortestPath(
  (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'})
)
RETURN path

-- All shortest paths
MATCH path = allShortestPaths(
  (a:Person {name: 'Alice'})-[*..5]-(b:Person {name: 'Bob'})
)
RETURN path
```

#### Subqueries

```cypher
-- Find people and their direct reports
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)<-[:REPORTS_TO]-(subordinate:Person)
}
RETURN p, COUNT {
  MATCH (p)<-[:REPORTS_TO]-(subordinate)
} AS directReports
```

#### CASE Expressions

```cypher
MATCH (p:Person)
RETURN p.name,
       CASE
         WHEN p.clearance = 'top_secret' THEN 'TS'
         WHEN p.clearance = 'secret' THEN 'S'
         ELSE 'C'
       END AS clearanceLevel
```

## Gremlin Traversal Language

Gremlin is an imperative graph traversal language. Summit provides Gremlin-compatible traversal support.

### Basic Traversals

```typescript
import { QueryEngine } from '@intelgraph/graph-query';

const queryEngine = new QueryEngine(storage);

// Start with all vertices
const result = queryEngine.executeGremlin({
  steps: [
    { type: 'V', args: [] }
  ]
});

// Filter by property
const filtered = queryEngine.executeGremlin({
  steps: [
    { type: 'V', args: [] },
    { type: 'has', args: ['role', 'analyst'] }
  ]
});

// Traverse outgoing edges
const outgoing = queryEngine.executeGremlin({
  steps: [
    { type: 'V', args: [] },
    { type: 'has', args: ['name', 'John Doe'] },
    { type: 'out', args: [] }
  ]
});
```

### Common Traversal Patterns

#### Out/In/Both

```typescript
// Traverse outgoing edges
{ type: 'out', args: ['REPORTS_TO'] }

// Traverse incoming edges
{ type: 'in', args: ['REPORTS_TO'] }

// Traverse both directions
{ type: 'both', args: [] }
```

#### Filtering

```typescript
// Has property
{ type: 'has', args: ['clearance'] }

// Has property with value
{ type: 'has', args: ['role', 'analyst'] }

// Property comparison
{ type: 'has', args: ['age', 'gt', 30] }
```

#### Values

```typescript
// Get property values
{ type: 'values', args: ['name'] }

// Get all properties
{ type: 'valueMap', args: [] }
```

### Example Traversals

```typescript
// Find all analysts and their supervisors
const analystsAndSupervisors = queryEngine.executeGremlin({
  steps: [
    { type: 'V', args: [] },
    { type: 'has', args: ['role', 'analyst'] },
    { type: 'out', args: ['REPORTS_TO'] },
    { type: 'values', args: ['name'] }
  ]
});

// Count nodes by type
const counts = queryEngine.executeGremlin({
  steps: [
    { type: 'V', args: [] },
    { type: 'groupCount', args: ['label'] }
  ]
});

// Path traversal
const paths = queryEngine.executeGremlin({
  steps: [
    { type: 'V', args: [] },
    { type: 'has', args: ['name', 'Alice'] },
    { type: 'repeat', args: [{ type: 'out', args: [] }] },
    { type: 'times', args: [3] },
    { type: 'path', args: [] }
  ]
});
```

## SPARQL for RDF

SPARQL is used for querying RDF triple stores. Summit provides basic SPARQL support for RDF-compatible graphs.

### Basic Triple Patterns

```sparql
-- Select all subjects and objects
SELECT ?subject ?object
WHERE {
  ?subject ?predicate ?object
}

-- Filter by predicate
SELECT ?person ?name
WHERE {
  ?person <http://schema.org/name> ?name
}

-- Multiple patterns
SELECT ?person ?name ?email
WHERE {
  ?person <http://schema.org/name> ?name .
  ?person <http://schema.org/email> ?email
}
```

### Filtering

```sparql
-- FILTER clause
SELECT ?person ?age
WHERE {
  ?person <http://schema.org/age> ?age .
  FILTER (?age > 30)
}

-- String matching
SELECT ?person ?name
WHERE {
  ?person <http://schema.org/name> ?name .
  FILTER (REGEX(?name, "Smith", "i"))
}

-- Multiple conditions
SELECT ?person
WHERE {
  ?person <http://schema.org/role> ?role .
  ?person <http://schema.org/clearance> ?clearance .
  FILTER (?role = "analyst" && ?clearance = "top_secret")
}
```

### OPTIONAL

```sparql
-- Optional properties
SELECT ?person ?name ?email
WHERE {
  ?person <http://schema.org/name> ?name .
  OPTIONAL {
    ?person <http://schema.org/email> ?email
  }
}
```

## Query Optimization

### Use EXPLAIN

```typescript
// Cypher query optimization
const query = `
  MATCH (p:Person)-[:REPORTS_TO*1..3]->(supervisor:Person)
  WHERE p.role = 'analyst'
  RETURN supervisor.name, COUNT(p) AS analysts
`;

const plan = queryEngine.explain(query, 'cypher');

console.log('Steps:', plan.steps);
console.log('Estimated cost:', plan.estimatedCost);
console.log('Estimated rows:', plan.estimatedRows);
```

### Query Plan Output

```
Steps:
1. Node label scan: Person (cost: 10)
2. Filter: role = 'analyst' (cost: 5)
3. Expand edges: REPORTS_TO (cost: 100)
4. Aggregate: COUNT (cost: 20)

Total estimated cost: 135
Estimated rows: 100
```

### Optimization Strategies

#### 1. Use Labels

```cypher
-- Good: Uses index
MATCH (p:Person)
WHERE p.name = 'John'
RETURN p

-- Bad: Full scan
MATCH (p)
WHERE p.name = 'John'
RETURN p
```

#### 2. Limit Early

```cypher
-- Good: Limit before expensive operations
MATCH (p:Person)
WHERE p.active = true
WITH p
LIMIT 100
MATCH (p)-[:COMMUNICATED_WITH]->(other)
RETURN p, other

-- Bad: Limit after expensive operations
MATCH (p:Person)-[:COMMUNICATED_WITH]->(other)
WHERE p.active = true
RETURN p, other
LIMIT 100
```

#### 3. Use Specific Relationships

```cypher
-- Good: Specific type
MATCH (p)-[:REPORTS_TO]->(supervisor)
RETURN supervisor

-- Bad: Any relationship
MATCH (p)-[r]->(supervisor)
WHERE type(r) = 'REPORTS_TO'
RETURN supervisor
```

#### 4. Avoid Cartesian Products

```cypher
-- Good: Connected patterns
MATCH (p:Person)-[:WORKS_IN]->(d:Department)
MATCH (d)-[:LOCATED_IN]->(c:City)
RETURN p, c

-- Bad: Unconnected patterns (Cartesian product)
MATCH (p:Person)
MATCH (c:City)
WHERE p.city = c.name
RETURN p, c
```

## Best Practices

### 1. Query Structure

```cypher
-- Start with most selective patterns
MATCH (rare:RareLabel {uniqueProperty: 'specific_value'})
MATCH (rare)-[:RELATIONSHIP]->(other)
RETURN other

-- Not: Start with general patterns
MATCH (any)-[:RELATIONSHIP]->(other)
WHERE any:RareLabel AND any.uniqueProperty = 'specific_value'
RETURN other
```

### 2. Property Indexes

```typescript
// Ensure indexed properties are used in WHERE
const query = `
  MATCH (p:Person)
  WHERE p.ssn = '123-45-6789'  -- Assuming ssn is indexed
  RETURN p
`;
```

### 3. Limit Result Sets

```cypher
-- Always use LIMIT for exploratory queries
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p, friend
LIMIT 100
```

### 4. Use Parameters

```typescript
// Good: Use parameters
const query = `
  MATCH (p:Person)
  WHERE p.name = $name
  RETURN p
`;

queryEngine.executeCypher(query, { name: 'John Doe' });

// Bad: String concatenation (SQL injection risk)
const query = `
  MATCH (p:Person)
  WHERE p.name = '${userInput}'
  RETURN p
`;
```

### 5. Avoid SELECT *

```cypher
-- Good: Select specific properties
MATCH (p:Person)
RETURN p.id, p.name, p.role

-- Bad: Return entire node (large data)
MATCH (p:Person)
RETURN p
```

## Query Examples by Use Case

### Network Analysis

```cypher
-- Find central nodes (high degree)
MATCH (n)
RETURN n, size((n)--()) AS degree
ORDER BY degree DESC
LIMIT 10

-- Find bridges (single point of connection)
MATCH (a)-[r]-(b)
WHERE NOT EXISTS {
  MATCH (a)-[r2]-(b)
  WHERE r <> r2
}
RETURN a, b, r

-- Find isolated components
MATCH (n)
WHERE NOT EXISTS {
  MATCH (n)--()
}
RETURN COUNT(n) AS isolatedNodes
```

### Intelligence Queries

```cypher
-- Communication network
MATCH (a:Person)-[:COMMUNICATED_WITH]->(b:Person)
WHERE a.clearance = 'top_secret' AND b.country <> 'USA'
RETURN a, b

-- Financial flows
MATCH path = (source:Account)-[:TRANSFER*1..5]->(target:Account)
WHERE source.country = 'USA' AND target.country = 'offshore'
AND ALL(r IN relationships(path) WHERE r.amount > 10000)
RETURN path

-- Association discovery
MATCH (suspect:Person)-[:KNOWS*1..3]-(associate:Person)
WHERE suspect.flagged = true
RETURN DISTINCT associate.name, length(shortestPath((suspect)-[:KNOWS*]-(associate))) AS distance
ORDER BY distance
```

### Temporal Queries

```cypher
-- Recent activity
MATCH (p:Person)-[r:COMMUNICATED_WITH]->(other)
WHERE r.timestamp > timestamp() - 86400000  -- Last 24 hours
RETURN p, COUNT(r) AS communications
ORDER BY communications DESC

-- Activity trends
MATCH (p:Person)-[r:LOGGED_IN]->(:System)
WHERE r.timestamp > timestamp() - 604800000  -- Last week
RETURN p.name,
       COUNT(r) AS logins,
       MIN(r.timestamp) AS firstLogin,
       MAX(r.timestamp) AS lastLogin
```

## Performance Benchmarks

| Query Type | Small Graph | Medium Graph | Large Graph |
|------------|-------------|--------------|-------------|
| Simple match | < 1ms | < 10ms | < 100ms |
| 1-hop expand | < 5ms | < 50ms | < 500ms |
| 3-hop expand | < 100ms | < 1s | < 10s |
| Aggregation | < 10ms | < 100ms | < 1s |
| Shortest path | < 50ms | < 500ms | < 5s |

Note: Times are approximate and depend on graph structure and hardware.

## Resources

- Cypher Documentation: [OpenCypher](https://opencypher.org/)
- Gremlin Documentation: [Apache TinkerPop](https://tinkerpop.apache.org/)
- SPARQL Documentation: [W3C SPARQL](https://www.w3.org/TR/sparql11-query/)
