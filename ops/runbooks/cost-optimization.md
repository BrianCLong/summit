# Cost Guardrail Runbook

**Primary Dashboard:** Grafana → `Platform Cost Overview`

## Trigger Conditions
- `CloudCostBudgetBreach` page firing for >15 minutes.
- Forecast from FinOps tool showing >80% of weekly budget consumed mid-cycle.

## Immediate Actions
1. Acknowledge incident and notify finance stakeholder alias.
2. Validate alert accuracy by checking Snowflake cost export vs Prometheus metric.
3. Apply temporary spend freeze by disabling non-critical workflows via feature flag `cost.freezeNonProd`.

## Diagnostics
- Identify top N services using dashboard table; cross-reference deployment logs for recent changes.
- Query Prometheus `topk(10, rate(cloud_cost_hourly_usd{team="sre-platform"}[1h]))` to confirm top spenders.
- Inspect scaling events in Kubernetes via `kubectl get hpa -A --sort-by=.status.currentReplicas`.

## Mitigations
- Downscale idle environments: `terraform apply -target=module.preview_clusters -var preview_enabled=false`.
- Enable spot capacity by toggling Helm value `nodePool.spot=true` for stateless workloads.
- Work with data team to adjust retention policy through `scripts/cost/adjust_retention.sh`.

## Post-Incident
- Update cost ledger doc with incident delta and savings.
- Schedule follow-up with product teams to review feature-level cost attribution.
