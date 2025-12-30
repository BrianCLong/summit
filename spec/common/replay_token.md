# Replay Token Schema

Captures deterministic recomputation context for analytic artifacts.

## Fields

- **snapshot_id**: immutable dataset snapshot reference.
- **time_window**: inclusive range used for data collection.
- **policy_version**: policy-as-code commit hash governing access.
- **schema_version**: structural schema version for capsule interpretation.
- **index_version**: search/index build identifier.
- **seed**: optional seed for randomized components.

## Guarantees

- Tokens are opaque but reproducible; clients may store and present for audit or replay.
