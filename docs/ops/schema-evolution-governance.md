# Schema Evolution Governance

This policy eliminates silent schema drift across every persistent layer (PostgreSQL, Neo4j/graph, Redis-backed structures, JSON document stores, and vector/embedding layouts). All schema changes must be discoverable, fingerprinted, and gated in CI before they land on `main`.

## Canonical migration registries

We maintain unified registries under `migrations/`:

- `migrations/sql/` — relational/PostgreSQL migrations. Globs map to `server/src/db/migrations/postgres` plus legacy SQL files in `migrations/`.
- `migrations/graph/` — Neo4j/graph migrations, including legacy Cypher files.
- `migrations/vector/` — vector DB schemas, embedding payload tables, and vector-aware SQL.
- `migrations/json/` — document-store schemas and JSON structure migrations.

Each registry exposes `registry.json`, which records the globs used for drift detection and migration discovery. Existing migrations can stay in their historical locations as long as the registry globs include them.

## Fingerprinting

Run the fingerprint generator to compute a stable SHA-256 hash over all registered schema files:

```bash
pnpm run schema:fingerprint
```

- Output: `schema-fingerprints/latest.json`
- Contents: versioned metadata, per-layer file hashes, and an overall composite hash.
- Regenerate whenever schema definitions or migrations change and commit the updated fingerprint.

## Drift enforcement in CI

CI enforces two rules (see `.github/workflows/schema-drift.yml`):

1. **Schema changes require migrations.** If schema-bearing files change without a migration touching the same registry, the job fails.
2. **Fingerprints must match.** Any change to schema inputs must be accompanied by a refreshed `schema-fingerprints/latest.json`.

Use the pull request base SHA via `SCHEMA_DRIFT_BASE` to compare against the target branch:

```bash
SCHEMA_DRIFT_BASE=origin/main pnpm run schema:verify
```

## Developer workflow

1. Create the migration stub:
   ```bash
   pnpm run schema:migration sql add-new-indexes
   pnpm run schema:migration graph add-node-constraint
   pnpm run schema:migration vector embed-runbook
   pnpm run schema:migration json rename-document-field
   ```
2. Implement the migration content in the generated file.
3. Update any service-level schema expectations (e.g., Redis/document shapes or vector payload definitions) within the appropriate registry paths.
4. Regenerate fingerprints: `pnpm run schema:fingerprint`.
5. Validate locally: `pnpm run schema:verify`.

## Example: adding a Redis document shape

1. Add the document schema under `migrations/json/` (or ensure the registry glob covers your path).
2. Create a companion migration file via `pnpm run schema:migration json redis-session-shape`.
3. Update service code to consume the new shape.
4. Refresh fingerprints and rerun `pnpm run schema:verify` before opening the PR.
