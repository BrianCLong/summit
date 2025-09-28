# Rollback Playbook

## Trigger Conditions
- Canary or prod error rate > 1% for 5 consecutive minutes
- Latency p95 > SLO by 20%
- Failed OPA policy verification or cosign signature mismatch
- PagerDuty P1/P0 incident opened

## Immediate Actions
1. **Freeze Deployments**: Pause the CD workflow via `workflow_dispatch` toggle.
2. **Activate Rollback Task**:
   ```bash
   helm rollback hello-service <previous_revision> --namespace {{ env }} --wait
   helm rollback hello-job <previous_revision> --namespace {{ env }} --wait
   ```
3. **Verify Signatures**: Run `task verify` to confirm the rolled-back images are still signed.
4. **Notify Stakeholders**: Post updates in `#oncall` and incident bridge.

## Data Capture
- Export logs from `hello-service` and `hello-job` pods.
- Capture dashboards (latency/error/throughput) for comparison.
- Archive CI/CD run URLs and OPA decision logs.

## Post-Rollback Checklist
- File incident retrospective within 24 hours.
- Patch root cause and create ADR if template changes required.
- Update release notes with rollback status.
