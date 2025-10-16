# Sprint 17 Test Plan

## Areas

- Feature aggregation across time windows.
- Weight checksum verification.
- Explanation correctness and DLP masking.
- Watchlist CRUD, import/export, threshold alerts.
- Policy gates preventing auto-remediation.

## Strategy

- Unit tests for risk engine, weight verifier, feature store.
- Integration test for watchlist flow to alert.
- Manual review of fairness report and drift dashboard.

## Tools

- Jest, ts-node scripts, Playwright for e2e path.

## Exit Criteria

- All unit tests green.
- Watchlist flow exercised end-to-end.
- No unsigned weight files.
