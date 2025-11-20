# Advanced Search and Information Retrieval System - Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Getting Started](#getting-started)
5. [Full-Text Search](#full-text-search)
6. [Semantic Search](#semantic-search)
7. [Hybrid Search](#hybrid-search)
8. [Query Understanding](#query-understanding)
9. [Ranking and Relevance](#ranking-and-relevance)
10. [Knowledge Graph Search](#knowledge-graph-search)
11. [Advanced Features](#advanced-features)
12. [Performance Optimization](#performance-optimization)
13. [API Reference](#api-reference)
14. [Best Practices](#best-practices)

---

## Overview

The IntelGraph Advanced Search System provides sophisticated search capabilities across all intelligence data types with:

- **Full-text search** with Elasticsearch/OpenSearch backend
- **Semantic search** using dense vector embeddings
- **Hybrid search** combining lexical and semantic approaches
- **Query understanding** with NLP and intent classification
- **Advanced ranking** with learning-to-rank algorithms
- **Knowledge graph integration** for relationship-based search
- **Real-time analytics** and search performance monitoring

### Key Features

✅ Multi-modal search (text, semantic, graph)\
✅ Sub-second query response times\
✅ 99.9% search availability\
✅ Horizontal scalability\
✅ Enterprise-grade security\
✅ Comprehensive analytics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Search API Layer                      │
│  (Query parsing, authentication, rate limiting, caching)    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Query Understanding Layer                   │
│  • Intent Classification  • Spell Correction                 │
│  • Entity Extraction     • Query Expansion                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Search Execution Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Full-Text   │  │   Semantic   │  │   Graph      │       │
│  │  Search      │  │   Search     │  │   Search     │       │
│  │(Elasticsearch)│  │  (Vectors)   │  │  (Neo4j)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ranking & Fusion Layer                     │
│  • Reciprocal Rank Fusion   • Learning to Rank              │
│  • Score Normalization      • Diversity & Personalization   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Results & Analytics                      │
│  • Formatted results  • Facets  • Suggestions  • Metrics    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Semantic Search Package (`@intelgraph/semantic-search`)

Provides dense vector embeddings and neural search capabilities.

**Key Classes:**
- `SentenceTransformerModel` - Local transformer models (BERT, MiniLM)
- `OpenAIEmbeddingModel` - OpenAI embeddings API
- `CohereEmbeddingModel` - Cohere embeddings API
- `SemanticSearchEngine` - Main semantic search orchestrator
- `TransformerCrossEncoder` - Re-ranking with cross-encoders

**Installation:**
```bash
cd packages/semantic-search
pnpm install
pnpm build
```

**Example Usage:**
```typescript
import { SemanticSearchEngine, SentenceTransformerModel } from '@intelgraph/semantic-search';

// Initialize embedding model
const embeddingModel = new SentenceTransformerModel(
  'Xenova/all-MiniLM-L6-v2',
  384
);

// Create search engine
const searchEngine = new SemanticSearchEngine({
  embeddingModel,
  similarityMetric: 'cosine',
  defaultTopK: 10,
});

await searchEngine.initialize();

// Add documents
await searchEngine.addDocuments([
  { id: '1', text: 'Advanced persistent threat campaign', metadata: { type: 'threat' } },
  { id: '2', text: 'Malware analysis report', metadata: { type: 'report' } },
]);

// Search
const results = await searchEngine.search('APT threat intelligence', {
  topK: 5,
  minScore: 0.7,
  rerank: true,
});
```

### 2. Vector Search Package (`@intelgraph/vector-search`)

High-performance approximate nearest neighbor (ANN) search.

**Key Classes:**
- `FAISSIndex` - Facebook AI Similarity Search
- `HNSWIndex` - Hierarchical Navigable Small World graphs

**Example Usage:**
```typescript
import { HNSWIndex } from '@intelgraph/vector-search';

const index = new HNSWIndex('my-index', {
  dimension: 384,
  metric: 'cosine',
  M: 16,
  efConstruction: 200,
  efSearch: 50,
});

await index.initialize();

// Add vectors
await index.add([
  { id: 'doc1', vector: [0.1, 0.2, ...], metadata: { title: 'Document 1' } },
  { id: 'doc2', vector: [0.3, 0.4, ...], metadata: { title: 'Document 2' } },
]);

// Search
const results = await index.search(queryVector, 10);
```

### 3. Query Understanding Package (`@intelgraph/query-understanding`)

Advanced NLP for query processing.

**Key Classes:**
- `IntentClassifier` - Classify query intent
- `QueryExpander` - Synonym and semantic expansion
- `SpellCorrector` - Spelling correction

**Example Usage:**
```typescript
import { IntentClassifier, QueryExpander, SpellCorrector } from '@intelgraph/query-understanding';

// Intent classification
const intentClassifier = new IntentClassifier();
await intentClassifier.train();

const intent = await intentClassifier.classify('find malware reports from last week');
console.log(intent);
// { intent: 'search_threat', confidence: 0.92, entities: [...] }

// Query expansion
const expander = new QueryExpander();
const expanded = await expander.expand('APT threat', {
  maxExpansions: 5,
  includeSynonyms: true,
});
console.log(expanded);
// { original: 'APT threat', expanded: ['APT threat', 'advanced persistent threat', ...] }

// Spell correction
const corrector = new SpellCorrector();
const corrected = await corrector.correct('mlaware anaylsis');
console.log(corrected);
// { original: 'mlaware anaylsis', corrected: 'malware analysis', hasErrors: true }
```

### 4. Ranking Package (`@intelgraph/ranking`)

Advanced ranking algorithms.

**Key Classes:**
- `HybridFusion` - Combine multiple ranking sources
- `LinearRanker` - Learning-to-rank model
- `MaximalMarginalRelevance` - Result diversification

**Example Usage:**
```typescript
import { HybridFusion, LinearRanker, MaximalMarginalRelevance } from '@intelgraph/ranking';

// Hybrid fusion
const lexicalResults = [...]; // From Elasticsearch
const semanticResults = [...]; // From vector search

const fusedResults = HybridFusion.fuse(
  [lexicalResults, semanticResults],
  { method: 'rrf', rrfK: 60 }
);

// Learning to rank
const ranker = new LinearRanker(['textualRelevance', 'semanticSimilarity', 'recency']);
await ranker.train(trainingExamples);

const score = ranker.predict({
  textualRelevance: 0.8,
  semanticSimilarity: 0.9,
  recency: 0.5,
});

// Diversification
const diversified = MaximalMarginalRelevance.rerank(results, 0.5, 10);
```

### 5. Knowledge Graph Search Package (`@intelgraph/knowledge-graph-search`)

Graph-based search and traversal.

**Example Usage:**
```typescript
import { GraphTraversal } from '@intelgraph/knowledge-graph-search';

const graph = new GraphTraversal(
  process.env.NEO4J_URI!,
  process.env.NEO4J_USER!,
  process.env.NEO4J_PASSWORD!
);

// Find paths between entities
const paths = await graph.findPaths(entityA, entityB, {
  maxDepth: 3,
  relationshipTypes: ['RELATED_TO', 'CONNECTED_TO'],
});

// Find shortest path
const shortestPath = await graph.shortestPath(entityA, entityB);

// Expand neighborhood
const neighborhood = await graph.expand(entityId, {
  maxDepth: 2,
  direction: 'both',
  limit: 50,
});
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Elasticsearch 8.x
- Neo4j 5.x (optional, for graph search)
- PostgreSQL 14+ (for metadata)

### Installation

```bash
# Install all packages
pnpm install

# Build packages
pnpm -r build

# Start Elasticsearch
cd infrastructure/elasticsearch
docker-compose up -d
```

### Quick Start Example

```typescript
import { ElasticsearchService } from '@intelgraph/search-engine';

const searchService = new ElasticsearchService();

// Create index
await searchService.createIndex({
  name: 'entities-2024',
  mappings: {
    properties: {
      title: { type: 'text' },
      content: { type: 'text' },
      embedding_vector: {
        type: 'dense_vector',
        dims: 384,
        similarity: 'cosine',
      },
    },
  },
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
  },
  aliases: ['entities'],
});

// Index documents
await searchService.indexDocument('entities', 'doc1', {
  title: 'Threat Intelligence Report',
  content: 'Analysis of APT campaign...',
});

// Search
const results = await searchService.search({
  query: 'APT malware',
  searchType: 'hybrid',
  pagination: { page: 1, size: 10 },
});
```

---

## Full-Text Search

Full-text search leverages Elasticsearch with optimized analyzers, tokenizers, and ranking algorithms.

### Features

- **BM25 Ranking** - Best matching algorithm
- **Field Boosting** - Prioritize specific fields
- **Phrase Queries** - Exact phrase matching
- **Fuzzy Search** - Handle typos
- **Multi-language** - Support for multiple languages
- **Highlighting** - Show matching snippets

### Example Queries

```typescript
// Basic text search
const results = await searchService.search({
  query: 'malware analysis',
  searchType: 'fulltext',
  pagination: { size: 20 },
});

// With field boosting
const boosted = await searchService.search({
  query: 'threat intelligence',
  boost: {
    fields: {
      title: 3.0,
      tags: 2.0,
      content: 1.0,
    },
  },
});

// Phrase query
const phrase = await searchService.search({
  query: '"advanced persistent threat"',
  searchType: 'fulltext',
});

// Fuzzy search
const fuzzy = await searchService.search({
  query: 'mlaware',
  searchType: 'fuzzy',
});
```

---

## Semantic Search

Semantic search uses neural embeddings to find conceptually similar content.

### Embedding Models

**Local Models:**
- `all-MiniLM-L6-v2` (384 dims) - Fast, good quality
- `all-mpnet-base-v2` (768 dims) - Higher quality
- `multi-qa-MiniLM-L6-cos-v1` - Optimized for Q&A

**API Models:**
- OpenAI `text-embedding-3-small` (1536 dims)
- Cohere `embed-english-v3.0` (1024 dims)
- Voyage AI `voyage-2` (1024 dims)

### Best Practices

1. **Normalize vectors** for cosine similarity
2. **Cache embeddings** to reduce API costs
3. **Use batch processing** for large datasets
4. **Fine-tune models** on domain data
5. **Monitor embedding quality** with similarity metrics

---

## Hybrid Search

Combine lexical and semantic search for best results.

### Fusion Methods

**Reciprocal Rank Fusion (RRF)** - Recommended
```typescript
const results = HybridFusion.reciprocalRankFusion(
  [lexicalResults, semanticResults],
  60 // k parameter
);
```

**Linear Combination**
```typescript
const results = HybridFusion.linearCombination(
  [lexicalResults, semanticResults],
  [0.7, 0.3] // weights
);
```

**Borda Count**
```typescript
const results = HybridFusion.bordaCount([
  lexicalResults,
  semanticResults,
  graphResults,
]);
```

---

## Query Understanding

Enhance queries with NLP before search execution.

### Pipeline

1. **Spell Correction** - Fix typos
2. **Intent Classification** - Determine search intent
3. **Entity Extraction** - Extract entities
4. **Query Expansion** - Add synonyms
5. **Reformulation** - Improve query structure

---

## Ranking and Relevance

### Learning to Rank (LTR)

Train custom ranking models:

```typescript
const trainingData = [
  {
    queryId: 'q1',
    documentId: 'd1',
    features: {
      textualRelevance: 0.8,
      semanticSimilarity: 0.9,
      recency: 0.7,
      authority: 0.6,
    },
    relevance: 4, // 0-4 scale
  },
  // ... more examples
];

const ranker = new LinearRanker([
  'textualRelevance',
  'semanticSimilarity',
  'recency',
  'authority',
]);

await ranker.train(trainingData);
await ranker.save('./models/ranker.json');
```

### Result Diversification

Use MMR to balance relevance and diversity:

```typescript
const diversified = MaximalMarginalRelevance.rerank(
  results,
  0.5, // lambda: 0.5 = balanced, 1.0 = relevance only, 0.0 = diversity only
  10   // top K
);
```

---

## Knowledge Graph Search

Search and traverse the knowledge graph.

### Use Cases

- Find connections between entities
- Discover related intelligence
- Path analysis
- Network visualization
- Influence mapping

---

## Advanced Features

### Faceted Search

```typescript
const results = await searchService.search({
  query: 'malware',
  facets: ['entityTypes', 'sources', 'tags', 'dateHistogram'],
  filters: {
    entityTypes: ['threat', 'malware'],
    dateRange: {
      field: 'createdAt',
      from: '2024-01-01',
      to: '2024-12-31',
    },
  },
});

// Access facets
console.log(results.facets.entityTypes.buckets);
```

### Autocomplete & Suggestions

```typescript
const suggestions = await searchService.getSuggestions('mal', {
  field: 'suggest',
  size: 5,
});
```

### Search Analytics

```typescript
const analytics = await searchAnalytics.analyze({
  timeRange: { from: '2024-01-01', to: '2024-01-31' },
  metrics: ['totalSearches', 'avgResponseTime', 'zeroResultQueries'],
});
```

---

## Performance Optimization

### Indexing Performance

- Use bulk operations
- Increase refresh interval during bulk indexing
- Disable replicas temporarily
- Use async translog

### Search Performance

- Implement caching (Redis)
- Use `search_after` for pagination
- Limit aggregation size
- Enable request cache
- Use routing for sharded indexes

### Monitoring

Key metrics to track:
- Query latency (p50, p95, p99)
- Index rate
- Search rate
- Heap usage
- CPU usage
- Disk I/O

---

## API Reference

See individual package documentation:
- [@intelgraph/semantic-search](../packages/semantic-search/README.md)
- [@intelgraph/vector-search](../packages/vector-search/README.md)
- [@intelgraph/query-understanding](../packages/query-understanding/README.md)
- [@intelgraph/ranking](../packages/ranking/README.md)
- [@intelgraph/knowledge-graph-search](../packages/knowledge-graph-search/README.md)

---

## Best Practices

### Security

✅ Implement authentication and authorization\
✅ Use API keys for production\
✅ Enable SSL/TLS\
✅ Sanitize user inputs\
✅ Rate limit search requests\
✅ Audit search logs

### Scalability

✅ Horizontal scaling with load balancing\
✅ Index lifecycle management\
✅ Shard allocation strategy\
✅ Cross-cluster replication\
✅ CDN for cached results

### Data Quality

✅ Validate data before indexing\
✅ Normalize field values\
✅ Handle missing fields\
✅ Remove duplicates\
✅ Update stale data

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [intelgraph-platform/issues](https://github.com/org/intelgraph-platform/issues)
- Documentation: [docs.intelgraph.io](https://docs.intelgraph.io)
- Community: [community.intelgraph.io](https://community.intelgraph.io)

---

## License

MIT License - see LICENSE file for details
