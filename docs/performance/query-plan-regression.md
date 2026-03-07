# Query Plan Regression Guardrails

This suite keeps the Postgres query planner from silently regressing on the hottest investigative journeys. It runs lightweight `EXPLAIN` checks in CI (shape-only) and enables `EXPLAIN ANALYZE` in staging/perf for deeper timing insight.

## Critical coverage

The baseline currently tracks three queries:

- **open-investigations** – status/priority dashboard path (covering index expected).
- **investigation-activity-fanout** – join + aggregation stability for activity rollups.
- **investigation-entity-resolution** – multi-join lookup for high-priority cases.

The seed data for these checks lives in `reliability/plan-regression/seed.sql` under the dedicated `plan_regression` schema.

## Running the regression suite

- Unit-level shape tests (no database needed):
  ```bash
  pnpm test -- plan-regression
  ```
- Full plan comparison (requires a seeded Postgres database):
  ```bash
  PLAN_REGRESSION_ENFORCE=true \
  PLAN_REGRESSION_DATABASE_URL=postgres://... \
  pnpm test -- plan-regression
  ```

  - Set `PLAN_REGRESSION_ANALYZE=true` in staging/perf to include `ANALYZE`/`BUFFERS` (omit in CI to avoid flakiness).

## Updating baselines (approval required)

Only update baselines when a planner change is intended and reviewed.

1. Point to a non-production database: `PLAN_REGRESSION_DATABASE_URL=postgres://...`.
2. Seed the deterministic dataset and regenerate baselines:
   ```bash
   pnpm dlx ts-node --esm reliability/plan-regression/update-baseline.ts
   ```

   - Set `PLAN_REGRESSION_SKIP_SEED=true` if your DB is already seeded.
3. Commit the updated `reliability/plan-regression/fixtures/postgres-plan-baseline.json`.
4. Add the PR label **plan-baseline-change** (or equivalent approval flag) so reviewers explicitly acknowledge the plan drift.
5. Re-run `pnpm test -- plan-regression` to verify the new baseline is clean.

## Automatic statistics refresh (staging/test)

- Refresh planner stats on a safe cadence (staging/test only):
  ```bash
  PLAN_REGRESSION_ENV=staging pnpm run db:analyze:plan-regression
  ```

  - Override tables with `PLAN_REGRESSION_ANALYZE_TABLES=plan_regression.investigations,plan_regression.activity_log`.
  - Set `PLAN_REGRESSION_ANALYZE_VERBOSE=true` to emit `ANALYZE VERBOSE`.
- Do **not** run this script in production; it refuses to execute unless `PLAN_REGRESSION_ENV` is set to `staging`/`test`.

When a PR changes a critical query plan, the failing test output will print a readable diff (node path, join/index changes, and row estimate drift). That failure must be resolved by either (a) fixing the regression or (b) deliberately updating the baseline with the approval label noted above.
