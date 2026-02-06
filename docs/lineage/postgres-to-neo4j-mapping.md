# Postgres → Neo4j Digest Parity Mapping (Normative)

This document defines the deterministic mapping and exclusion rules for digest parity between
Postgres change events and the Neo4j projection. All parity gates **must** adhere to this
specification.

## Canonicalization Rules

- **Canonical JSON**: Serialize rows with sorted keys and no whitespace (`separators=(",", ":")`).
- **Encoding**: UTF-8 bytes only.
- **Row digest**: `sha256(canonical_json(row_without_runtime_fields))`.
- **Row digests list**: store in sorted order for deterministic manifests.
- **Run digest**: `sha256("\n".join(sorted(row_digests)))`.

## Runtime Field Exclusions

The following fields are **excluded** from row digests and must never influence parity:

- `_ts`
- `_lsn`
- `_tx`

These fields are runtime-only and non-deterministic by definition.

## Postgres Change Event Shape

Expected event shape (minimum):

```json
{
  "op": "INSERT|UPDATE|DELETE",
  "row": {
    "id": "...",
    "field": "..."
  }
}
```

Only the `row` object participates in digests.

## Neo4j Projection Requirements

- Projection must produce deterministic ordering for parity comparison.
- **Order by** a stable key (e.g., `id`) before computing digests.
- Use **APOC** sorted properties (recommended):
  `apoc.map.sortedProperties(n)`.

## Parity Assertion

1. Compute row digests from Postgres change events (exclusions applied).
2. Compute row digests from Neo4j projection (same exclusions applied).
3. Compare run digest values; any mismatch is a parity failure.

## Manifest Coupling

The `run_digest` stored in `artifacts/lineage/run-<uuidv7>.json` is the authoritative digest for
both Postgres and Neo4j parity checks.
