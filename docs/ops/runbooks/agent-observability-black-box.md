# Agent Observability Runbook

## Drift Detection
Run `python3 scripts/monitoring/agent-observability-black-box-drift.py` to check for data integrity.

## Troubleshooting
1.  **Missing Artifacts**: Check if `ObservableAgent` wrapper is initialized correctly.
2.  **Invalid Stamps**: Means `trace.jsonl` was modified after writing. Investigate tampering.
3.  **High Latency**: Disable observability in production if overhead > 5%.

## Recovery
*   Delete corrupt artifact directories manually.
*   Restart agent services to reset writer state.
