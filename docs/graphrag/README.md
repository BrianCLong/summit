# GraphRAG System

Summit's GraphRAG (Graph-based Retrieval-Augmented Generation) system combines the structural precision of a knowledge graph with the semantic flexibility of vector search to provide highly contextualized context to LLMs.

## Features
- **Semantic Chunking**: Intelligently segments documents into meaningful chunks based on semantic boundaries rather than arbitrary token lengths.
- **Multi-Hop Traversal**: Navigates the IntelGraph to discover indirect relationships (e.g., Company A -> Subsidiary B -> Person C) that pure vector search would miss.
- **Provenance Tracking**: Every retrieved fact is linked back to its source document in the Provenance Ledger.

## Pipeline
1. Ingested text is semantically chunked.
2. Chunks are embedded and stored in the vector database.
3. Entities and relationships are extracted and added to the Neo4j knowledge graph.
4. During retrieval, both the vector store and graph are queried.
5. Results are synthesized by the LLM, complete with source citations.
