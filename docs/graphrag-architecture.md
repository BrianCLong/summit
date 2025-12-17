# GraphRAG Architecture

## Overview

GraphRAG is a Semantic RAG Knowledge Graph service that combines graph-based retrieval with document search and LLM-powered answer generation. This document describes the architecture, data flow, and design decisions.

## System Architecture

```
                                    ┌─────────────────┐
                                    │     Client      │
                                    │  (Web/API/CLI)  │
                                    └────────┬────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          GraphRAG Service                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    GraphRAGOrchestrator                           │  │
│  │  Coordinates the full RAG pipeline:                               │  │
│  │  1. Retrieval (parallel) → 2. Policy → 3. Fusion → 4. Generation  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐  │
│  │ GraphRetriever  │ │DocumentRetriever│ │  TemporalRetriever      │  │
│  │                 │ │                 │ │                         │  │
│  │ • Seed entity   │ │ • Query embed   │ │ • Time-scoped queries   │  │
│  │   matching      │ │ • Cosine search │ │ • Temporal relations    │  │
│  │ • BFS expansion │ │ • Chunk ranking │ │ • Entity timelines      │  │
│  │ • Saliency      │ │ • Citation      │ │ • Change detection      │  │
│  │   scoring       │ │   extraction    │ │                         │  │
│  │ • Path extract  │ │                 │ │                         │  │
│  └────────┬────────┘ └────────┬────────┘ └───────────┬─────────────┘  │
│           │                   │                       │                │
│           └───────────────────┴───────────────────────┘                │
│                               │                                        │
│                               ▼                                        │
│           ┌───────────────────────────────────────────┐               │
│           │            PolicyRetriever                 │               │
│           │  • Tenant isolation                        │               │
│           │  • Clearance verification                  │               │
│           │  • PII redaction                           │               │
│           │  • OPA integration                         │               │
│           └───────────────────┬───────────────────────┘               │
│                               │                                        │
│                               ▼                                        │
│           ┌───────────────────────────────────────────┐               │
│           │            ContextFusion                   │               │
│           │  • Deduplication (Jaccard similarity)      │               │
│           │  • Conflict detection & resolution         │               │
│           │  • Token-aware compression                 │               │
│           │  • Source attribution                      │               │
│           └───────────────────┬───────────────────────┘               │
│                               │                                        │
│                               ▼                                        │
│           ┌───────────────────────────────────────────┐               │
│           │           LLMIntegration                   │               │
│           │  • Answer generation with citations        │               │
│           │  • Reasoning extraction                    │               │
│           │  • Hypothesis generation                   │               │
│           │  • Cypher generation                       │               │
│           │  • Cost tracking                           │               │
│           └───────────────────┬───────────────────────┘               │
│                               │                                        │
│                               ▼                                        │
│           ┌───────────────────────────────────────────┐               │
│           │        CounterfactualEngine                │               │
│           │  • Evidence removal scenarios              │               │
│           │  • Relationship modification               │               │
│           │  • Temporal shifts                         │               │
│           │  • Sensitivity analysis                    │               │
│           │  • Minimum flipping change                 │               │
│           └───────────────────────────────────────────┘               │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Neo4j       │  │     Redis       │  │    OpenAI       │
│  Knowledge      │  │    Cache &      │  │   LLM API       │
│    Graph        │  │   Embeddings    │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Data Flow

### Query Processing Pipeline

```
1. Query Input
   ├── Natural language query
   ├── Tenant context
   └── Options (temporal scope, policy context, etc.)
          │
          ▼
2. Parallel Retrieval
   ├── GraphRetriever: Find seed entities, expand subgraph
   ├── DocumentRetriever: Embed query, search documents
   └── TemporalRetriever: Time-scoped evidence (if enabled)
          │
          ▼
3. Policy Enforcement
   ├── Tenant isolation check
   ├── Clearance level verification
   ├── Jurisdiction validation
   └── PII detection and redaction
          │
          ▼
4. Context Fusion
   ├── Deduplicate similar content
   ├── Detect conflicting information
   ├── Resolve conflicts by strategy
   └── Compress to token budget
          │
          ▼
5. Answer Generation
   ├── Build context from fused evidence
   ├── Generate answer with LLM
   ├── Extract citations and reasoning
   └── Calculate confidence
          │
          ▼
6. Counterfactual Analysis (optional)
   ├── Generate removal scenarios
   ├── Find minimum flipping change
   └── Compute robustness score
          │
          ▼
7. Response
   ├── Answer with citations
   ├── Graph evidence paths
   ├── Counterfactuals
   └── Processing metadata
