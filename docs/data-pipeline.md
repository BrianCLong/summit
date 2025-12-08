# Data Pipeline Framework

This package provides a modular ETL/data-pipeline toolkit with ingestion adapters, schema-backed validation, transformation pipelines, data-quality enforcement, lineage capture, monitoring metrics, and scheduling blueprints.

## Components

- **Ingestion adapters**: CSV, JSON, API (Axios client with optional cursor pagination), and cursor-based database sources (`DatabaseSource`).
- **Schema registry & validation**: `SchemaRegistry` tracks schema versions; `SchemaValidator` enforces the requested version with Ajv.
- **Cleansing**: `RecordCleaner` removes undefined/empty string values and trims strings.
- **Transformations**: `TransformationPipeline` composes synchronous steps and exposes `snapshot()` for lineage.
- **Quality checks**: `DataQualityChecker` enforces required, range, and uniqueness rules with state reset per run.
- **Deduplication & watermarking**: configurable dedup keys and high-water marks guard against reprocessing.
- **Dead-letter queue**: structured failures for ingestion, validation, transformation, and quality errors.
- **Monitoring**: `PipelineMonitor` tracks processed/succeeded/failed/deduplicated/filtered/qualityFailures/ingestionErrors per source.
- **Lineage**: `LineageTracker` records step names per processed record with timestamps.
- **Scheduling**: builders for Airflow and Temporal emit portable schedule specs.

## Usage

```ts
import {
  ApiSource,
  CsvSource,
  DataPipeline,
  DataQualityChecker,
  SchemaRegistry,
  TransformationPipeline,
  coerceTypes,
  normalizeKeys,
} from '../src/data-pipeline/index.js';

const registry = new SchemaRegistry();
registry.register({ version: '1.0.0', schema: {/* JSON schema */} });

const transforms = new TransformationPipeline();
transforms.register(normalizeKeys);
transforms.register((record) => coerceTypes(record, { value: 'number' }));

const pipeline = new DataPipeline(
  [new CsvSource('csv', 'id,value\n1,10'), new ApiSource('api', 'https://example.test/data')],
  registry,
  transforms,
  new DataQualityChecker(),
  {
    schemaVersion: '1.0.0',
    deduplicationKey: 'id',
    watermarkField: 'updated_at',
    qualityRules: { ranges: [{ field: 'value', min: 0 }] },
    initialWatermark: 0,
    maxPagesPerSource: 10,
  }
);

const outcome = await pipeline.run();
console.log(outcome.processed); // transformed, deduped, validated records
console.log(outcome.deadLetters); // structured failures
console.log(outcome.metrics); // per-source metrics including ingestionErrors
```

### API source pagination and shaping

`ApiSource` supports cursor-based pagination and nested payloads:

- `cursorParam`: query parameter name that carries the cursor between calls.
- `cursorPath`: dotted path inside the API response that holds the next cursor value.
- `recordsPath`: dotted path that points to the array of records (defaults to entire response body).
- `pageSizeParam`/`pageSize`: optional page size hint sent with each request.

Example:

```ts
const api = new ApiSource('api', 'https://example.test/data', {
  cursorParam: 'cursor',
  cursorPath: 'pagination.next',
  recordsPath: 'items',
  pageSizeParam: 'limit',
  pageSize: 100,
});
```

## Operational Notes

- Set `maxPagesPerSource` to control pagination depth for cursor-based sources.
- Use `initialWatermark` when resuming incremental loads; watermark updates only when a later value is seen.
- Provide `SchemaValidator` explicitly only when you need custom Ajv options; the pipeline defaults to the registry version.
- Lineage includes transformation step names; prefer named functions for clearer provenance.
- `DataQualityChecker` resets unique tracking on each `pipeline.run()` invocation to keep runs independent.
