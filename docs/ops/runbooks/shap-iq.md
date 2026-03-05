# SHAP-IQ Runbook

## Enable
Run with explicit opt-in:

```bash
python3 scripts/explain_run.py --input explain/shap_iq/fixtures/sample_input.json --output /tmp/shapiq --enable
```

## Expected Runtime
- Deterministic batch mode.
- Target: bounded overhead relative to inference path.

## Drift Monitoring

```bash
python3 scripts/monitoring/shap_iq-drift.py --baseline /tmp/shapiq/metrics.json --candidate /tmp/shapiq/metrics.json --output /tmp/shapiq/drift_report.json
```

## Rollback
1. Disable scheduled drift job.
2. Stop invoking `scripts/explain_run.py` in pipelines.
3. Archive generated artifacts per retention policy.
