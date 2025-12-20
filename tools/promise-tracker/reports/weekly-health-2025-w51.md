# Promise Tracker — Weekly Health (2025-W51)

**Status:** Metrics not yet captured for W51; pnpm/npm registry access is currently blocked in this environment (see install failures) and `.promise-tracker/` has not been initialized in the repo.

## Blockers
- `pnpm install` cannot complete because registry access returns HTTP 403, preventing the health CLI from running.
- No `.promise-tracker` directory or backlog/config files exist to feed the health check.

## Required actions
1. Initialize Promise Tracker in the repo (`pnpm run init`) once registry access is available.
2. Run `pnpm run health --ci` and record Total Items, Doc-Only count, and Stale In-Progress items for W51.
3. Post the metrics summary and thresholds to the release-train tracker (`issues/release-train/release-train-2025-w51.md`).
4. Ensure the scheduled workflow `.github/workflows/promise-tracker.yml` can publish the weekly health issue automatically.

## Evidence
- npm/registry access is denied in the current environment, blocking dependency installation and health execution. This must be resolved before metrics can be produced.
