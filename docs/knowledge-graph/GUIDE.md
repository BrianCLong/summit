# Knowledge Graph Platform Guide

## Overview

Summit's Knowledge Graph platform provides enterprise-grade graph database infrastructure with advanced entity resolution, relationship mapping, semantic reasoning, and graph analytics capabilities. This guide covers installation, configuration, and usage.

## Table of Contents

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Entity Management](#entity-management)
6. [Relationship Mapping](#relationship-mapping)
7. [Entity Resolution](#entity-resolution)
8. [Graph Analytics](#graph-analytics)
9. [Semantic Reasoning](#semantic-reasoning)
10. [Query Language](#query-language)
11. [Performance Tuning](#performance-tuning)
12. [Best Practices](#best-practices)

## Architecture

The Knowledge Graph platform consists of several integrated components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  KG Service  │  Entity Resolution Service  │  Analytics API │
├─────────────────────────────────────────────────────────────┤
│                      Package Layer                           │
│  @summit/knowledge-graph  │  @summit/entity-resolution       │
│  @summit/graph-analytics  │  @summit/ontology-management     │
│  @summit/semantic-reasoning                                  │
├─────────────────────────────────────────────────────────────┤
│                     Storage Layer                            │
│  Neo4j  │  Triple Store  │  Version Store  │  Cache (Redis) │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **Knowledge Graph Core**: Graph database abstraction with Neo4j backend
- **Triple Store**: RDF/OWL support for semantic web standards
- **Entity Resolution**: NER, matching, and deduplication
- **Graph Analytics**: Centrality, clustering, community detection
- **Ontology Management**: Schema definition and validation
- **Semantic Reasoning**: Rule-based and probabilistic inference
- **Versioning**: Temporal queries and change tracking

## Installation

### Prerequisites

- Node.js >= 18.0.0
- Neo4j >= 5.0 (or compatible graph database)
- Redis >= 7.0 (optional, for caching)
- PostgreSQL >= 15 (optional, for metadata)

### Install Packages

```bash
# Install all knowledge graph packages
pnpm add @summit/knowledge-graph \
         @summit/entity-resolution \
         @summit/graph-analytics \
         @summit/ontology-management \
         @summit/semantic-reasoning

# Or install workspace packages
pnpm install
```

### Setup Neo4j

```bash
# Using Docker
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest

# Or install locally
# https://neo4j.com/download/
```

## Quick Start

### Initialize Knowledge Graph

```typescript
import { KnowledgeGraph } from '@summit/knowledge-graph';

const kg = new KnowledgeGraph({
  database: {
    type: 'neo4j',
    uri: 'bolt://localhost:7687',
    auth: {
      username: 'neo4j',
      password: 'password'
    }
  },
  tripleStore: {
    backend: 'memory',
    namespace: 'http://summit.io/kg#'
  },
  enableVersioning: true
});

await kg.initialize();
```

### Add Entities

```typescript
// Add a person entity
const personId = await kg.addEntity({
  id: 'person:john_doe',
  type: 'Person',
  properties: {
    name: 'John Doe',
    age: 35,
    occupation: 'Software Engineer',
    email: 'john.doe@example.com'
  },
  labels: ['Person', 'Employee']
});

// Add an organization entity
const orgId = await kg.addEntity({
  id: 'org:acme_corp',
  type: 'Organization',
  properties: {
    name: 'Acme Corporation',
    industry: 'Technology',
    founded: 1999,
    employees: 5000
  },
  labels: ['Organization', 'Company']
});
```

### Create Relationships

```typescript
// Create employment relationship
await kg.addRelationship({
  from: 'person:john_doe',
  to: 'org:acme_corp',
  type: 'WORKS_AT',
  properties: {
    since: '2020-01-15',
    position: 'Senior Engineer',
    department: 'Engineering'
  }
});

// Create location relationship
await kg.addRelationship({
  from: 'org:acme_corp',
  to: 'location:san_francisco',
  type: 'LOCATED_IN',
  properties: {
    headquarters: true
  }
});
```

### Query the Graph

```typescript
// Find all people working at Acme Corp
const employees = await kg.query({
  match: '(p:Person)-[:WORKS_AT]->(o:Organization)',
  where: { 'o.name': 'Acme Corporation' },
  return: ['p', 'o'],
  limit: 100
});

// Or use raw Cypher
const result = await kg.query(`
  MATCH (p:Person)-[r:WORKS_AT]->(o:Organization)
  WHERE o.name = 'Acme Corporation'
  RETURN p, r, o
  ORDER BY p.name
  LIMIT 100
`);
```

## Core Concepts

### Entities (Nodes)

Entities represent objects in your domain:

```typescript
interface GraphNode {
  id: string;              // Unique identifier
  type: string;            // Primary type
  properties: object;      // Arbitrary properties
  labels?: string[];       // Multiple classifications
  metadata?: object;       // System metadata
}
```

### Relationships (Edges)

Relationships connect entities:

```typescript
interface GraphEdge {
  from: string;            // Source entity ID
  to: string;              // Target entity ID
  type: string;            // Relationship type
  properties?: object;     // Relationship properties
  weight?: number;         // Edge weight (default: 1.0)
  directed?: boolean;      // Directionality (default: true)
}
```

### Triple Store

RDF triples for semantic web integration:

```typescript
const tripleStore = kg.getTripleStore();

// Add triples
tripleStore.addTriple({
  subject: 'person:john_doe',
  predicate: 'rdf:type',
  object: 'Person'
});

// Query with SPARQL
const results = await tripleStore.sparqlQuery(`
  SELECT ?person ?name
  WHERE {
    ?person rdf:type Person .
    ?person name ?name .
  }
`);
```

## Entity Management

### Creating Entities

```typescript
// Basic entity
await kg.addEntity({
  id: 'product:widget_x',
  type: 'Product',
  properties: {
    name: 'Widget X',
    price: 99.99,
    inStock: true
  }
});

// Entity with multiple labels
await kg.addEntity({
  id: 'person:jane_smith',
  type: 'Person',
  labels: ['Person', 'Customer', 'VIP'],
  properties: {
    name: 'Jane Smith',
    tier: 'Platinum',
    lifetimeValue: 50000
  }
});
```

### Updating Entities

```typescript
// Update properties
await kg.updateEntity('person:john_doe', {
  age: 36,
  lastUpdated: new Date().toISOString()
});

// Partial updates are merged
await kg.updateEntity('person:john_doe', {
  phone: '+1-555-0123'
});
```

### Deleting Entities

```typescript
// Delete entity and all relationships
await kg.deleteEntity('person:john_doe');
```

### Batch Operations

```typescript
// Add multiple entities efficiently
const entities = [
  { id: 'e1', type: 'Person', properties: { name: 'Alice' } },
  { id: 'e2', type: 'Person', properties: { name: 'Bob' } },
  { id: 'e3', type: 'Person', properties: { name: 'Charlie' } }
];

await Promise.all(entities.map(e => kg.addEntity(e)));
```

## Relationship Mapping

### Relationship Types

Define clear relationship types:

```typescript
// Social relationships
await kg.addRelationship({
  from: 'person:alice',
  to: 'person:bob',
  type: 'KNOWS',
  properties: { since: '2015-03-20', closeness: 0.8 }
});

await kg.addRelationship({
  from: 'person:alice',
  to: 'person:charlie',
  type: 'FRIEND_OF',
  properties: { mutualFriends: 15 }
});

// Hierarchical relationships
await kg.addRelationship({
  from: 'person:alice',
  to: 'person:bob',
  type: 'REPORTS_TO',
  properties: { department: 'Engineering' }
});

// Transactional relationships
await kg.addRelationship({
  from: 'customer:alice',
  to: 'product:widget_x',
  type: 'PURCHASED',
  properties: {
    date: '2024-01-15',
    quantity: 2,
    amount: 199.98
  }
});
```

### Finding Relationships

```typescript
// Find direct relationships
const relationships = await kg.findRelationshipsBetween(
  'person:alice',
  'person:bob'
);

// Get all neighbors
const neighbors = await kg.getNeighbors('person:alice', 'both');

// Get incoming relationships only
const incoming = await kg.getNeighbors('person:alice', 'in');

// Get outgoing relationships only
const outgoing = await kg.getNeighbors('person:alice', 'out');
```

## Entity Resolution

### Entity Extraction

Extract entities from unstructured text:

```typescript
import { EntityExtractor, EntityType } from '@summit/entity-resolution';

const extractor = new EntityExtractor({
  types: [EntityType.PERSON, EntityType.ORGANIZATION, EntityType.LOCATION],
  confidenceThreshold: 0.7
});

const text = `
  John Doe, CEO of Acme Corporation based in San Francisco,
  announced a new partnership with TechStart Inc.
`;

const result = await extractor.extract(text);

console.log(`Found ${result.entities.length} entities:`);
result.entities.forEach(entity => {
  console.log(`- ${entity.type}: "${entity.text}" (confidence: ${entity.confidence})`);
});
```

### Entity Matching

Match similar entities:

```typescript
import { EntityMatcher, MatchingMethod } from '@summit/entity-resolution';

const matcher = new EntityMatcher({
  threshold: 0.8,
  methods: [
    MatchingMethod.EXACT,
    MatchingMethod.FUZZY,
    MatchingMethod.PHONETIC,
    MatchingMethod.PROBABILISTIC
  ]
});

const entity1 = {
  id: 'e1',
  type: EntityType.PERSON,
  text: 'John Doe',
  attributes: { firstName: 'John', lastName: 'Doe' },
  confidence: 0.9
};

const entity2 = {
  id: 'e2',
  type: EntityType.PERSON,
  text: 'Jon Doe',
  attributes: { firstName: 'Jon', lastName: 'Doe' },
  confidence: 0.85
};

const match = await matcher.matchPair(entity1, entity2);

if (match) {
  console.log(`Match score: ${match.score.toFixed(2)}`);
  console.log(`Method: ${match.method}`);
  console.log(`Reasons:`);
  match.reasons.forEach(reason => console.log(`  - ${reason}`));
}
```

### Entity Deduplication

Identify and merge duplicate entities:

```typescript
import {
  EntityDeduplicator,
  ClusteringMethod
} from '@summit/entity-resolution';

const deduplicator = new EntityDeduplicator(
  {
    autoMergeThreshold: 0.95,
    reviewThreshold: 0.75,
    clusteringMethod: ClusteringMethod.CONNECTED_COMPONENTS,
    preserveProvenance: true
  },
  matcher
);

// Deduplicate entities
const results = await deduplicator.deduplicate(entities);

// Process results
for (const result of results) {
  if (result.cluster) {
    console.log(`Cluster of ${result.cluster.members.length} entities:`);
    console.log(`Canonical: ${result.cluster.canonicalEntity.text}`);

    // Auto-merge if recommended
    if (result.recommendations.includes('AUTO_MERGE')) {
      const merged = deduplicator.mergeEntities(result.cluster.members);
      await kg.addEntity(merged);
    }
  }
}

// Get statistics
const stats = deduplicator.getStatistics(results);
console.log('Deduplication Statistics:', stats);
```

## Graph Analytics

### Centrality Metrics

Identify important nodes:

```typescript
import { GraphAnalyzer } from '@summit/graph-analytics';
import Graph from 'graphology';

// Create graph from knowledge graph data
const graph = new Graph();

// Add nodes and edges from KG
// ... populate graph ...

const analyzer = new GraphAnalyzer(graph);

// Calculate PageRank
const pagerank = analyzer.calculatePageRank({
  alpha: 0.85,
  maxIterations: 100
});

console.log('Top 10 nodes by PageRank:');
Object.entries(pagerank)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10)
  .forEach(([node, score]) => {
    console.log(`${node}: ${score.toFixed(4)}`);
  });

// Calculate all centrality metrics
const centrality = analyzer.calculateAllCentrality();
```

### Community Detection

Find clusters and communities:

```typescript
// Detect communities
const communities = analyzer.detectCommunities();

console.log(`Found ${communities.communityCount} communities`);
console.log(`Modularity: ${communities.modularity.toFixed(3)}`);

// Group nodes by community
const communityMap = new Map<number, string[]>();
communities.communities.forEach((communityId, nodeId) => {
  if (!communityMap.has(communityId)) {
    communityMap.set(communityId, []);
  }
  communityMap.get(communityId)!.push(nodeId);
});

// Display communities
communityMap.forEach((members, id) => {
  console.log(`Community ${id}: ${members.length} members`);
});
```

### Path Finding

Find shortest paths:

```typescript
// Find shortest path
const path = analyzer.shortestPath('person:alice', 'person:charlie');

if (path) {
  console.log('Shortest path:', path.join(' -> '));
} else {
  console.log('No path found');
}

// Get k-hop neighbors
const kHopNeighbors = analyzer.getKHopNeighbors('person:alice', 2);
console.log(`2-hop neighbors: ${kHopNeighbors.size}`);
```

## Semantic Reasoning

### Define Rules

Create inference rules:

```typescript
import { ReasoningEngine } from '@summit/semantic-reasoning';

const reasoner = new ReasoningEngine();

// Add transitivity rule for "knows" relationship
reasoner.addRule({
  id: 'transitivity_knows',
  name: 'Transitive Knows Relationship',
  priority: 100,
  condition: (facts) => {
    return facts.knows && facts.knows.length >= 2;
  },
  action: (facts) => {
    const inferred = {};
    // Infer transitive relationships
    // A knows B, B knows C => A knows C
    return inferred;
  }
});

// Add type inference rule
reasoner.addRule({
  id: 'infer_customer',
  name: 'Infer Customer Type',
  priority: 90,
  condition: (facts) => {
    return facts.hasPurchased && facts.purchaseCount > 0;
  },
  action: (facts) => {
    return {
      type: 'Customer',
      customerSince: facts.firstPurchaseDate
    };
  }
});
```

### Perform Inference

```typescript
// Infer new facts
const inferenceResult = reasoner.infer('person:alice', {
  hasPurchased: true,
  purchaseCount: 5,
  firstPurchaseDate: '2023-01-15'
});

console.log('Inferred properties:');
inferenceResult.inferred.forEach(({ property, value, confidence }) => {
  console.log(`- ${property}: ${value} (confidence: ${confidence})`);
});

console.log('Applied rules:', inferenceResult.rules);
```

## Query Language

### Cypher Queries

Use Neo4j's Cypher query language:

```cypher
// Find friends of friends
MATCH (person:Person)-[:FRIEND_OF]->(:Person)-[:FRIEND_OF]->(fof:Person)
WHERE person.name = 'Alice'
  AND NOT (person)-[:FRIEND_OF]->(fof)
  AND person <> fof
RETURN DISTINCT fof.name AS name, count(*) AS mutualFriends
ORDER BY mutualFriends DESC
LIMIT 10
```

### Structured Queries

Use the query builder:

```typescript
const results = await kg.query({
  match: '(p:Person)-[:WORKS_AT]->(o:Organization)-[:LOCATED_IN]->(l:Location)',
  where: {
    'l.city': 'San Francisco',
    'p.age': { $gte: 25, $lte: 40 }
  },
  return: ['p.name', 'o.name', 'l.city'],
  orderBy: [{ field: 'p.name', direction: 'ASC' }],
  limit: 50
});
```

## Performance Tuning

### Indexing

Create indexes for frequently queried properties:

```typescript
// Create index on Person.name
await kg.createIndex('Person', ['name']);

// Create composite index
await kg.createIndex('Person', ['firstName', 'lastName']);

// Create index on relationship properties
await kg.database.query(`
  CREATE INDEX IF NOT EXISTS FOR ()-[r:WORKS_AT]-()
  ON (r.since)
`);
```

### Caching

Enable caching for frequent queries:

```typescript
// Use Redis for caching
const kg = new KnowledgeGraph({
  database: { /* ... */ },
  cache: {
    enabled: true,
    type: 'redis',
    uri: 'redis://localhost:6379',
    ttl: 3600
  }
});
```

### Batch Processing

Process large datasets efficiently:

```typescript
// Batch insert
const batchSize = 1000;
for (let i = 0; i < entities.length; i += batchSize) {
  const batch = entities.slice(i, i + batchSize);
  await Promise.all(batch.map(e => kg.addEntity(e)));
}
```

## Best Practices

### 1. Schema Design

- Define clear entity types and relationship types
- Use consistent naming conventions
- Document your ontology
- Version your schema changes

### 2. Data Quality

- Validate entities before insertion
- Use entity resolution to prevent duplicates
- Implement data quality checks
- Track provenance and lineage

### 3. Performance

- Create appropriate indexes
- Use batch operations for bulk imports
- Cache frequently accessed data
- Monitor query performance

### 4. Security

- Implement access control at the service layer
- Encrypt sensitive properties
- Audit all modifications
- Use secure connections (TLS)

### 5. Monitoring

- Track graph statistics
- Monitor query performance
- Set up alerts for anomalies
- Regular backup and recovery testing

## Next Steps

- See [ONTOLOGY.md](./ONTOLOGY.md) for ontology design
- See [QUERIES.md](./QUERIES.md) for advanced query patterns
- Check the API reference for detailed documentation
- Join our community for support and discussions
