# ADR 006: GraphRAG Design

## Status
Accepted

## Context
Standard Retrieval-Augmented Generation (RAG) relies primarily on vector similarity search, which struggles with multi-hop reasoning, complex relational queries, and deterministic evidence attribution. Summit requires a retrieval substrate that can support explainability, traceability, and structured governance for AI reasoning, ensuring every retrieved fact can be linked to a verifiable source.

## Decision
We will implement Summit GraphRAG using a Knowledge Graph (Neo4j) as the primary retrieval substrate, combined with optional vector-based augmentation. The system will rely on:
1.  **Multi-hop Cypher Traversals:** Agent Planners will generate and execute Cypher queries to retrieve localized subgraphs (Nodes + Edges) rather than flat document lists.
2.  **Deterministic Context Assembly:** Retrieved subgraphs will be serialized into a deterministic text format.
3.  **Traceability-by-Design:** Every node in the Knowledge Graph must contain a persistent `evidence_id` property, which will be preserved in the context window.
4.  **Path Evidence:** The specific execution trace (Cypher path) used to locate a connection will be recorded to allow auditability and post-hoc verification.

## Consequences
- **Positive:** Enables multi-hop reasoning across complex domains (e.g., Actor -> Campaign -> Malware -> Target).
- **Positive:** Guarantees explainability, as every claim from the LLM can be tied to a specific `evidence_id` and traversal path.
- **Positive:** Provides stable, deterministic retrieval sets compared to top-k vector search.
- **Negative:** Requires LLMs (or Agent Planners) to be capable of decomposing queries and generating valid Cypher, adding latency and complexity.
- **Negative:** Increases operational overhead by requiring a highly available property graph database (Neo4j) alongside the vector store.
