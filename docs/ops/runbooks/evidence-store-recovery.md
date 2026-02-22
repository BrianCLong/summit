# Runbook: Evidence Store Recovery

## Summit Readiness Assertion
This runbook is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## Trigger Conditions
- Evidence store availability incident.
- Integrity mismatch between blob store and metadata index.

## Preconditions
- Latest backup verified.
- Recovery environment ready and isolated.

## Procedure
1. Freeze ingestion and release gates.
2. Restore metadata index from the latest backup snapshot.
3. Restore blob store and run integrity reconciliation by digest.
4. Rebuild indices from blob manifests if needed.
5. Run deterministic verification on sample evidence bundles.
6. Re-enable ingestion and release gates.

## Validation
- Evidence ID lookups resolve expected bundles.
- Policy decisions re-evaluate to prior known outcomes.

## Rollback
- Revert to previous backup snapshot.
- Keep ingestion disabled until integrity checks pass.
