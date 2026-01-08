# Flaky Test Management

This playbook explains how to detect flaky tests, quarantine them without blocking the main suite, and track deflaking progress over time.

## Detection Harness

- Script: `scripts/testing/detect-flaky-tests.ts`
- Default command: runs Jest through `pnpm exec jest` with `--runInBand` and JSON output enabled.
- Usage examples:

```bash
# Run ten iterations against all Jest tests
pnpm exec ts-node scripts/testing/detect-flaky-tests.ts

# Limit to a subset of tests
pnpm exec ts-node scripts/testing/detect-flaky-tests.ts --iterations 5 --pattern "analytics pipeline"

# Override the underlying command (ensure it supports Jest JSON flags)
pnpm exec ts-node scripts/testing/detect-flaky-tests.ts --command "pnpm exec jest apps/e2e --runInBand"
```

- Output: `reports/flaky-tests-<timestamp>.json` containing iteration summaries, per-test stability stats, and a top-offenders list.

## Quarantine Mechanism

- Metadata store: `testing/flaky-metadata.json` (authoritative list for quarantined or under-investigation tests).
- Script: `scripts/testing/quarantine-flaky.ts`

Key flows:

```bash
# Record all flaky tests from the latest scan as quarantined
pnpm exec ts-node scripts/testing/quarantine-flaky.ts --input reports/flaky-tests-<timestamp>.json

# Manually quarantine a specific test
pnpm exec ts-node scripts/testing/quarantine-flaky.ts --test path/to/file.test.ts::"should handle reconnect" --owner @qa --symptoms "intermittent timeout"

# Apply inline markers (adds `// @flaky` above the matched test declaration)
pnpm exec ts-node scripts/testing/quarantine-flaky.ts --input reports/flaky-tests-<timestamp>.json --applyTags
```

Quarantined tests should be run in a dedicated CI lane and excluded from the main suite by default.

## Deflake Tracker

Status is tracked in both `testing/flaky-metadata.json` and the table below. Owners should update the table as remediation work progresses.

| Test name                                 | File                                               | Flakiness symptoms      | Owner | Last seen  | Status      |
| ----------------------------------------- | -------------------------------------------------- | ----------------------- | ----- | ---------- | ----------- |
| _Example_: should recover after reconnect | packages/notifications/**tests**/reconnect.test.ts | Timeout after reconnect | @qa   | 2026-02-05 | quarantined |

Status values: `quarantined` (skipped from the main lane), `fixing`, `resolved` (removed from quarantine after stability holds for several runs).

## CI Wiring

- Workflow: `.github/workflows/flaky-scan.yml` (scheduled + manual dispatch).
- Default behavior: installs dependencies, runs the detection harness for multiple iterations, uploads the JSON report, and prints the top offenders to the Actions log.
- The workflow is intentionally separated from the default PR validation to avoid extending critical-path CI time.
