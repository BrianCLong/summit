# CI Reliability Pack

This directory contains configuration and policies for a reliable Continuous Integration pipeline.

## Test Sharding

We use sharding to parallelize test execution and reduce wall time.
See `.github/workflows/ci-sharded-example.yml` for the configuration.
Tests are split into `N` shards, and each job runs a subset.

## Flake Detection & Quarantine

Flaky tests destroy trust in CI. We follow a "Mark & Track" policy:

1.  **Identification**: If a test fails intermittently (passes on retry), it is flagged as flaky.
2.  **Quarantine**: The test is added to `ci/quarantine.json`.
3.  **Handling**:
    - Quarantined tests may be skipped in the main blocking pipeline or run in a separate "non-blocking" job.
    - The owning team is notified to fix it.
4.  **Exit**: Once fixed and verified stable (e.g., 50 consecutive runs), it is removed from quarantine.

## Local Reproduction

To run a specific shard locally (conceptually):

```bash
# Example: Run 1/4 shard
jest --shard=1/4
```

## Caching

We utilize `actions/cache` for:

- `pnpm` store
- `next.js` build cache
- `turbo` cache
