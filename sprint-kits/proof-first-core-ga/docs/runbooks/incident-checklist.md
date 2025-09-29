# Runbooks (Brief)

## Query Latency Breach

1. Enable Cost Guard kill switch to halt runaway queries.
2. Capture OTEL trace for offending requests.
3. Attach dashboard link and trace summary to the incident issue.

## Rollback Procedure

1. Disable the new copilot feature flag.
2. Revert ER merge via `/er/merge?revert` with the relevant audit ID.
