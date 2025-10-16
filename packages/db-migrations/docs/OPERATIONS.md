# Database Migration & Rollback Operations

This document describes the recommended run-book for operating the `@summit/db-migrations` engine in production.

## Pre-flight Checklist

1. **Backups** – Ensure point-in-time backups are healthy. Configure the `backupProvider` option so every migration batch captures a database snapshot.
2. **Staging rehearsal** – Run the migrations with `dryRun: true` in a staging environment and review the generated plan output.
3. **Change review** – Confirm every migration implements a safe `down` handler. The runner refuses to execute migrations without a rollback implementation by default.

## Executing Migrations

```ts
const runner = new MigrationRunner({
  adapter: new PostgresAdapter({ connectionString: process.env.DATABASE_URL! }),
  stateStore: new FileStateStore({ filePath: '.migrations/state.json' }),
});

await runner.apply(migrations, {
  dryRun: process.env.DRY_RUN === 'true',
  backupProvider: createSnapshotProvider(),
  onProgress: (event) => console.log(event.message),
});
```

### Dry-Run Mode

Set `dryRun: true` to generate the ordered plan and validate safety rules without mutating the database. Dry-run mode also hashes migration bodies and surfaces checksum drift before the real deployment.

### Automatic Rollback

If a migration throws an error, the runner automatically rolls back previously applied migrations in reverse order. For PostgreSQL and MySQL adapters, this happens in a single transaction. MongoDB uses session transactions when available; otherwise, each `down` executes individually.

### Backup / Restore Hooks

When the `backupProvider` option is supplied, each migration group triggers a `backup.before(migration)` hook. If the migration fails, the returned handle's `restore()` method executes after logical rollbacks to guarantee durability.

## Observability & Auditing

- The runner emits structured events via `onProgress`. Route these to your logging pipeline.
- Persisted state records include version, checksum, execution duration, and operator metadata. The `FileStateStore` is suitable for local development; production installs should back state with a transactional table.

## Testing Rollbacks

Use the helper in `RollbackTester` to prove recovery paths:

```ts
await RollbackTester.verify(runner, migrations, {
  failAt: '202502141230-add-new-index',
  scenario: 'index build timeout',
});
```

This executes migrations until the specified ID, injects a failure, and asserts all previous migrations are reverted.

## CI/CD Integration

1. Run `npm run build && npm run test:coverage` inside the package to ensure type safety and coverage.
2. Add the `MigrationPlanReporter` output to your change management artefacts.
3. Capture the dry-run plan in PR comments so reviewers can examine dependency ordering and rollback readiness.

## Incident Response

If a production migration fails:

1. Allow the automatic rollback to finish. Inspect logs for any `rollbackError` entries.
2. If the database remains inconsistent, run the `restore()` hook from the latest backup handle.
3. Capture telemetry using `runner.getState()` to determine which migrations require manual intervention.

For severe incidents, invoke the `panicRollback()` helper to revert all applied migrations to a known baseline.
