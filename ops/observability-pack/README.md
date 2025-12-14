# Observability Pack

SLO dashboards, OTEL/Prometheus telemetry, slow-query killer, budget caps, and incident runbooks.

## Components

### Dashboards
- `dashboards/slo-overview.json` - Service Level Objectives dashboard
- `dashboards/service-health.json` - Per-service health metrics
- `dashboards/cost-tracking.json` - Resource cost and budget tracking
- `dashboards/performance.json` - Query performance and latency

### Alerts
- `alerts/slo-burn-rate.yaml` - SLO burn rate alerts
- `alerts/error-budget.yaml` - Error budget consumption alerts
- `alerts/cost-guard.yaml` - Budget cap violation alerts
- `alerts/slow-query.yaml` - Slow query detection and killing

### Runbooks
- `runbooks/perf-regression.md` - Performance regression response
- `runbooks/ingest-backlog.md` - Ingest queue backlog handling
- `runbooks/authz-drift.md` - Authorization policy drift detection
- `runbooks/cost-spike.md` - Cost spike investigation and mitigation

### Infrastructure
- Helm charts in `infra/helm/observability-pack/`
- Terraform modules in `infra/terraform/observability/`
- Canary deployment scripts
- Rollback automation

## Quick Start

```bash
# Deploy observability stack
helm upgrade --install observability-pack ./infra/helm/observability-pack \
  --namespace monitoring \
  --values values.yaml

# Run chaos drill checklist
./scripts/chaos-drill.sh --checklist
```

## SLOs

| Service | Availability | Latency (p99) | Error Rate |
|---------|--------------|---------------|------------|
| API Gateway | 99.9% | <500ms | <0.1% |
| Graph API | 99.5% | <2s | <1% |
| Prov-Ledger | 99.9% | <1.5s | <0.1% |
| Entity Resolution | 99.0% | <5s | <2% |
| ZK-TX | 99.5% | <3s | <0.5% |
| Policy Engine | 99.9% | <200ms | <0.1% |

## Cost Guard

Budget caps are enforced via the cost-guard CRON job:

```yaml
# Cost policies
budgets:
  daily_compute: $500
  daily_storage: $100
  daily_network: $50
  monthly_total: $15000

actions:
  warning_threshold: 80%
  hard_cap_threshold: 100%
  auto_scale_down: true
```
