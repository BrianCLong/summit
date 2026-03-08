# Lineage Stamp Contract

## Purpose
Defines the required fields and hashing rules for Summit's data lineage stamps. A valid lineage stamp provides deterministic evidence of origin, processing, and output.

## Versioning
- Version: 1.0.0
- Schema ID: `summit.lineage.stamp.v1`

## Fields
- `schema_version`: Must be `1.0.0`
- `run_id`: UUIDv4 or deterministic hash string (cannot be empty)
- `dataset_id`: String identifier for the dataset
- `timestamp`: (Excluded from deterministic hash, only used for runtime metadata)
- `inputs`: Array of input references (must be stably sorted)
- `outputs`: Array of output references (must be stably sorted)
- `transform_hash`: SHA-256 hash of the canonicalized transformation payload
- `toolchain_version`: String identifier for the toolchain

## Canonicalization Rules
1. Keys must be sorted alphabetically.
2. All strings must be lowercased before hashing (except when strict case-preservation is required by an external system).
3. Arrays of objects must be sorted by a stable primary key (e.g., `id`).
4. Timestamps and wall-clock time must be excluded from canonicalization.

## Determinism Rules
- The same inputs processed by the same toolchain must produce the exact same `transform_hash` and `lineage_hash`.
- No non-deterministic values (like PRNG without a seed, or wall-clock times) may be included in the hashed payload.

## Failure Modes
- `schema_validation_failed`: The stamp does not match the JSON schema.
- `hash_mismatch`: The provided hash does not match the canonicalized payload hash.
- `missing_run_id`: The `run_id` field is missing or empty.
