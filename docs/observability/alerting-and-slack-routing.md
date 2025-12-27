# Alerting & Slack Routing (IntelGraph)

## Overview

IntelGraph alert rules live in PrometheusRule manifests (for example,
`k8s/monitoring/rules/intelgraph-rules.yaml`) and route through
Alertmanager (`infra/k8s/monitoring/alert-manager-config.yaml`). Each alert
**must** include:

- `severity`, `service`, and `slo` labels.
- `runbook_url` for operator response.
- `dashboard_url` for Grafana context.
- `drilldown_url` when the alert is tied to log events (ex: slow-query killer
  auto-kills).

## SLO + Performance Alerts

### Error budget burn

The API error budget burn alerts (`APIErrorBudgetBurnFast` and
`APIErrorBudgetBurnSlow`) track burn rates against a 99.9% SLO. These route to
`#performance` and `#slo-alerts` and include links to:

- The SLO runbook: `https://docs.intelgraph.com/runbooks/slo-burn`
- The API Golden Signals dashboard
- A Loki drill-down query for slow-query events when elevated error rates
  coincide with query timeouts

### P95 latency

`HighAPILatencyP95` monitors HTTP P95 latency for core API services.
It routes to `#performance` and includes the same drill-down link for
correlating against slow-query kill events.

### Slow-query killer drill-down

`SlowQueryKillRateHigh` fires when auto-kill activity exceeds the threshold.
The drill-down URL opens a Loki query scoped to `Slow query killed successfully`
log lines, letting responders pivot to trace IDs and request IDs in logs.

## Slack Routing

Alertmanager routes performance/SLO alerts to:

- `#performance` via the `performance-team` receiver
- `#slo-alerts` via the `slo-alerts` receiver

Critical alerts still page via PagerDuty and send to `#intelgraph-critical`.
Warnings go to `#intelgraph-warnings`.

## Validation

Run the alert config validation script before deployments:

```bash
scripts/observability/validate-alert-configs.sh
```

This script checks PrometheusRule syntax (via `promtool`) and ensures the
Alertmanager config parses cleanly.
