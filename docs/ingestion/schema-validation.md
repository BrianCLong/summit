# Feed Processor Schema Validation

This document describes the automated schema validation pipeline that now runs before the feed processor writes data to PostgreSQL or Neo4j.

## Overview

* Validation is implemented in Python using [`jsonschema`](https://json-schema.org/) and OpenTelemetry instrumentation.
* Schema definitions live in `python/feed_processor_validation/schemas/` and are versioned JSON Schema Draft 2020-12 documents.
* The Node.js feed processor invokes the Python validator prior to persistence. Any violations cause the ingestion job to fail fast and emit OpenTelemetry events.

## Components

### Python package: `feed_processor_validation`

Location: `python/feed_processor_validation/`

Key modules:

* `validator.py` – Loads schema definitions, validates batches, and records OpenTelemetry spans/events.
* `schemas/*.schema.json` – Schema definitions for PostgreSQL records, Neo4j entities, and Neo4j relationships.
* `tests/test_validator.py` – Pytest coverage that verifies both successful validation and violation logging.

### CLI entry point

Location: `services/feed-processor/validation/validate.py`

The CLI reads a JSON payload on STDIN with the following shape:

```json
{
  "job": { "job_id": "...", "source_type": "csv", "target_graph": "main", "authority_id": "...", "data_source_id": "..." },
  "entities": [ { "id": "1", "type": "person" } ],
  "relationships": [ { "source": "1", "target": "2", "type": "RELATED_TO" } ],
  "postgres_records": [ { "job_id": "...", "record_id": "1", "source_type": "csv", "payload": {"id": "1"} } ]
}
```

If `postgres_records` is omitted, the validator derives records from the supplied entities. The script writes a JSON response to STDOUT and exits with a non-zero code when violations occur.

### Feed processor integration

The TypeScript worker spawns the validator via `python3 services/feed-processor/validation/validate.py` during both the immediate ingest path and the asynchronous transform path. Validation happens before any insert/update statements are executed against Neo4j or PostgreSQL. Violations raise an error, preventing downstream writes.

## OpenTelemetry

The validator emits spans named `feed_processor.schema_validation` with the following attributes:

* `job.id` – Ingestion job identifier.
* `job.source_type` – Connector type (`csv`, `json`, etc.).
* `schema.valid` – Boolean success flag.
* `validation.entities` / `validation.relationships` – Counts for the payload.

Each schema violation results in an event named `schema_violation` describing the failing schema, instance index, and JSON pointer path. Successful validations include a `schema_validation_success` event.

## Running tests

1. Install Python dependencies (if not already available):

   ```bash
   pip install -r python/requirements.txt
   ```

2. Execute the pytest suite:

   ```bash
   pytest python/feed_processor_validation/tests
   ```

The tests configure an in-memory OpenTelemetry exporter to assert that spans and events are emitted for violations.

## Extending schemas

* Update or add JSON schema files under `python/feed_processor_validation/schemas/`.
* Extend `IngestionValidator` to load any new schemas or validation logic.
* Add corresponding pytest coverage to guard regressions.

