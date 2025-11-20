# @summit/knowledge-graph

Enterprise knowledge graph database and storage infrastructure with advanced graph partitioning, versioning, and temporal query capabilities.

## Features

- **Graph Database Implementation**: Support for Neo4j, JanusGraph, and in-memory graph stores
- **Triple Store**: RDF/OWL support with SPARQL query capabilities
- **Property Graph Model**: Flexible schema with rich property support
- **Distributed Graph Partitioning**: Scale across multiple nodes
- **Graph Versioning**: Track changes over time with temporal queries
- **Multi-tenant Isolation**: Secure graph data separation
- **High-performance Indexing**: Optimized for fast graph traversals
- **Backup & Recovery**: Comprehensive disaster recovery capabilities

## Installation

```bash
pnpm add @summit/knowledge-graph
```

## Usage

```typescript
import { KnowledgeGraph, GraphDatabase, TripleStore } from '@summit/knowledge-graph';

// Initialize graph database
const graphDb = new GraphDatabase({
  type: 'neo4j',
  uri: 'bolt://localhost:7687',
  auth: { username: 'neo4j', password: 'password' }
});

// Create knowledge graph
const kg = new KnowledgeGraph(graphDb);

// Add entities and relationships
await kg.addEntity({
  id: 'person:john',
  type: 'Person',
  properties: { name: 'John Doe', age: 30 }
});

await kg.addRelationship({
  from: 'person:john',
  to: 'company:acme',
  type: 'WORKS_AT',
  properties: { since: '2020-01-01' }
});

// Query graph
const results = await kg.query({
  match: '(p:Person)-[:WORKS_AT]->(c:Company)',
  where: { 'p.age': { $gt: 25 } },
  return: ['p', 'c']
});

// Temporal queries
const historicalState = await kg.getVersionAt(new Date('2023-01-01'));
```

## Architecture

### Graph Database Layer
- Neo4j driver integration
- JanusGraph support
- In-memory graph implementation
- Connection pooling and management

### Storage Infrastructure
- Property graph storage
- RDF triple store
- Graph partitioning strategies
- Distributed storage coordination

### Indexing System
- Full-text search on properties
- Graph structure indexing
- Composite indexes
- Spatial indexes for geo data

### Versioning System
- Event sourcing for changes
- Snapshot-based versioning
- Temporal query support
- Change tracking and auditing

## API Reference

See [API Documentation](./docs/API.md) for detailed API reference.

## License

MIT
