# Rollback Runbook

## Overview
This runbook describes the procedure for rolling back a release, specifically focusing on the canary rollback scenario.

## Triggers
- Canary SLO violation (Error Rate > 1% or Latency p95 > 1s).
- Synthetic probe failure in canary environment.
- Manual determination of critical defect.

## Immediate Actions
1. **Stop the Line**: Pause any ongoing pipelines.
2. **Revert Traffic**: Switch 100% traffic back to the stable baseline.
   ```bash
   # Example command (adjust for actual ingress controller)
   kubectl patch virtualservice summit-api -n production --type='json' -p='[{"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100}, {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}]'
   ```
3. **Verify Health**: Check `/health` endpoint of stable version.
   ```bash
   curl -I https://api.summit.intelgraph.io/health
   ```

## Post-Rollback
1. Capture logs from failed canary pods.
2. Generate incident report using `scripts/incident-report.ts`.
3. Mark the release version as bad in the registry.

## Automation
The auto-rollback mechanism is triggered by Prometheus alerts:
- `CanaryHighErrorRate`
- `CanaryHighLatency`

Check `runbooks/maestro-rollback.md` for orchestrator-specific details.
