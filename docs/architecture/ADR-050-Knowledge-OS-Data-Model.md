# ADR-050: Knowledge OS Data Model

**Status:** Proposed

## Context

The Knowledge OS needs to answer two types of questions:

1.  Semantic questions ("What is our strategy for handling PII?")
2.  Structural questions ("Which services are affected by a change to this library?")

No single database is optimized for both.

## Decision

We will adopt a hybrid data model:

1.  **Vector Store**: All documents (code, markdown, issues) will be chunked, embedded using a sentence transformer model, and stored in a vector database (e.g., Pinecone, Weaviate). This will power semantic search and RAG (Retrieval-Augmented Generation) for the AI agents.

2.  **Graph Database (Neo4j)**: We will extract structured entities (services, packages, owners, dependencies, CI jobs) and their relationships from the repository. This will be stored in a property graph. This will power structural queries, dependency analysis, and expert finding.

3.  **Linkage**: The nodes in the graph database will contain metadata linking back to the source documents and their corresponding chunks in the vector store, allowing queries to traverse from a structural node to its semantic content.

## Consequences

- **Pros**: Provides a powerful, dual-paradigm query capability. Optimizes for both semantic and structural lookups. Creates a rich, interconnected dataset for AI agents to reason over.
- **Cons**: Increases data pipeline complexity. Requires maintaining two separate database systems and ensuring their consistency.
