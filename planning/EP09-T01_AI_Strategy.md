# EP09-T01 AI & Embedding Strategy

## Strategy
We employ a **Retrieval-Augmented Generation (RAG)** architecture grounded in the Knowledge Graph.
*   **Vector Store**: Neo4j Vector Index (co-located with the graph).
*   **Embeddings**: `text-embedding-3-small` (OpenAI) or `bge-m3` (Open Source/Self-hosted).
*   **LLM**: GPT-4o (Cloud) or Llama-3-70b (On-prem).

## Embedding Pipeline
1.  **Chunking**: Documents are split into semantic chunks (overlap: 20%).
2.  **Entity Linking**: Chunks are linked to `CanonicalEntityType` nodes in the graph (MENTIONS edge).
3.  **Vectorization**: Text chunks + Entity metadata are embedded.
4.  **Indexing**: Vectors stored in Neo4j with HNSW index.

## RAG Flow
1.  **Query Analysis**: User query is decomposed into intent + entities.
2.  **Hybrid Search**:
    *   **Vector Search**: Semantic similarity (Cosine).
    *   **Graph Traversal**: 2-hop neighborhood expansion from identified entities.
3.  **Context Window**: Retrieved chunks + graph structure (Cypher result) form the context.
4.  **Generation**: LLM generates answer with citations (linked to source Documents).

## Evaluation
*   **RAGAS**: Faithfulness, Answer Relevance, Context Recall.
*   **Human Feedback**: Thumbs up/down on generated answers.
