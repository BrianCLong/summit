IntelGraph Pipelines Monitoring
===============================

- SLIs/SLOs: see `slislos.yaml`.
- Prometheus scrape: server exposes `/api/monitoring/metrics` (aggregated) and supports pipeline SLI metrics.
- Alerting: see `alertmanager/rules.yaml` and `alertmanager/alertmanager.yml` for Slack integration.
- Dashboards: import JSON in `dashboards/` into Grafana.
- Burn rate tool: `sli_slo.py` computes error budget burn via Prometheus API.

Labeling guidance:
- Use labels `source`, `pipeline`, and `env` on all pipeline SLI metrics.
- Example (Node): `metrics.pipelineFreshnessSeconds.set({ source:'crm', pipeline:'ingest', env:process.env.NODE_ENV||'dev' }, 42)`.

