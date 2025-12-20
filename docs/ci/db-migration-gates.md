# Database Migration Gates

The CI migration gates ensure Postgres migrations are **deterministic, immutable, and auditable** before they reach production.

## Plan (`ops/db/migrate --plan --no-apply`)

- Reads SQL files under `db/migrations` in lexicographic order (recursive).
- Emits filename, SHA-256 checksum, and byte size for each migration.
- Writes an artifact to `artifacts/db-migration-plan.json` for traceability.
- Does **not** require a database connection when `--no-apply` is provided.

## Apply (`ops/db/migrate`)

- Requires `DATABASE_URL`.
- Ensures a `schema_migrations` tracking table exists.
- Skips already-applied files when the checksum matches; fails fast on checksum drift.
- Runs migrations with `psql -v ON_ERROR_STOP=1` and records the checksum on success.
- Optional seeds: `--seed <file>` (repeatable) or `--seed-pricing` for `db/seeds/pool_pricing_v1.sql`.

## Shadow verify (`ops/db/verify --shadow`)

- Builds a fresh shadow database from `DATABASE_URL` (drops/recreates `summit_shadow_<shortsha>`).
- Applies migrations via `ops/db/migrate`.
- Validates required tables: `pool_registry`, `pool_pricing`, and optional `capacity_reservations` / `pool_selection_audit` when present in migrations. Additional tables can be enforced with `--require-table`.
- Confirms `schema_migrations` exists and is populated.
- Writes `artifacts/db-verify-report.json` summarizing the checks.

## Running locally

```bash
# Plan only
./ops/db/migrate --plan --no-apply

# Apply against a local database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/summit ./ops/db/migrate

# Shadow verification (requires CREATE DATABASE on the target server)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/summit ./ops/db/verify --shadow
```