```

## Component Details

### GraphRetriever

The Graph Retriever performs multi-hop traversal through the knowledge graph:

1. **Seed Entity Matching**: Uses Neo4j full-text search to find entities matching the query
2. **Subgraph Expansion**: BFS traversal up to N hops from seed entities
3. **Saliency Scoring**: Combines PageRank and Betweenness Centrality (via Neo4j GDS)
4. **Path Extraction**: Finds shortest paths between high-saliency nodes
5. **Evidence Building**: Creates evidence chunks with graph paths and citations

Key features:
- Tenant isolation via WHERE clauses
- Relationship type filtering
- Configurable hop depth and node limits
- Graceful degradation if GDS unavailable

### DocumentRetriever

The Document Retriever performs semantic search over indexed documents:

1. **Indexing**: Chunks documents, generates embeddings, stores in memory/Redis
2. **Query Embedding**: Embeds the query using OpenAI embeddings
3. **Similarity Search**: Cosine similarity against stored embeddings
4. **Ranking**: Filters by minimum relevance and limits results

Key features:
- Configurable chunking (size, overlap)
- Embedding caching in Redis
- Sentence-boundary-aware chunking

### TemporalRetriever

The Temporal Retriever adds time awareness:

1. **Temporal Scoping**: Filters entities/relationships by time range
2. **Timeline Building**: Tracks entity changes over time
3. **Temporal Relations**: Computes Allen's interval relations (before, after, during, etc.)
4. **Change Detection**: Finds entities modified in a time period

### PolicyRetriever

The Policy Retriever enforces access control:

1. **OPA Integration**: Calls OPA for policy decisions when configured
2. **Local Policies**: Falls back to built-in rules
3. **Redaction**: Applies regex-based redaction for PII
4. **Audit Logging**: Records all policy decisions

Supported policies:
- Tenant isolation
- Clearance levels (UNCLASSIFIED → TOP_SECRET)
- Jurisdiction restrictions
- PII protection (SSN, credit cards, email, phone)

### ContextFusion

The Context Fusion engine merges evidence:

1. **Deduplication**: Jaccard similarity with configurable threshold
2. **Conflict Detection**: Identifies contradictory statements about entities
3. **Conflict Resolution**: Strategies: highest_confidence, newest, merge
4. **Compression**: Truncates to fit token budget while preserving key content

### LLMIntegration

The LLM Integration layer abstracts LLM operations:

1. **Answer Generation**: Generates answers with citation markers
2. **Embedding**: Creates text embeddings for semantic search
3. **Cypher Generation**: Converts natural language to Cypher
4. **Hypothesis Generation**: Generates hypotheses from evidence
5. **Summarization**: Condenses multiple evidence chunks

Key features:
- Cost tracking per operation
- Configurable model and parameters
- Reasoning extraction support

### CounterfactualEngine

The Counterfactual Engine generates "what if" scenarios:

1. **Evidence Removal**: What if we didn't have this evidence?
2. **Relationship Modification**: What if this connection didn't exist?
3. **Temporal Shifts**: What if we only considered earlier evidence?
4. **Minimum Flipping**: What's the smallest change to flip the answer?
5. **Sensitivity Analysis**: Which evidence is most influential?

## Data Models

### Evidence Chunk

```typescript
interface EvidenceChunk {
  id: string;
  content: string;
  embedding?: number[];
  citations: CitationSource[];
  graphPaths: GraphPath[];
  relevanceScore: number;
  temporalContext?: {
    validFrom?: string;
    validTo?: string;
    eventTime?: string;
  };
  policyLabels?: string[];
  tenantId: string;
}
```

### Citation Source

```typescript
interface CitationSource {
  id: string;
  documentId: string;
  documentTitle?: string;
  spanStart: number;
  spanEnd: number;
  content: string;
  confidence: number;
  sourceType: 'document' | 'graph' | 'external' | 'derived';
  metadata?: Record<string, any>;
}
```

### Graph Path

```typescript
interface GraphPath {
  id: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    properties: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    type: string;
    sourceId: string;
    targetId: string;
    properties: Record<string, any>;
  }>;
  pathLength: number;
  confidence: number;
  saliencyScore: number;
  rationale?: string;
}
```

## Performance Considerations

### Caching Strategy

1. **Embedding Cache**: Redis-backed cache for query and document embeddings
2. **Graph Projections**: Ephemeral GDS projections cleaned after use
3. **Result Cache**: Optional caching of full query results

### Scalability

1. **Parallel Retrieval**: Graph, document, and temporal retrieval run concurrently
2. **Batched Indexing**: Documents indexed in configurable batches
3. **Token Budgeting**: Context compressed to fit LLM limits

### Optimization Opportunities

1. **Vector Index**: Could use Neo4j vector index or dedicated vector DB (Pinecone, Weaviate)
2. **Persistent GDS Projections**: For frequently-queried subgraphs
3. **Streaming**: Could stream results for long-running queries

## Security Model

### Authentication

The service expects authentication to be handled by the API gateway. Tenant ID and user ID are passed in requests.

### Authorization

1. **Tenant Isolation**: All queries scoped to tenant
2. **ABAC**: Attribute-based access control via OPA
3. **Classification**: Support for clearance levels

### Data Protection

1. **PII Redaction**: Automatic detection and redaction
2. **Audit Logging**: All policy decisions logged
3. **Provenance**: Citation chain-of-custody tracking

## Observability

### Metrics

- Retrieval latency (p50, p95, p99)
- Token usage per operation
- Cost tracking
- Cache hit rates
- Policy decision counts

### Tracing

OpenTelemetry instrumentation for:
- Request spans
- Component-level spans
- LLM call tracing
- Database query tracing

### Logging

Structured logging with:
- Request IDs
- Tenant context
- Operation metadata
- Error details

## Future Enhancements

1. **Streaming Answers**: Stream LLM responses for better UX
2. **Multi-modal Evidence**: Support for images, audio, video
3. **Federated Retrieval**: Query across multiple knowledge graphs
4. **Active Learning**: Learn from user feedback on citations
5. **Graph Neural Networks**: GNN-based entity embeddings
6. **Hybrid Search**: Combine keyword and semantic search
