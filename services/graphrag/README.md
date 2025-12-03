# GraphRAG Service

Semantic RAG Knowledge Graph Service for IntelGraph - Evidence-first retrieval with graph reasoning, citations, and counterfactual analysis.

## Overview

GraphRAG combines the power of knowledge graphs with retrieval-augmented generation (RAG) to provide:

- **Graph-Aware Retrieval**: Multi-hop traversal through knowledge graphs with saliency scoring
- **Semantic Document Search**: Embedding-based document retrieval with cosine similarity
- **Temporal Reasoning**: Time-scoped evidence retrieval and temporal relationships
- **Policy-Aware Access**: ABAC enforcement with OPA integration and PII redaction
- **Evidence Fusion**: Deduplication, conflict resolution, and context compression
- **Citation Management**: Evidence tracking with provenance and validation
- **Counterfactual Analysis**: "What if" scenarios and sensitivity analysis
- **LLM Integration**: Answer generation with citations and reasoning

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphRAG Orchestrator                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Graph     │  │  Document   │  │     Temporal        │  │
│  │  Retriever  │  │  Retriever  │  │     Retriever       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          ▼                                   │
│                 ┌─────────────────┐                         │
│                 │ Policy Retriever │                         │
│                 └─────────────────┘                         │
│                          │                                   │
│                          ▼                                   │
│                 ┌─────────────────┐                         │
│                 │  Context Fusion  │                         │
│                 └─────────────────┘                         │
│                          │                                   │
│                          ▼                                   │
│                 ┌─────────────────┐                         │
│                 │ LLM Integration  │                         │
│                 └─────────────────┘                         │
│                          │                                   │
│                          ▼                                   │
│                 ┌─────────────────┐                         │
│                 │  Counterfactual  │                         │
│                 │     Engine       │                         │
│                 └─────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Neo4j 5.x with Graph Data Science library
- Redis 7+
- OpenAI API key

### Installation

```bash
cd services/graphrag
pnpm install
```

### Configuration

Set the following environment variables:

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Retrieval settings
MAX_HOPS=3
MAX_NODES=1000
MAX_DOCUMENTS=20
MIN_RELEVANCE=0.3

# Generation settings
MAX_TOKENS=1000
TEMPERATURE=0.7

# Policy (optional)
POLICY_ENABLED=true
OPA_ENDPOINT=http://localhost:8181

# Server
PORT=8002
```

### Running the Service

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Health Check

```bash
curl http://localhost:8002/health
```

## API Reference

### REST Endpoints

#### POST /query

Execute a GraphRAG query with retrieval, fusion, and generation.

```json
{
  "query": "What is the relationship between Entity A and Entity B?",
  "tenantId": "tenant-1",
  "maxHops": 3,
  "maxNodes": 1000,
  "maxDocuments": 20,
  "minRelevance": 0.3,
  "includeCitations": true,
  "includeGraphPaths": true,
  "includeCounterfactuals": false,
  "includeSensitivityAnalysis": false
}
```

#### POST /nl-to-cypher

Convert natural language to Cypher query.

```json
{
  "query": "Find all people who work at Company X",
  "tenantId": "tenant-1"
}
```

#### POST /index

Index a document for retrieval.

```json
{
  "documentId": "doc-1",
  "title": "Research Report",
  "content": "Full document content...",
  "tenantId": "tenant-1",
  "metadata": {}
}
```

### GraphQL API

The service also exposes a GraphQL API. See `src/graphql/schema.graphql` for the full schema.

```graphql
mutation {
  graphRAGQuery(input: {
    query: "What is the relationship between Entity A and Entity B?"
    tenantId: "tenant-1"
    includeCitations: true
    includeCounterfactuals: true
  }) {
    answer {
      answer
      citations {
        index
        source {
          documentTitle
          content
          confidence
        }
      }
      confidence
    }
    counterfactuals {
      change
      wouldFlipAnswer
      explanation
    }
  }
}
```

## Components

### Graph Retriever

Multi-hop graph traversal with saliency scoring.

```typescript
import { GraphRetriever } from '@intelgraph/graphrag';

const retriever = new GraphRetriever(neo4jDriver, {
  maxHops: 3,
  maxNodes: 1000,
  minRelevance: 0.3,
  useBetweenness: true,
  usePageRank: true,
});

const result = await retriever.retrieve({
  query: 'Find connections to Entity A',
  tenantId: 'tenant-1',
  maxHops: 3,
});
```

### Document Retriever

Semantic document search with embeddings.

```typescript
import { DocumentRetriever } from '@intelgraph/graphrag';

const retriever = new DocumentRetriever(openaiApiKey, redisUrl, {
  embeddingModel: 'text-embedding-3-small',
  maxDocuments: 20,
});

await retriever.indexDocument(docId, title, content, tenantId);
const results = await retriever.retrieve(query);
```

### Citation Manager

Evidence tracking with provenance.

```typescript
import { CitationManager } from '@intelgraph/graphrag';

const manager = new CitationManager(neo4jDriver);

const citation = await manager.createCitation(
  entityId,
  documentId,
  content,
  spanStart,
  spanEnd,
  confidence,
);

const validation = await manager.validateCitation(citationId);
```

### Context Fusion

Merge evidence from multiple sources.

```typescript
import { ContextFusion } from '@intelgraph/graphrag';

const fusion = new ContextFusion({
  maxTokens: 4000,
  conflictResolutionStrategy: 'highest_confidence',
});

const fused = await fusion.fuse(graphEvidence, documentEvidence, temporalEvidence);
```

### Counterfactual Engine

Generate "what if" scenarios.

```typescript
import { CounterfactualEngine } from '@intelgraph/graphrag';

const engine = new CounterfactualEngine(neo4jDriver, llm);

const counterfactuals = await engine.generateCounterfactuals(answer, evidence);
const sensitivity = await engine.analyzeSensitivity(answer, evidence);
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test GraphRetriever
```

## Observability

The service includes OpenTelemetry instrumentation for:

- Request tracing
- Retrieval latency metrics
- Token usage tracking
- Cost monitoring

Metrics are exported to:
- Prometheus (via `/metrics` endpoint)
- OTLP (configurable)

## Performance Targets

Based on the Sprint plan, the service targets:

| Operation | p95 Latency |
|-----------|-------------|
| NL→Cypher compile | < 400ms |
| Policy check | < 150ms |
| Graph query (3-hop, 50k nodes) | < 1.5s |
| RAG answer generation | < 2.5s with citations |

## Security

### Policy Enforcement

The service integrates with OPA for policy decisions:

- Tenant isolation
- Clearance level checks
- Jurisdiction restrictions
- PII redaction

### Redaction Rules

Built-in redaction for:
- Social Security Numbers
- Credit card numbers
- Email addresses
- Phone numbers

Custom redaction rules can be added:

```typescript
policyRetriever.addRedactionRule({
  pattern: /custom-pattern/g,
  replacement: '[REDACTED]',
  reason: 'Custom redaction',
  appliesTo: ['custom_field'],
});
```

## License

MIT License - Copyright (c) 2025 IntelGraph
