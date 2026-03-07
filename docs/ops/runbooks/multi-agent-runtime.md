# Multi-Agent Runtime Runbooks

## Runbooks
- Local tmux session recovery: Close the window and re-run the `run-local-tmux.ts` script.
- Burst queue backlog recovery: Ensure no blocked tasks or scale workers.
- Stale lease cleanup: Force release stale targets via scripts.
- Controller crash restart: Start script again with retry bounds.
- Artifact mismatch triage: Verify deterministic hash algorithms and sorting.
- Cost-budget breach response: Check usage on external APIs.

## Alerts
- Queue backlog > threshold for 10 min
- Lease timeout rate > 2%
- Write-conflict denials spike
- Redaction misses > 0
- Burst mode invoked while feature flag disabled
- Drift detector shows plan instability regression
