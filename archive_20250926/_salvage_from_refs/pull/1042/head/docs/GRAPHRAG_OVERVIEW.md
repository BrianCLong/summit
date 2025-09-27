# GraphRAG Overview

GraphRAG (Graph‑based Retrieval Augmented Generation) enhances question answering by grounding language model prompts in a knowledge graph. IntelGraph builds upon Microsoft’s open GraphRAG design and adapts it to Neo4j and the project’s golden path.

## Architecture

1. **Ingestion** – Documents are parsed and converted into entities and relationships.
2. **Graph Store** – Data is stored in Neo4j with constraints for uniqueness and traversal performance.
3. **Community Analysis** – Periodic clustering (e.g., Louvain) generates community summaries and embeddings.
4. **Retrieval & Generation** – A GraphQL endpoint collects a subgraph around the query, assembles summaries, and invokes an LLM for an answer with citations and why‑paths.

## Current Status

- GraphQL schema (`server/src/graphql/schema/graphrag.graphql`) exposes `graphRagAnswer`, cache control, and health checks.
- `GraphRAGService.ts` orchestrates Neo4j traversal, path ranking, and LLM invocation.
- Frontend GraphQL queries exist but UI exposure is minimal.

## Next Steps

- Flesh out ingestion and community summarization pipelines.
- Persist embeddings and summaries alongside graph nodes.
- Provide a simple UI to trigger GraphRAG queries from investigations.
