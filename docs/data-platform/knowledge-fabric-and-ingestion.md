# Data Platform: Knowledge Fabric & Ingestion

## Overview

The Summit Data Platform provides a unified "Knowledge Fabric" for ingesting, normalizing, enriching, and indexing data from various sources into a coherent Graph + Vector store.

## Data Model

The core data model is strictly multi-tenant and defined in `server/src/data-model/types.ts`.

- **Entity**: Represents a node in the graph (Person, Organization, etc.).
- **Edge**: Represents a relationship between entities.
- **Document**: A textual record (file, web page, note).
- **Chunk**: A segment of a Document, used for Vector Search (RAG).

All records include a `tenantId` and `sourceIds` for lineage.

## Ingestion Pipeline

Ingestion follows a standard 4-stage pipeline:

1.  **RAW**: Fetch data from Source (API, File).
2.  **NORMALIZE**: Map to Entity/Edge/Document types.
3.  **ENRICH**: Apply NER, Tagging, Resolution.
4.  **INDEX**: Write to Postgres, Graph (Neo4j), and Vector Store.

### Connectors

Connectors live in `server/src/connectors/` and implement `SourceConnector`.
- `FileConnector`: Reads local/S3 files.
- `HttpConnector`: Polls REST APIs.

## RAG & Retrieval

Retrieval is handled by `RetrievalService` which supports:
- **Vector Search**: Finds relevant Chunks using embeddings.
- **Keyword Search**: Fallback to text matching.
- **Graph Expansion**: Finds Entities related to the retrieved Documents.

## Observability

- **Metrics**: Prometheus metrics track pipeline runs, records processed, and RAG latency.
- **DLQ**: Failed records are sent to the `dlq_records` table in Postgres for inspection.
- **Events**: `IngestionEventBus` emits lifecycle events.

## Usage

### Running a Pipeline via API

\`\`\`bash
POST /api/ingestion/pipelines/my-pipeline/run
{
  "key": "my-pipeline",
  "tenantId": "tenant-1",
  "source": { "type": "api", "config": { "url": "..." } },
  "stages": ["raw", "normalize", "enrich", "index"]
}
\`\`\`
