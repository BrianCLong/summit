# Online Migration Toolkit (Expand/Contract with Zero Downtime)

This toolkit makes additive schema changes repeatable: expand first, dual-write while backfilling, validate parity, then contract later. It lives in `server/src/db/online-migrations`.

## Components

- **`OnlineMigrationToolkit`**: ensures state tables, creates columns/tables, and tracks phases.
- **`BackfillRunner`**: chunked backfills with pause/resume, progress tracking, and throttling.
- **`DualWriter`**: wraps mutations so legacy and new representations stay in sync.
- **`ParityChecker`**: samples rows and records parity deltas for contract readiness.
- **Metrics** (Prometheus): `online_migration_backfill_*`, `online_migration_dual_write_duration_seconds`, and `online_migration_parity_*` exported via `migrationMetricsRegistry`.

## State Tables

Created automatically (and via the managed migration):

- `online_migration_runs` – phase + metadata (`expand`, `backfill`, `validate`, `contract-ready`).
- `online_migration_backfill_state` – cursor, progress counters, throttle/chunk config, last error.
- `online_migration_parity_samples` – sampled rows and diffs.

## Example: Canonical user display names

The runnable example lives at `server/src/db/online-migrations/exampleUserDisplayNameMigration.ts` and is backed by the managed migration `202604150001_online_migration_toolkit.up.sql`.

```ts
import { OnlineMigrationToolkit } from "@/db/online-migrations/toolkit.js";
import {
  runExampleDisplayNameMigration,
  buildDisplayNameDualWriter,
} from "@/db/online-migrations/exampleUserDisplayNameMigration.js";

const toolkit = new OnlineMigrationToolkit(pool);
await toolkit.ensureStateTables();

// Expand
await toolkit.markPhase("users-display-name-canonical", "expand");
await toolkit.ensureColumn("users", "display_name_canonical", "TEXT");

// Dual-write on new writes
const writer = buildDisplayNameDualWriter(pool);
await writer.write({ userId, displayName: "Ada Lovelace" });

// Backfill + validate + move to contract-ready
await runExampleDisplayNameMigration(pool);
```

## Backfill template

Copy `server/templates/online-migration/expand-contract.template.ts` for new migrations. Key options:

- `chunkSize` – controls batch size.
- `throttleMs` – sleep between batches to avoid load spikes.
- `pauseSignal` / `resumeJob` – supports pausing/resuming in-flight backfills using persisted cursor state.

## Contracting safely

1. Run parity until `mismatches === 0`.
2. Flip reads to the new column/table behind a feature flag.
3. Remove the legacy column/table in a later migration after monitoring.
