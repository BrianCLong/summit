# Schema Registry and Data Spine Layout

This directory holds the Data Spine schema registry. Schemas are versioned per dataset under `schemas/registry/<dataset>/vN/` and paired with metadata describing sensitivity, residency, retention, and PII handling.

## Directory structure

```
schemas/
  registry/
    customer_profile/
      v1/
        schema.json            # JSON Schema for the dataset version
        metadata.yaml          # Policy metadata (classification, residency, retention, PII)
    person_project_assignment/
      v1/
        schema.json
        metadata.yaml
  lineage_event_v1.json        # Schema for lineage events emitted from transforms
  data-spine/                  # Existing event envelopes
```

## Compatibility rules (enforced in CI)

The CI workflow `.github/workflows/schema-compatibility.yml` blocks schema changes that are not backward compatible. The rules implemented in `scripts/check_schema_compatibility.py` are:

- Existing properties cannot be removed.
- Property types cannot change (including narrowing from multi-type to single type).
- Required fields cannot be removed.
- New required fields cannot be introduced in an existing schema line.

Run locally with:

```bash
python scripts/check_schema_compatibility.py
```

If you need to make a breaking change, add a new version directory (`v2/`) instead of editing a published schema.

## Metadata expectations

Each `metadata.yaml` file supplies governance attributes:

- `classification`: data sensitivity tier (e.g., confidential).
- `residency`: jurisdiction constraint for storage/processing.
- `retention_days`: retention policy in days.
- `pii_fields`: explicit list of sensitive fields.
- `schema_hash`: SHA-256 fingerprint of the schema.json for change tracking.

Central dataset catalog entries live in `metadata/datasets/*.yaml` and point back to the schema paths while capturing ownership and usage contracts.

## Lineage events

`schemas/lineage_event_v1.json` defines the emitted lineage envelope. The simulated ingestion pipeline writes JSONL events to `simulated_ingestion/lineage_events.log` that conform to this schema. Each event captures:

- `operator`: emitting job/service.
- `occurred_at`: UTC timestamp of the transform.
- `dataset`: dataset identifier for the output.
- `output`: the derived record identifier/type.
- `inputs`: upstream record identifiers contributing to the output.
- `transform`: logical transform metadata and code reference.

### Demo: reconstructing lineage

1. Run the ingestion pipeline to emit lineage:

   ```bash
   python simulated_ingestion/ingestion_pipeline.py
   ```

   This produces `simulated_ingestion/lineage_events.log` using the `lineage_event_v1.json` contract.

2. Reconstruct provenance for a record (falls back to `example_lineage_log.jsonl` if you have not run the pipeline yet):
   ```bash
   python simulated_ingestion/lineage_demo.py user_1
   ```
   The command returns the operator, timestamp, and upstream inputs so you can answer “where did this record come from?”.
