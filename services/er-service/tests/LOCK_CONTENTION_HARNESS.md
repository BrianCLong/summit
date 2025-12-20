# Identity Cluster Lock Contention Harness

This optional Jest suite (`tests/lock-contention.harness.test.ts`) stress-tests merge-style
transactions against Postgres to surface deadlocks and long lock waits. It is **skipped by
default**; enable it only when you have a database available.

## Running

```bash
cd services/er-service
RUN_ER_LOCK_HARNESS=true \
ER_HARNESS_DB_URL=postgres://user:pass@localhost:5432/er_harness \
ER_HARNESS_ITERATIONS=10 \
ER_HARNESS_WORKERS=5 \
ER_HARNESS_MODE=ordered \
pnpm test -- --runTestsByPath tests/lock-contention.harness.test.ts
```

- `RUN_ER_LOCK_HARNESS`: Required to opt into the harness.
- `ER_HARNESS_DB_URL`: Postgres connection string (defaults to `DATABASE_URL`).
- `ER_HARNESS_ITERATIONS`: Number of contention rounds to run (default: 5).
- `ER_HARNESS_WORKERS`: Parallel “rings” of contending transactions (default: 3).
- `ER_HARNESS_MODE`: `ordered` (uses deterministic lock ordering) or `legacy`
  (intentionally uses opposing lock order to reproduce the pre-fix deadlock).

When a deadlock or lock-wait error occurs, the harness captures `pg_locks` snapshots (including
blocking PIDs) to help debug contention graphs.
