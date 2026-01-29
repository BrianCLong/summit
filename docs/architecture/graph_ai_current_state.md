# Current State Assessment: Graph + AI Touchpoints

**Date:** 2026-01-24
**Scope:** Server-side Graph, AI, and RAG components.

## Executive Summary

Summit's current GraphRAG implementation is primarily "Blast Radius" based, relying on N-hop expansions from a central case node rather than intent-driven subgraph retrieval. While vector search (`PGVector`) exists for document retrieval, it is loosely coupled with the graph structure. The "Graph XAI" components are currently heuristic-based simulations rather than true causal explainers.

There is a critical gap in **Deterministic Cypher Retrieval**. User questions are not translated into targeted graph queries, leading to potential context flooding (too many irrelevant nodes) or context starvation (missing distant but relevant nodes).

## 1. Inventory of AI & Graph Touchpoints

### A. Graph Traversal & Retrieval
| Component | File Path | Method | Pattern | Risks |
|-----------|-----------|--------|---------|-------|
| **Case Subgraph** | `server/src/services/graphrag/repositories/CaseGraphRepository.ts` | `getCaseSubgraph` | **Blast Radius**: `MATCH (c:Case)-[*1..N]-(n)` | High context window usage; irrelevant noise; high DB load. |
| **Semantic RAG** | `server/src/services/semantic-rag/SemanticKGRAGService.ts` | `query` | Hybrid Vector + Graph (in-memory join). | Complexity; non-deterministic ranking. |
| **Explanation** | `server/src/services/xai/graph-explainer.ts` | `explainGraph` | **Heuristic**: Uses SHA256 hashing to simulate "importance" scores. | **Misleading**: Presents deterministic hash artifacts as "AI confidence". |

### B. Vector & Embedding Usage
| Component | File Path | Engine | Pattern | Risks |
|-----------|-----------|--------|---------|-------|
| **Doc Retrieval** | `server/src/rag/retrieval.ts` | `PGVector` | `embedding <=> query_embedding` | Standard vector search; disconnected from Graph topology. |
| **Hybrid Search** | `server/src/services/semantic-rag/HybridSemanticRetriever.ts` | `PGVector` | Combines vector scores with graph locality. | Implementation details obscure; relies on "mock" embeddings in places. |

### C. LLM Context Construction
| Component | File Path | Logic | Risks |
|-----------|-----------|-------|-------|
| **GraphRAG Prompt** | `server/src/services/graphrag/llm-adapter.ts` | `buildUserPrompt` | Serializes nodes/edges to JSON/Text list. | **Token Limit Exceeded**: Large subgraphs will truncate arbitrarily. |
| **Context Payload** | `server/src/services/graphrag/retrieval.ts` | `buildLlmContextPayload` | Filters properties to `KEY_PROPERTY_NAMES`. | Rigid property filtering might miss context-specific signals. |

### D. Text-to-Query / Agentic Control
| Component | File Path | Logic | Status |
|-----------|-----------|-------|--------|
| **NL2Cypher** | `server/src/nl2cypher/index.ts` | **Regex**: Matches `find X` or `count X`. | **Toy Implementation**: Cannot handle real-world questions; no schema awareness. |

## 2. Classification of Retrieval Modes

*   **Vector-First**: `server/src/rag/retrieval.ts` (Document search).
*   **Graph-First (Blast Radius)**: `server/src/services/graphrag/*` (Current "GraphRAG").
*   **Hybrid**: `server/src/services/semantic-rag/*` (Experimental/Complex).

## 3. Gap Analysis for Cypher-First Control Plane

To achieve the "Cypher-First" objective, we must replace or augment the `CaseGraphRepository` blast radius with an **Intent-Driven Retrieval** layer.

**Requirements:**
1.  **Cypher Generator**: A real service (not regex) that translates `Question + Schema` -> `Cypher`.
2.  **Governance Boundary**: Generated Cypher must be strictly read-only and scoped to `(c:Case {id: $caseId})`.
3.  **Determinism**: Common queries (e.g., "Timeline of X", "Connections between A and B") must use pre-validated templates, not probabilistic LLM generation.

## 4. Recommendations for Implementation

1.  **Implement `CypherGenerator`**: Use LLM for translation but prioritize a "Template Matcher" for safety/speed.
2.  **Harden `CaseGraphRepository`**: Add `getSubgraphByCypher` that injects the mandatory `MATCH (c:Case)` anchor.
3.  **Deprecate Heuristic XAI**: The hashing-based scoring in `graph-explainer.ts` should eventually be replaced by actual attention weights or graph centrality metrics, though this is out of scope for the immediate "Control Plane" task.
