# @intelgraph/knowledge-graph

Advanced knowledge graph construction with semantic understanding capabilities.

## Features

- ✅ Ontology and schema management with versioning
- ✅ Entity extraction and Named Entity Recognition (NER)
- ✅ Entity linking to external knowledge bases (DBpedia, Wikidata)
- ✅ Semantic relationship extraction
- ✅ Event and temporal relation extraction
- ✅ Knowledge graph reasoning with inference rules
- ✅ Contradiction detection
- ✅ Missing link prediction
- ✅ SPARQL endpoint for semantic queries
- ✅ Graph embeddings (Node2Vec, DeepWalk, GNN)
- ✅ Temporal knowledge graphs
- ✅ Knowledge fusion and conflict resolution
- ✅ Automated extraction pipelines
- ✅ Interactive visualization

## Installation

```bash
pnpm add @intelgraph/knowledge-graph
```

## Quick Start

```typescript
import neo4j from 'neo4j-driver';
import {
  OntologyManager,
  KnowledgeGraphManager,
  GraphEmbeddings,
  TemporalKnowledgeGraph,
} from '@intelgraph/knowledge-graph';

// Initialize Neo4j driver
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// Create ontology
const ontologyManager = new OntologyManager(driver);
const ontology = await ontologyManager.importStandardOntology('FOAF');

// Create entities
const kgManager = new KnowledgeGraphManager(driver);
const entity = await kgManager.createEntity({
  type: 'Person',
  namespace: 'http://xmlns.com/foaf/0.1/',
  labels: ['Person', 'Entity'],
  properties: {
    name: 'John Smith',
    email: 'john@example.com',
  },
  confidence: 0.95,
  provenance: {
    sourceId: 'document-123',
    sourceType: 'document',
    extractedAt: new Date().toISOString(),
  },
});

// Generate embeddings
const embeddings = new GraphEmbeddings(driver);
const node2vec = await embeddings.generateNode2Vec({
  dimensions: 128,
  walkLength: 80,
  numWalks: 10,
  windowSize: 10,
});

// Create temporal snapshot
const temporal = new TemporalKnowledgeGraph(driver);
await temporal.createTemporalSnapshot(
  entity.id,
  new Date().toISOString(),
  { role: 'Analyst', department: 'Intelligence' }
);
```

## Documentation

See [SEMANTIC_ANALYSIS.md](../../docs/knowledge-graph/SEMANTIC_ANALYSIS.md) for comprehensive documentation.

## License

MIT
