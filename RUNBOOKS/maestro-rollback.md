# Maestro Orchestrator SLO + Rollback Runbook

**Owners:** Maestro SRE (@maestro-sre)
**Pager:** `#maestro-pager`
**Dashboards:** Grafana `maestro/overview`, `maestro/slo-burn`, `maestro/deployments`
**Workloads:** `Deployment/maestro-orchestrator` (namespace: `intelgraph-prod`), Helm release `maestro`

## When to Use
Trigger this runbook when any Maestro alert fires or user reports match these symptoms:

| Symptom/Alert | What it means | First checks |
| --- | --- | --- |
| `MaestroHighErrorRate` | Error rate >10% in orchestration handlers | `kubectl -n intelgraph-prod logs deploy/maestro-orchestrator --since=10m | tail -n 80`; Prometheus `rate(maestro_orchestration_errors_total[5m])` |
| `MaestroHighLatency` | p95 orchestration duration >30s | `kubectl -n intelgraph-prod get hpa maestro-orchestrator -o wide`; Prometheus `histogram_quantile(0.95, rate(maestro_orchestration_duration_seconds_bucket[5m]))` |
| `MaestroPodDown` | Pods not reporting to Prometheus | `kubectl -n intelgraph-prod get pods -l app=maestro-orchestrator`; `kubectl -n intelgraph-prod describe deploy/maestro-orchestrator` |
| `MaestroMemoryUsageHigh` | Pod memory >85% limit | `kubectl -n intelgraph-prod top pod -l app=maestro-orchestrator`; `kubectl -n intelgraph-prod describe pod <pod>` |
| `MaestroCPUUsageHigh` | Pod CPU >85% quota | `kubectl -n intelgraph-prod top pod -l app=maestro-orchestrator`; check background jobs or runaway queries |

## Triage
1. **Confirm scope**
   - `kubectl -n intelgraph-prod get pods -l app=maestro-orchestrator -o wide`
   - `kubectl -n intelgraph-prod rollout status deploy/maestro-orchestrator`
2. **Collect signals**
   - Logs: `kubectl -n intelgraph-prod logs deploy/maestro-orchestrator --since=15m | tail -n 200`
   - Events: `kubectl -n intelgraph-prod get events --sort-by=.lastTimestamp | tail -n 20`
   - Metrics: Prometheus queries above; check SLO burn dashboard for budget burn.
3. **Decide path**
   - If **error/latency spike** followed a deploy, prioritize rollback.
   - If **pod down**, restart then rollback if restart fails.
   - If **resource pressure**, scale or roll back to last known good image.

## Mitigation & Rollback

### Quick stabilizers
- Restart: `kubectl -n intelgraph-prod rollout restart deploy/maestro-orchestrator`
- Drain stuck pod: `kubectl -n intelgraph-prod delete pod -l app=maestro-orchestrator --grace-period=30`

### Kubernetes rollback (fastest)
1. Inspect history: `kubectl -n intelgraph-prod rollout history deploy/maestro-orchestrator`
2. Roll back: `kubectl -n intelgraph-prod rollout undo deploy/maestro-orchestrator --to-revision=<REV>`
3. Watch: `kubectl -n intelgraph-prod rollout status deploy/maestro-orchestrator --watch`

### Helm rollback
1. `helm -n intelgraph-prod history maestro`
2. `helm -n intelgraph-prod rollback maestro <REV>`
3. Verify service endpoints and ingress:
   - `kubectl -n intelgraph-prod get ing maestro`
   - `curl -I https://maestro.intelgraph.ai/health`

### GitHub Actions rollback (cd-rollback.yml)
Use this for auditable, remote rollbacks:

```bash
# Requires GitHub CLI auth with environment permissions
# Roll back staging to previous image tag
gh workflow run cd-rollback.yml \
  --ref main \
  -f environment=staging \
  -f image_tag=<stable-image-tag>
```

- Validate workflow dispatch in **Actions → CD Rollback** and monitor console output for compose pull/up steps.
- Production runs require approved secrets in the target environment. If secrets are missing, fall back to Helm rollback above.

## Verification (post-mitigation)
- Health: `curl -I https://maestro.intelgraph.ai/health` (expect `200 OK`).
- Metrics: confirm error rate/latency return below thresholds for 10 minutes.
- Logs: no repeating stack traces in the last 5 minutes.
- Traffic: `kubectl -n intelgraph-prod top pod -l app=maestro-orchestrator` shows steady utilization.

## Evidence & Follow-up
- Record the rollback (revision, time, image tag) in `drills/maestro-cd-rollback-drill.md`.
- Open a follow-up issue if the rollback was due to a bad release; include offending commit SHA and failing alerts.
