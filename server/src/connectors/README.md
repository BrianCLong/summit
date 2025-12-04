# Connectors (GCS & JDBC)

This directory contains the integration connectors for Google Cloud Storage (GCS) and JDBC databases (PostgreSQL, MySQL).

## Features

### GCS Connector (`gcs.ts`)
- **Streaming Support**: `downloadStream(objectName)` for memory-efficient processing of large files.
- **Resumable Uploads**: Automatically handles large uploads.
- **Metrics**: Prometheus metrics for latency, object size, and error rates.
- **Tracing**: Integrated span generation for observability.

#### Usage
```typescript
import { GCSConnector } from './connectors/gcs';

const gcs = new GCSConnector('tenant-1', {
  projectId: 'my-project',
  bucketName: 'my-bucket'
});

// Streaming Download (Backpressure friendly)
const stream = await gcs.downloadStream('large-file.csv');
stream.pipe(process.stdout);
```

### JDBC Connector (`jdbc.ts`)
- **Streaming Queries**: `queryStream(sql, params)` returns a cursor (Postgres) or stream (MySQL) for large result sets.
- **Batch Execution**: `batchExecute` for high-throughput inserts/updates.
- **Connection Pooling**: Managed pools for Postgres and MySQL.
- **Schema Inspection**: Utilities to fetch table/column metadata.

#### Usage
```typescript
import { JDBCConnector } from './connectors/jdbc';

const db = new JDBCConnector('tenant-1', {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'user',
  password: 'pw'
});

await db.connect();

// Streaming Query (Memory efficient)
const cursor = await db.queryStream('SELECT * FROM large_table');
// Use cursor... e.g. cursor.read(100, (err, rows) => { ... })
// Note: You must handle stream consumption and cleanup.
```

## Dead Letter Queue (DLQ)

A generic DLQ utility is available in `server/src/lib/dlq` for handling failed ingestion or connector events.

```typescript
import { dlqFactory } from '../lib/dlq';

const dlq = dlqFactory('ingestion-failures');

try {
  await connector.batchExecute(...);
} catch (error) {
  // Route failed payload to DLQ
  await dlq.enqueue({
    payload: { batchId: '123' },
    error: error.message,
    retryCount: 0
  });
}
```

## Configuration

Connectors are configured via the `ConnectorManager` or directly via their constructor options. Ensure sensitive credentials are managed via `secrets.ts` or environment variables.

## Metrics

- `gcs_operations_total`: Counter
- `gcs_operation_latency_ms`: Histogram
- `jdbc_operations_total`: Counter
- `jdbc_query_rows`: Histogram
