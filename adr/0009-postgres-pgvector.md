# ADR-0009: Postgres with pgvector for Vector Search

**Date:** 2024-01-20
**Status:** Accepted
**Area:** Data
**Owner:** Data Platform Guild
**Tags:** postgres, vector, embeddings, similarity-search, rag

## Context

Summit's AI copilot and GraphRAG features require vector similarity search for:
- **Semantic search**: Find documents/entities by meaning, not just keywords
- **RAG (Retrieval-Augmented Generation)**: Retrieve relevant context for LLM prompts
- **Similarity detection**: Identify similar entities, documents, patterns
- **Clustering & classification**: Group entities by embedding similarity

Requirements:
- Store and query high-dimensional vectors (768-1536 dimensions for OpenAI/Anthropic embeddings)
- k-NN search with cosine similarity, dot product, or L2 distance
- Hybrid search combining vector similarity with metadata filters
- Real-time indexing as new embeddings are generated
- Integration with existing Postgres transactional data

We need to decide: dedicated vector database or extend Postgres?

## Decision

We will use **PostgreSQL with pgvector extension** for vector storage and similarity search.

### Core Decision
Extend our existing Postgres infrastructure with:
- **pgvector extension**: Native vector type and indexing (HNSW, IVFFlat)
- **Hybrid queries**: Combine vector similarity with SQL filters
- **Embedding workers**: Async pipeline for generating and upserting vectors
- **Connection pooling**: Separate pool for vector queries (different resource profile)

### Key Components
- **pgvector**: Postgres extension for vector operations
- **HNSW indexes**: Hierarchical Navigable Small World graphs for fast ANN search
- **Embedding pipeline**: Workers generate embeddings via OpenAI/Anthropic APIs
- **Vector repositories**: Type-safe abstraction over vector queries

## Alternatives Considered

### Alternative 1: Pinecone (Managed Vector DB)
- **Pros:** Purpose-built, managed, fast, simple API
- **Cons:** Vendor lock-in, $70+/month, data egress costs, separate infrastructure
- **Cost/Complexity:** High cost at scale, operational simplicity

### Alternative 2: Weaviate (Self-hosted Vector DB)
- **Pros:** Open source, GraphQL API, multi-modal
- **Cons:** Another database to manage, smaller ecosystem, learning curve
- **Cost/Complexity:** Moderate cost, operational overhead

### Alternative 3: Elasticsearch with Dense Vectors
- **Pros:** Already use Elasticsearch, combined text + vector search
- **Cons:** Slower than specialized vector DBs, complex setup, resource-intensive
- **Cost/Complexity:** Leverage existing infra, suboptimal performance

## Consequences

### Positive
- Single database technology (Postgres) reduces operational complexity
- ACID transactions between vectors and metadata
- Hybrid queries (vector + metadata filters) in single SQL statement
- Mature ecosystem, monitoring, backup tooling
- Cost-effective (no separate vector DB costs)

### Negative
- Slower than purpose-built vector DBs (acceptable for our scale)
- Postgres not optimized for 100M+ vector workloads (our scale is 1-10M)
- Index builds can be memory-intensive
- Limited to Postgres-compatible distance metrics

### Operational Impact
- **Monitoring**: Track vector query latency, index build time, memory usage
- **Performance**: Tune HNSW parameters (m, ef_construction), use IVFFlat for larger datasets
- **Compliance**: Vector data subject to same Postgres backup/retention policies

## Code References

### Core Implementation
- `server/src/services/rag.ts` - RAG service using vector search
- `server/src/services/SimilarityService.ts` - Similarity search abstraction
- `server/src/workers/embeddingUpsertWorker.ts` - Async embedding generation and upsert
- `server/search/switch.ts` - Search routing (keyword vs. vector)

### Data Models
- `server/src/db/migrations/XXX-add-pgvector.sql` - pgvector extension and vector columns
- `server/src/db/migrations/XXX-vector-indexes.sql` - HNSW index creation

### API Integration
- `server/src/graphql/schema/graphrag.graphql` - GraphRAG queries using vector search
- `client/src/graphql/queries/graphrag.graphql` - Client queries for semantic search

## Tests & Validation

### Unit Tests
- `tests/unit/services/SimilarityService.test.ts` - Vector query correctness
- Expected coverage: 85%+

### Integration Tests
- `tests/integration/vector/similarity.test.ts` - End-to-end vector search
- `tests/integration/vector/hybrid-query.test.ts` - Vector + metadata filtering

### Performance Benchmarks
- Target: <100ms p95 for k=10 similarity search on 1M vectors
- Target: <500ms p95 for hybrid queries (vector + complex filters)

### CI Enforcement
- `.github/workflows/vector-tests.yml` - Vector search integration tests

## References

### Related ADRs
- ADR-0012: Copilot GraphRAG Architecture (primary consumer of vector search)
- ADR-0006: Neo4j Graph Store (complementary: graph for relationships, vectors for semantics)

### External Resources
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-01-20 | Data Platform Guild | Initial version |
