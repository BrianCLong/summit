# IntelGraph Ops Pack

## k6
- Env: `API_URL`, `APQ_HASH`, `TENANT_ID`, `USER`, `PASS`, `WS_URL`, `JWT`.
- Soak: `k6 run ops/k6/soak_read_write.js`
- Smoke (APQ): `k6 run ops/k6/smoke_apq.js`
- Spike: `k6 run ops/k6/spike_login_export.js`
- Subscriptions: `k6 run ops/k6/endurance_subscriptions.js`

## Chaos (Chaos Mesh)
- Apply experiments in `ops/chaos/*`; label‑scope to `tenant=canary`.

## Prometheus/Alertmanager
- Apply `ops/prometheus/recording_rules.yaml` then `slo_burn_rules.yaml`.
- Configure routes via `ops/alertmanager/routes.yaml`.

## Grafana
- Import `ops/grafana/dashboard_ga_gonogo.json`, set Prometheus datasource.

## CD
- Reference `ops/cd/workflow_ga.yaml` for GA cutover pipeline steps.

