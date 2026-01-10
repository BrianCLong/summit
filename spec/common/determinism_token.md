# Determinism Token

**Purpose:** Enable deterministic replay of analytics by binding a computation to exact data and
execution parameters.

## Token Fields

```json
{
  "token_id": "det_...",
  "graph_snapshot_id": "gph_2025-12-30T23:59:00Z",
  "index_versions": {
    "content_index": "v47",
    "entity_index": "v19"
  },
  "schema_version": "2025-12-01",
  "seed": "0xdeadbeef",
  "time_window": {
    "start": "2025-12-30T00:00:00Z",
    "end": "2025-12-30T23:59:59Z"
  },
  "policy_version": "policy://v3.4.2"
}
```

## Usage

- Attach to attribution artifacts, lifecycle updates, or scan capsules.
- Use during replay to validate that snapshots, indices, and schemas match.
- If any field differs, replay is invalid and must be rejected.

## Security Notes

- Store token hash in witness chain entry for non-repudiation.
- Consider signing the token when used across trust boundaries.
