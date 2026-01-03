# Run Span Envelope

Summit now emits **request-first run spans** for asynchronous pipelines. A `RunSpan` is a compact record tied to a `runId` (the request/run identifier) and is validated against a small tag registry to avoid unbounded metadata.

## Envelope

- `traceId` (string) – trace-level identifier (defaults to `runId`)
- `spanId` (string) – unique span identifier
- `parentSpanId` (string | null) – parent span for tree assembly
- `runId` (string) – request/run identifier (primary key for aggregation)
- `stage` (string) – canonical stage name (e.g., `ingest.enqueue`, `ingest.queue.wait`, `ingest.exec`)
- `kind` (`queue | exec | io | compute | external`)
- `startTimeMs` / `endTimeMs` (number, ms epoch)
- `status` (`ok | error`)
- `retryCount` (number)
- `attributes` (Record<string, string | number | boolean>) – validated against the tag registry
- `resources` (optional) – cpuAllocated, memAllocatedMb, cpuUtilPct, memUtilPct

## Tag registry (v1)

Tags are validated against `server/src/observability/run-spans/tag-registry.ts`. Unknown keys are logged (or rejected if `OBS_TAG_REGISTRY_STRICT=true`). Default keys:

- `tenantId` – tenant scope
- `workflow` – pipeline/workflow name
- `stageOwner` – service/team owner
- `userTier` – customer tier
- `region` – execution region
- `source` – run source (api|backfill|workflow)
- `priority` – queueing priority
- `payloadHash` – stable hash for ingest payload dedupe
- `retryReason` – stage retry reason

> PII-bearing tags should not be added unless explicitly whitelisted.

## Emission

The async ingest pipeline emits spans for enqueue, queue wait, and execution. Spans are appended to `obs_raw_spans` (or buffered in-memory when `OBS_SPAN_DEV_BUFFER=true`).

## Feature flags

- `OBS_RUNS_UI_ENABLED` – gates API + UI exposure
- `OBS_TAG_REGISTRY_STRICT` – reject unknown tags instead of warn
