# Multimodal Fusion Product

This product implements the Priority 1 capability: **Data Discovery and Multimodal Fusion**.
It integrates AI-driven Entity Extraction, Vector Search (pgvector), and Knowledge Graph (Neo4j) into a unified pipeline.

## Features

1.  **Multimodal Ingestion**:
    - Supports `TEXT`, `URL`, `IMAGE` (metadata/description), and `SIGNAL`.
    - Automated Entity Extraction using LLM (`gpt-4o`).
    - Semantic Embedding generation (3072 dimensions).

2.  **Hybrid Fusion Storage**:
    - **PostgreSQL**: Stores raw Media Sources, Multimodal Entities, and Vector Embeddings (`vector` extension).
    - **Neo4j**: Stores Knowledge Graph (Entities and Relationships) for traversals.

3.  **Unified Search**:
    - Performs parallel Vector Search (Postgres) and Graph Search (Neo4j Fulltext).
    - Merges and ranks results using Reciprocal Rank Fusion principles.
    - Delivers p95 < 2s query performance (dependent on index warmth).

## Architecture

- **Service**: `FusionService` (`server/src/products/fusion/FusionService.ts`)
- **Prompt**: `prompts/extraction.fusion@v1.yaml`
- **Database**:
    - Postgres Table: `multimodal_entities` (with `hnsw` vector index).
    - Neo4j Labels: `MediaSource`, `Entity`.

## Usage

```typescript
import { FusionService } from './FusionService';

const fusion = new FusionService();

// Ingest Intelligence Report
const report = `
  Subject: Project AURORA
  Date: 2025-10-15
  John Doe met with Cyberdyne Systems executives in San Francisco.
`;

const result = await fusion.ingest(report, 'TEXT', { classification: 'CONFIDENTIAL' });
console.log(`Ingested ${result.entityCount} entities.`);

// Search
const hits = await fusion.search('Cyberdyne meeting');
hits.forEach(hit => {
  console.log(`[${hit.source}] ${hit.score.toFixed(2)} - ${hit.content}`);
});
```

## Setup

1.  Ensure Postgres has `vector` extension installed.
2.  Ensure Neo4j is running.
3.  Run migrations: `npm run db:migrate`.
