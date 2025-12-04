# Migration Safety Simulator

The migration safety simulator runs forward and backward PostgreSQL migrations in isolation, surfaces unsafe patterns, and generates both a machine-readable report and rollback patch stubs for missing `*.down.sql` files. Each migration executes inside its own savepoint so the database is rolled back to a clean state after every trial.

## Running the simulator

```bash
# From repo root
cd server
npm run migration:simulate -- --target=2025-08-13_initial.sql
```

### CLI options

- `--target=<filename>`: Limit the run to a single migration file (e.g., `2025-08-13_initial.sql`).
- `--report=<path>`: Override the report output directory (default: `server/tmp/migration-safety`).
- `--patches=<path>`: Override the patch output directory (default: `<report>/patches`).
- `--connection=<postgres-connection-string>`: Override `POSTGRES_URL`/`DATABASE_URL`.
- `--continue-on-error`: Continue evaluating remaining migrations after a failure.

## Outputs

- **Safety report**: `migration-safety-report.json` detailing pass/fail status, timings, and unsafe pattern findings per migration.
- **Rollback patches**: Auto-generated `*.down.sql` stubs for migrations lacking down scripts. The generator includes drop statements for created tables, columns, and indexes to accelerate handoff review.

## What the simulator checks

- Executes `up` -> `down` -> `up` flows inside a single transaction with per-migration savepoints to keep the database clean and allow continued execution after a failure when `--continue-on-error` is set.
- Flags destructive SQL patterns (table/column drops, NOT NULL additions, rename operations, TRUNCATE) and bulk data operations without predicates.
- Records performance timing and affected row counts for each step to help catch slow or unexpected operations.

Use the simulator locally before shipping new migrations to catch rollback gaps and risky changes early.
