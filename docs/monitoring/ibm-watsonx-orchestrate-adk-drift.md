# S-ADK Drift Monitor

## Purpose
Detect deterministic drift in S-ADK evidence artifacts by comparing the most
recent evidence stamps.

## Command
```
python scripts/monitoring/ibm-watsonx-orchestrate-adk-drift.py --runs-dir artifacts/agent-runs
```

## Behavior
- Compares the latest two `stamp.json` files in `artifacts/agent-runs/`.
- Exits non-zero if any digest differs.
- Produces a JSON report with mismatched keys.

## Schedule
Recommended nightly run in CI or monitoring cron.
