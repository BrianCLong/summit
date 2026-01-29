# @summit/graph-rag

This package provides the core primitives for Summit's GraphRAG architecture.

## Features

- **Cypher Templates**: Pre-defined, multi-hop retrieval queries for security, governance, and narratives.
- **Context Assembly**: Deterministic serialization of graph results into LLM-friendly markdown.
- **Evidence Integration**: Automatic inclusion of Evidence IDs for citation-backed reasoning.

## Guarantees

### Determinism
The `ContextAssembler` ensures that graph results are sorted by ID before serialization. This guarantees that for the same graph state and query, the LLM context remains identical, maximizing prompt cache hits and ensuring reproducible outputs.

### Traceability
Every node retrieved contains its `evidence_id`. The assembler formats these as explicit citations, allowing the LLM to attribute its findings to specific, auditable records.

## Usage

```typescript
import { ContextAssembler } from '@summit/graph-rag';

// 1. Run Cypher query via Neo4j driver
const result = await session.run(query, params);

// 2. Process records into GraphContext
const context = ContextAssembler.fromRawResult(result.records);

// 3. Serialize for LLM
const promptContext = ContextAssembler.serialize(context);
```
