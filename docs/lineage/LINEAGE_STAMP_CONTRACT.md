# Lineage Stamp Contract

## File Paths

* `evidence/lineage/lineage.stamp.json` (deterministic contract)
* `evidence/lineage/lineage.runtime.json` (timestamps, host, etc.)

## `lineage.stamp.json` (deterministic contract)

This file serves as the deterministic, hashable artifact representing the lineage provenance of a transformation.

```json
{
  "schema": "summit.lineage.stamp.v1",
  "run": {
    "run_id": "uuid-or-deterministic-runid",
    "parent_run_id": "optional",
    "attempt": 1
  },
  "transformation": {
    "transformation_hash": "sha256:....",
    "hash_schema": "summit.lineage.transformation.v1"
  },
  "datasets": {
    "inputs": [
      {
        "namespace": "prod.postgres",
        "name": "public.orders",
        "dataset_id": "sha256:..(namespace|name)",
        "schema_fingerprint": "sha256:..",
        "origin": "openlineage|otel|dbt|manual"
      }
    ],
    "outputs": [
      {
        "namespace": "prod.postgres",
        "name": "analytics.orders_rollup",
        "dataset_id": "sha256:..",
        "schema_fingerprint": "sha256:..",
        "origin": "openlineage|otel|dbt|manual"
      }
    ]
  },
  "linkage": {
    "openlineage": {
      "event_time_omitted": true,
      "producer": "string",
      "run_facets_present": ["extractionError", "nominalTime", "parent", "documentation"],
      "extraction_error_present": false
    },
    "opentelemetry": {
      "trace_id": "hex-or-empty",
      "span_id": "hex-or-empty",
      "db_system": "postgres|snowflake|...",
      "db_namespace": "string-or-empty"
    }
  },
  "integrity": {
    "content_digest": "sha256:...(digest of THIS FILE excluding this field)"
  }
}
```

### Notes:

* `event_time_omitted: true` is an explicit reminder that OpenLineage events contain time fields natively, but your deterministic artifact MUST NOT contain timestamps.
* The `extractionError` facet is explicitly tracked. OpenLineage now emits this facet on extraction failures (which were historically silent). Its presence in the origin event requires `extraction_error_present: true`, which generally fails the Lineage Integrity Gate.

## `lineage.runtime.json` (non-deterministic)

Contains `emitted_at`, hostname, runtime environment, and retry timestamps. This file is **not** used for gating or hashing.
