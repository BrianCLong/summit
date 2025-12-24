# Usage Metering and Quotas

This module implements a usage metering subsystem that tracks various events (queries, ingestion, exports, etc.) per tenant and enforces optional quotas.

## Event Model

The system tracks `MeterEvent`s. Key event kinds include:

*   `query_executed`: A search or graph query was executed.
*   `ingest_item`: A data item was ingested.
*   `export_built`: An export bundle was generated.
*   `artifact_stored_bytes`: Bytes stored in the artifact store.
*   `webhook_delivered`: A webhook notification was sent.

Events are aggregated into daily rollups per tenant (`TenantUsageDailyRow`).

## API Endpoints

### Get Usage Summary
**GET** `/v1/metering/summary`

Query parameters:
*   `tenantId` (optional): Defaults to current user's tenant.
*   `from`: Start date (YYYY-MM-DD).
*   `to`: End date (YYYY-MM-DD).

Response:
```json
{
  "data": [
    {
      "tenantId": "...",
      "date": "2023-10-27",
      "queryExecuted": 150,
      ...
    }
  ]
}
```

### Set Quotas (Admin)
**POST** `/v1/metering/quotas`

Body:
```json
{
  "tenantId": "...",
  "config": {
    "queryExecuted": { "soft": 1000, "hard": 5000 },
    "ingestItem": { "soft": 500, "hard": 2000 }
  }
}
```

## Quota Enforcement

Quotas are enforced via middleware `checkQuotaMiddleware`.

*   **Soft Limit**: If exceeded, the request proceeds, but a warning is logged and an `X-Quota-Warning` header is added to the response.
*   **Hard Limit**: If exceeded, the behavior depends on the `ENFORCE_QUOTAS` environment variable.
    *   `ENFORCE_QUOTAS=true`: Request is blocked with `429 Too Many Requests`.
    *   `ENFORCE_QUOTAS=false` (Default): Request proceeds (warn-only).

## Architecture

1.  **Emitter**: `meteringEmitter` provides helper methods to emit events from application code.
2.  **Pipeline**: `MeteringPipeline` handles event ingestion, validation, idempotency, and in-memory buffering.
3.  **Repository**: `TenantUsageDailyRepository` persists daily rollups.
4.  **QuotaManager**: Evaluates current usage against configured limits.
