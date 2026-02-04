# Run Integrity Sanity Card (Postgres ↔ Neo4j)

## Objective

Verify that a single OpenLineage `runId` is consistent across Postgres evidence rows and Neo4j
Evidence nodes by comparing deterministic SHA256 aggregates of per-row digests.

## Stable identifiers

- **OpenLineage runId (UUIDv7)** → `018f3c7e-...`
- **Provenance subject** → `openlineage://<namespace>/runs/<runId>`
  - Use this subject in in-toto/SLSA statements and evidence records.
  - Keep timestamps out of the digest inputs.

## Postgres: per-row + aggregate digests

> Requires the `pgcrypto` extension for `digest()`.

```sql
-- Row digests for one run
SELECT
  id,
  encode(digest(concat_ws('||',
    id::text,
    coalesce(payload::text,''),
    coalesce(metadata::text,'')
  ), 'sha256'), 'hex') AS row_digest
FROM public.evidence
WHERE run_id = 'REPLACE_WITH_RUNID_UUIDv7'
ORDER BY id;

-- Deterministic aggregate (order by id)
WITH rows AS (
  SELECT id,
         encode(digest(concat_ws('||',
           id::text,
           coalesce(payload::text,''),
           coalesce(metadata::text,'')
         ), 'sha256'), 'hex') AS row_digest
  FROM public.evidence
  WHERE run_id = 'REPLACE_WITH_RUNID_UUIDv7'
)
SELECT encode(digest(string_agg(row_digest, '' ORDER BY id), 'sha256'), 'hex')
       AS run_aggregate_digest
FROM rows;
```

## Neo4j: aggregate the same way

```cypher
// Params: $runId
MATCH (r:Run {runId:$runId})-[:EMITS]->(e:Evidence)
RETURN e.id AS id, e.digest AS digest;
```

Then sort by `id` (fallback to `digest` if ids are missing), concatenate the digests, and compute
SHA256 to get the Neo4j `run_aggregate_digest`.

## CI wrapper (Node)

Use `scripts/ci/run-integrity-sanity.mjs` to run the full flow and emit
`evidence_delta.json` on mismatch.

```bash
RUN_ID=018f3c7e-... \
POSTGRES_URL=postgres://... \
NEO4J_URI=neo4j://localhost:7687 \
NEO4J_USER=neo4j \
NEO4J_PASSWORD=secret \
node scripts/ci/run-integrity-sanity.mjs
```

### Expected outputs

- `run_aggregate_digest` (Postgres)
- `run_aggregate_digest` (Neo4j)
- `evidence_delta.json` (only on mismatch)

### Failure behavior

On mismatch, the script exits non-zero and writes a delta report:

```json
{
  "runId": "018f3c7e-...",
  "pgAggregateDigest": "...",
  "neo4jAggregateDigest": "...",
  "missingInPostgres": [{"id": "...", "digest": "..."}],
  "missingInNeo4j": [{"id": "...", "digest": "..."}],
  "digestMismatch": [
    {"id": "...", "postgresDigest": "...", "neo4jDigest": "..."}
  ]
}
```

## CI verification flow

1. Grab `runId` from the OpenLineage **START** event.
2. Run the Postgres aggregate and capture `run_aggregate_digest`.
3. Run the Neo4j aggregate with the same `runId`.
4. Assert equality; on mismatch, emit `evidence_delta.json` and fail the GA gate.
