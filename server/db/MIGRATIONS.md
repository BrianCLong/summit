# Managed database migrations

This service now ships a managed Postgres migration/seed workflow built on SQL files with online-safety guardrails, rollback support, and automated backup/restore hooks. It runs alongside the existing raw SQL and Neo4j migrations and is designed to be CI-friendly.

## Layout
- **`db/managed-migrations/*.up.sql`** and matching **`*.down.sql`**: paired migrations that support rollback.
- **`db/managed-seeds/*.sql`**: deterministic seed scripts tracked in `seed_history`.
- **`src/db/migrations/versioning.ts`**: migration engine (applies, rolls back, seeds, status, backup/restore helpers).
- **`scripts/managed-migrate.ts`**: CLI entrypoint for local use and CI.

## Running migrations
```bash
cd server
# Apply pending migrations (takes a pg_dump backup first)
npm run db:migrate:managed

# Apply only up to a specific migration
npm run db:migrate:managed -- --to 202412010001_migration_backups

# Dry run without executing SQL
npm run db:migrate:managed -- --dry-run
```

## Rollback and seeds
```bash
# Roll back the latest migration
npm run db:rollback

# Roll back multiple steps
npm run db:rollback -- --steps 2

# Seed tracked SQL files (idempotent with history table)
npm run db:seed:managed
```

## Zero-downtime protections
- Online guardrails reject destructive statements (drop table/column, renames, type changes) unless `ALLOW_BREAKING_MIGRATIONS=true` is set.
- Each migration is executed with `lock_timeout` and `statement_timeout` to avoid long blocking DDL.
- Use additive changes (create table/column, backfill with defaults) for smooth deploys.

## Concurrent + partial index helper
- Feature flag: set `INDEX_CONCURRENT=1` in environments that support concurrent builds.
- Use `buildCreateIndexSql`/`buildDropIndexSql` from `src/db/migrations/indexing.ts` to generate SQL for managed migrations, including partial filters for tenant/case scopes or active-only rows.
- The migration runner automatically retries index builds, tracks status in `index_build_history`, and falls back to non-transactional execution when PostgreSQL rejects `CREATE INDEX CONCURRENTLY` inside a transaction.
- Avoid concurrent builds when:
  - The table is small (regular builds finish faster and avoid extra overhead).
  - You can tolerate a brief lock during deploy (maintenance windows).
  - You are in a migration bundle that must stay transactional end-to-end (concurrent indexes require autocommit).
- If an index build fails, the runner logs the failure, drops any invalid index, and exits cleanly so you can fix and re-run safely.

## Backup & restore
```bash
# pg_dump prior to running migrations (default behavior of `db:migrate:managed`)
npm run db:migrate:managed -- --backup-path /tmp/db-backup.sql

# Manual backup / restore
npm run db:backup -- --backup-path /tmp/db.sql
npm run db:restore -- --restore /tmp/db.sql
```
> Requires `POSTGRES_URL` or `DATABASE_URL` and access to `pg_dump`/`psql` binaries.

## Testing migrations
```bash
# Validates SQL by running all migrations inside a single transaction and rolling back
npm run db:migrate:test
```

## Adding migrations
1. Add paired files under `db/managed-migrations` following `YYYYMMDDHHMM_name.up.sql`/`down.sql`.
2. Keep changes additive to preserve zero-downtime.
3. Optionally add seed data to `db/managed-seeds` for the new schema.
4. Commit files and run `npm run db:migrate:managed -- --dry-run` locally before pushing.
