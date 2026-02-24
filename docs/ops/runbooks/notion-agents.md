# Notion Agents Runbook

## Feature Flag

- Flag: `COMPUTER_USE_AGENT_ENABLED`
- Default: `false`
- Enable for controlled runs:

```bash
COMPUTER_USE_AGENT_ENABLED=true python -m summit agent run computer_use_demo.yaml --output-dir artifacts/computer_use/demo
```

## Rollback

1. Set `COMPUTER_USE_AGENT_ENABLED=false`.
2. Re-run smoke validation for unaffected agent flows.
3. Capture rollback note in release evidence.

## Incident Classes

- `P1`: policy bypass or network side-effect
- `P2`: deterministic artifact mismatch
- `P3`: plan schema validation failure

## On-Call Checks

1. Confirm `computer_use_policy_check` CI job status.
2. Compare baseline and candidate artifacts:

```bash
python scripts/monitoring/notion-agents-drift.py \
  --baseline artifacts/computer_use/baseline \
  --candidate artifacts/computer_use/candidate \
  --out-dir artifacts/notion-agents-drift
```

3. Inspect `drift_report.json` and `trend_metrics.json`.

4. Verify budget guardrails:

```bash
python scripts/profiling/computer_use_profile.py \
  --metrics artifacts/computer_use/demo/metrics.json \
  --max-latency-ms 3000 \
  --max-memory-mb 256 \
  --max-cost-usd 0.02
```
