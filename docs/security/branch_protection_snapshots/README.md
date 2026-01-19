# Branch Protection Snapshots

This directory contains versioned snapshots of the `main` branch protection settings.

## Purpose

These snapshots are used by the [Branch Protection Drift Detector](./DRIFT_DETECTOR.md) to ensure that the live GitHub settings do not drift from the approved configuration.

## Files

- `branch_protection_main_<YYYY-MM-DD>.json`: Full protection state (Rulesets + Classic) for `main`.

## Updating

To update the snapshot (e.g., after an approved policy change):

1.  Run the drift detector script with the generation flag:
    ```bash
    npx tsx scripts/security/check_branch_protection_drift.ts --generate-snapshot
    ```
2.  Commit the new JSON file.
