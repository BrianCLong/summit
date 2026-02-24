# Operations

## Deployment
- Run as a CI job or a scheduled task (CronJob).
- Ensure baseline artifacts are versioned and stored reliably.

## Alerting
- Monitor `status` in `metrics.json`.
- Alert if `status == 0` (Drift) persists for multiple windows.

## Baseline Management
- Rebuild baseline when legitimate product changes affect the graph structure.
- Version baselines with Git SHA or unique IDs.
