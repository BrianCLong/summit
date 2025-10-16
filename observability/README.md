# Grafana — GA Core Guardrails

**Import (one-time):** Grafana → Dashboards → Import → paste JSON or point to provisioning folder.

**Datasource:** set Prometheus datasource UID env var `DS_PROM` (Grafana → Datasources → UID).

**Variables:** this dashboard expects `env` and `tenant` labels on metrics.

> To use an attached JSON instead of the minimal one here, overwrite
> `observability/grafana/dashboards/ga_core_dashboard.json` with your file.
