# Database Migrations & Schema Management

This document outlines the migration system, versioning strategy, and best practices for schema management in Summit.

## Architecture

We use a custom migration framework located in `server/src/db/migrations/versioning.ts`. It provides:

- **Timestamp-based Versioning**: Ensuring migrations run in a deterministic order.
- **Transactional Migrations**: All migrations run within a transaction. If any step fails, the entire migration rolls back.
- **Idempotency**: Migrations are tracked in a `migration_history` table and only applied once.
- **Safety Checks**: Built-in validation for "online-safe" operations to prevent downtime.

## Directory Structure

- `server/db/managed-migrations/`: Contains SQL migration files.
  - Format: `<timestamp>_<description>.up.sql` and `<timestamp>_<description>.down.sql`.
- `server/db/managed-seeds/`: Contains data seed scripts.
- `server/db/schema.sql`: The current schema snapshot (generated via `managed-migrate schema-dump`).

## Usage

The `managed-migrate` CLI tool is the primary interface.

### Commands

```bash
# Apply pending migrations
npm run managed-migrate up

# Rollback the last batch
npm run managed-migrate down

# Dry-run (test) pending migrations
npm run managed-migrate test

# Seed the database
npm run managed-migrate seed

# Dump the current schema
npm run managed-migrate schema-dump

# Check status
npm run managed-migrate status
```

(Note: You may need to run via `npx tsx server/scripts/managed-migrate.ts` if scripts are not in `package.json` yet)

## Zero-Downtime Migrations

To ensure zero downtime, all migrations must be "online-safe". This means avoiding long locks and breaking changes for running application code.

### The Expand-Contract Pattern

For breaking changes (e.g., renaming a column, changing a type), use the **Expand-Contract** pattern:

1.  **Expand**: Add the new column/table. Make it optional (nullable) or with a default. The application should write to _both_ old and new columns (dual-write) or be updated to read from new if present.
2.  **Migrate**: Backfill data from old to new column.
3.  **Contract**: Once all code is using the new column, remove the old column.

### Prohibited Operations (in standard mode)

- `DROP TABLE`
- `DROP COLUMN`
- `ALTER TABLE ... RENAME`
- `ADD COLUMN ... NOT NULL` (without `DEFAULT`)

To bypass these checks (e.g., for dev or maintenance windows), set `ALLOW_BREAKING_MIGRATIONS=true`.

## CI/CD Pipeline

The migration pipeline includes:

1.  **Linting**: SQL files are checked for syntax and style.
2.  **Safety Check**: Validates that pending migrations do not contain risky operations.
3.  **Dry Run**: Applies pending migrations in a transaction and rolls them back to verify SQL validity.
4.  **Schema Compatibility**: (Planned) Checks against production schema snapshot.

## Monitoring

Migration metrics are exported via Prometheus:

- `db_migration_duration_seconds`: Histogram of migration execution time.
- `db_migration_status`: Gauge (1 for success, 0 for failure).
- `db_migration_total`: Counter of applied migrations.
