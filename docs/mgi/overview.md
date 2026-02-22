# Multi-Granular Indexing Framework (MGI)

## Overview
Based on "KET-RAG: A Cost-Efficient Multi-Granular Indexing Framework for Graph-RAG" (KDD '25), MGI aims to reduce indexing costs while maintaining retrieval quality by utilizing a hybrid graph structure.

## Core Concepts

### 1. Multi-Granular Index
*   **L2: KG Skeleton (High Fidelity)**: Built from a small set of "key chunks" using LLM extraction. Stored in Neo4j.
*   **L1: Text–Keyword Bipartite Graph (Lightweight)**: Built from *all* chunks using deterministic keyword extraction. Stored in Neo4j (`(:Chunk)-[:HAS_KEYWORD]->(:Keyword)`).
*   **L0: Vector Embeddings**: Existing vector store for semantic breadth.

### 2. Retrieval Strategy
*   **Vector Retrieval**: Initial candidate set.
*   **Skeleton KG Local Search**: High-precision hops.
*   **Bipartite Graph "Mimic Search"**: Broadens recall by connecting chunks via shared keywords.

## Configuration & Gates
MGI is **deny-by-default**.
*   Enable via `MGI_ENABLED=1`.
*   Control components via `MGI_KEYWORD_GRAPH`, `MGI_SKELETON`, `MGI_RETRIEVER`.

## Evidence
*   `EVD-ket-rag-multigranular-indexing-kdd25-indexcost-001`
*   `EVD-ket-rag-multigranular-indexing-kdd25-retrieval-001`
*   `EVD-ket-rag-multigranular-indexing-kdd25-genqual-001`
*   `EVD-ket-rag-multigranular-indexing-kdd25-expansioncaps-001`

## References
*   [arXiv:2502.09304](https://arxiv.org/abs/2502.09304)
