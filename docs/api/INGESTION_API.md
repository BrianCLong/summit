# Ingestion API Reference

The Summit Ingestion API is responsible for receiving data from various sources and routing it into the intelligence pipeline. It uses a canonical envelope format to ensure consistency and traceability.

## Data Ingestion Endpoints

Base URL: `/api/ingest`

### `GET /connectors`

List available data connectors.

- **Response**: `200 OK`
- **Schema**: `{ items: Connector[] }`

### `POST /start`

Start an ingestion job using a specific connector.

- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "connector": "twitter",
    "config": {
      "bearerToken": "...",
      "query": "#cybersecurity"
    }
  }
  ```
- **Response**: `201 Created`
- **Schema**: `{ job_id: string }`

### `GET /progress/{id}`

Check the progress of an ingestion job.

- **Parameters**: `id` (path)
- **Response**: `200 OK`
- **Schema**: Ingestion job status and metrics.

---

## Canonical Ingest Envelope

All data records submitted to the platform must follow the Ingest Input Envelope schema.

### Schema Fields

| Field            | Type                 | Description                                      |
| ---------------- | -------------------- | ------------------------------------------------ |
| `event_id`       | `string (uuid)`      | Unique identifier for the record.                |
| `event_type`     | `string`             | Fully-qualified type (e.g., `ingest.entity.v1`). |
| `event_version`  | `string`             | Payload schema version (e.g., `v1`).             |
| `occurred_at`    | `string (date-time)` | Source creation/modification timestamp.          |
| `recorded_at`    | `string (date-time)` | Pipeline reception timestamp.                    |
| `tenant_id`      | `string`             | Owning tenant identifier.                        |
| `source_service` | `string`             | Canonical name of the producing service.         |
| `ingest`         | `object`             | Ingest-specific metadata (source, type, format). |
| `entity`         | `object`             | Entity identification (type, id).                |
| `revision`       | `object`             | Revision metadata for conflict resolution.       |
| `dedupe_key`     | `string`             | SHA-256 hash for idempotency.                    |
| `data`           | `object`             | The actual payload to be ingested.               |

### Example Envelope

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "ingest.entity.v1",
  "event_version": "v1",
  "occurred_at": "2025-01-15T10:30:00Z",
  "recorded_at": "2025-01-15T10:30:05Z",
  "tenant_id": "tenant-456",
  "source_service": "ingest-adapter-s3",
  "ingest": {
    "source": "s3://my-bucket/data.json",
    "source_type": "s3",
    "format": "json"
  },
  "entity": {
    "type": "person",
    "id": "person-123"
  },
  "revision": {
    "number": 1,
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "dedupe_key": "a1b2c3d4e5f6...",
  "schema_version": "1.0.0",
  "data": {
    "name": "John Doe",
    "role": "Analyst"
  }
}
```

---

## Connector Configuration

Each connector has its own configuration schema. You can retrieve the schema for a connector via:

### `GET /schema/{connector_type}`

- **Response**: JSON Schema for the specified connector.

---

## Status Polling

Ingestion is an asynchronous process. After starting a job, clients should poll the `/progress/{id}` endpoint to monitor the state.

Possible job states:

- `queued`: Job is waiting for an available worker.
- `running`: Ingestion is in progress.
- `completed`: All records have been processed.
- `failed`: Job encountered a terminal error.
