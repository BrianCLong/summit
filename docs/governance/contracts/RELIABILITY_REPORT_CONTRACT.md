# Reliability Report Contract

## Purpose
Defines the required fields and metrics for Summit's reliability reports. A valid report provides deterministic evidence of agent performance, reproducibility, and error rates.

## Versioning
- Version: 1.0.0
- Schema ID: `summit.reliability.report.v1`

## Fields
- `schema_version`: Must be `1.0.0`
- `run_id`: UUIDv4 or deterministic hash string (cannot be empty)
- `dataset_id`: String identifier for the evaluation dataset
- `timestamp`: (Excluded from deterministic hash, only used for runtime metadata)
- `metrics`: Object containing deterministic performance measurements:
  - `actionability_rate`: Number between 0 and 1
  - `reproducibility_hash_match_rate`: Number between 0 and 1
  - `provable_actionability_index`: Number between 0 and 1
- `errors`: Array of deterministic error summaries (stably sorted)
- `toolchain_version`: String identifier for the toolchain

## Canonicalization Rules
1. Keys must be sorted alphabetically.
2. The `metrics` object must be recursively sorted by key.
3. The `errors` array must be sorted by a stable primary key (e.g., error code or message).
4. Timestamps and wall-clock time must be excluded from canonicalization.

## Determinism Rules
- The same evaluation run against the same dataset must produce the exact same `metrics` and deterministic `report_hash`.
- No non-deterministic values (like PRNG without a seed, or wall-clock times) may be included in the hashed payload.

## Failure Modes
- `schema_validation_failed`: The report does not match the JSON schema.
- `hash_mismatch`: The provided hash does not match the canonicalized payload hash.
- `missing_metrics`: Required deterministic metrics are missing.
- `unacceptable_performance`: A metric falls below a required threshold (e.g., `reproducibility_hash_match_rate` < 1.0).
