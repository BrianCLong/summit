## Observability Shortcuts

Dashboards (pin these URLs):

- Latency & error SLOs (Prometheus/Grafana): `<ADD_GRAFANA_SLO_DASH_URL>`
- Cost per run & budget: `<ADD_GRAFANA_COST_DASH_URL>`
- Policy simulation outcomes: `<ADD_GRAFANA_POLICY_DASH_URL>`

### Friction Alerts

Emit `FrictionAlert` on:

- Queue depth > threshold for 5m
- Handoff latency p95 > target
- Policy sim duration > target or fail rate > threshold

Actions: auto‑remediate (scale, reroute to standby agent) or open PagerDuty incident with context links.
