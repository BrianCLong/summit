# ETL Assistant Service

This service is a worker that processes ingestion jobs from the `ingestion-queue`.

## Architecture

-   **Framework:** None (standalone worker)
-   **Dependencies:** BullMQ, Redis, csv-parser

## Enricher Framework

The worker uses a pluggable enricher framework. To add a new enricher, create a class that implements the `Enricher` interface and add it to the `enrichers` array in `src/index.ts`.

### Enricher Interface

```typescript
export interface Enricher {
  name: string;
  enrich(data: Record<string, any>): Promise<Record<string, any>>;
}
```
