# Knowledge Fabric & Ingestion Platform

This document describes the unified data platform for Summit, handling ingestion, normalization, enrichment, and RAG indexing.

## Data Model

The core data model consists of:

*   **Entities**: First-class objects (Person, Organization, Location, etc.) with a `kind` and `properties`.
*   **Edges**: Typed relationships between entities (`owns`, `linked_to`, etc.).
*   **Documents**: Text-heavy content (PDFs, emails, reports) with `text` and `metadata`.
*   **Document Chunks**: Vectorized segments of documents for RAG.

All data is strictly multi-tenant using a `tenant_id` column and Row Level Security (RLS) patterns.

## Pipelines

Ingestion is modeled as pipelines with 4 stages:

1.  **RAW**: Fetch data from Source Connectors (File, HTTP, Webhook).
2.  **NORMALIZE**: Convert raw data into canonical `Entity` or `Document` structures.
3.  **ENRICH**: Apply NER, PII detection, and entity resolution (future integration).
4.  **INDEX**: Persist to Postgres (Entities, Documents) and Vector Store (Chunks).

### Usage

Define a pipeline via API:

```json
POST /api/ingestion/pipelines
{
  "key": "corp-data-daily",
  "name": "Corporate Data Ingestion",
  "source": {
    "type": "file",
    "config": { "path": "/data/incoming/corp", "format": "json" }
  },
  "stages": ["normalize", "enrich", "index"],
  "options": {
    "normalization": { "entityType": "organization" }
  }
}
```

Trigger a run:

```bash
POST /api/ingestion/pipelines/corp-data-daily/run
```

## Connectors

New connectors implement the `SourceConnector` interface.
Standard connectors provided:
*   `file`: Local filesystem or mount.
*   `api`: Generic HTTP poller with pagination.

## RAG & Retrieval

The platform maintains a synchronized vector index for all ingested documents.

**Retrieval API**:
```json
POST /api/ingestion/search/retrieve
{
  "query": "Who owns Acme Corp?",
  "filters": { "entityIds": ["uuid-of-acme"] }
}
```

## Governance

*   **DLQ**: Failed records are sent to the Dead Letter Queue (`ingestion_dlq` table) and can be inspected via API (`GET /api/ingestion/dlq`).
*   **Lineage**: All entities and edges track `sourceIds` to trace back to the pipeline run that created them.
