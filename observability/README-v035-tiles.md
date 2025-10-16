# v0.3.5 Observability Tiles — How to Enable

## 1) Load recording rules & alerts

```bash
promtool check rules prom/rules/mc-v035-recording.rules.yaml
promtool check rules prom/alerts/mc-v035-slo.alerts.yaml
# Apply via your Prometheus config reloader or ConfigMap update
```

## 2) Import the dashboard

```bash
scripts/import-grafana-dashboard.sh https://grafana.example.com $GRAFANA_TOKEN \
  < observability/grafana/dashboards/mc-v035-tiles.json
```

## 3) Expected metrics

- `mc_canary_composite_score` (exported by adaptive canary controller)
- `mc_attest_jws_fail_total`, `mc_attest_jws_attempt_total`
- `mc_budget_throttle_total`, `mc_budget_throttle_fp_total`, `mc_budget_throttle_tp_total`

## 4) SLOs

- JWS failure rate < 0.1% over 15m (page otherwise)
- Budget v2 noise (FP) < 5% over 15m (warn otherwise)
- Composite score ≥ 0.85 (page if lower for 10m)
