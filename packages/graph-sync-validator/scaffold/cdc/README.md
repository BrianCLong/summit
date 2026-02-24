# CDC Consumer Scaffold (PG -> Neo4j + OpenLineage)

This is a minimal TypeScript scaffold that enforces:

- immutable mutation provenance (`lsn`, `txid`, `commit_ts`, `checksum`)
- idempotent apply semantics (dedupe by `txid+lsn`)
- OpenLineage emission for every applied mutation

## Files

- `cdc-event.types.ts`: canonical event contract
- `checksum.ts`: deterministic payload hashing
- `neo4j-upsert.ts`: idempotent Cypher apply helpers
- `openlineage.ts`: OpenLineage event conversion + emitter
- `consumer.ts`: batch processing loop

## Integration sketch

1. Read changes from logical decoding (`pgoutput`/`wal2json`) into `CdcMutation` batches.
2. Call `processBatch(batch, deps)`.
3. Persist consumer offsets only after Neo4j apply + OpenLineage emit both succeed.
4. Run `packages/graph-sync-validator/bin/parity-recon.mjs` on schedule for convergence proof.
