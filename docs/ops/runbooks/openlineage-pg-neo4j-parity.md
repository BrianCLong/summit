# Runbook: OpenLineage Postgres → Neo4j Parity

## Summit Readiness Assertion

Reference: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Purpose

Establish deterministic lineage evidence artifacts and parity checks between Postgres change
batches and Neo4j projections.

## Inputs

- Postgres change-event batch (fixture or live feed).
- Optional Neo4j projection digest (for parity gate).

## Outputs

- `artifacts/lineage/run-<uuidv7>.json` (deterministic manifest)
- `artifacts/lineage/stamp.json` (runtime metadata only)
- Optional OpenLineage RunEvent emission

## Execute Against Fixture

```bash
LINEAGE_OUT=artifacts/lineage \
LINEAGE_RUN_ID=018f3b9e-6c2f-7a00-8000-000000000001 \
python -m services.lineage.emitter
```

## Configure OpenLineage Emission

```bash
export LINEAGE_EMIT=1
export OPENLINEAGE_URL=https://openlineage.example.com/api/v1/lineage
export OL_NAMESPACE=summit
export OL_JOB=postgres-change-run
```

To enforce emission, set `LINEAGE_REQUIRE_EMIT=1`.

To omit per-row digests in the manifest, set `ROW_DIGESTS_INCLUDE=0`.

## Parity Investigation

1. Recompute Postgres run digest from the fixture or batch replay.
2. Compute Neo4j run digest using sorted projection output.
3. Compare digests and record divergence.

## Rollback

- Disable emission with `LINEAGE_EMIT=0`.
- Remove generated artifacts from `artifacts/lineage/` and re-run with a fixed `LINEAGE_RUN_ID`.
