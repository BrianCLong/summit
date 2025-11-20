# IntelGraph Observability

## Grafana Dashboards

### Available Dashboards

1. **System Health** (`dashboards/system-health.json`)
   - Active WebSocket connections
   - Node.js memory usage
   - CPU usage
   - Event loop lag

2. **Application Metrics** (`dashboards/application-metrics.json`)
   - Jobs processed rate
   - Outbox sync latency
   - HTTP request duration
   - Database query performance

### Import Instructions

**One-time setup:**

1. Grafana → Dashboards → Import
2. Upload JSON file from `observability/dashboards/`
3. Select Prometheus datasource

**Datasource:** Set Prometheus datasource UID env var `DS_PROM` (Grafana → Datasources → UID)

**Variables:** Dashboards expect `env` and `tenant` labels on metrics

## Metrics Endpoint

**URL:** `GET /metrics` (Prometheus format)

```bash
curl http://localhost:3000/metrics
```

## Available Metrics

- `intelgraph_jobs_processed_total` - Jobs by queue/status
- `intelgraph_outbox_sync_latency_seconds` - Sync operation latency
- `intelgraph_active_connections` - WebSocket connections by tenant
- `intelgraph_database_query_duration_seconds` - Query performance
- `intelgraph_http_request_duration_seconds` - HTTP latency

Plus all default Node.js metrics (CPU, memory, event loop, GC)

---

## Legacy: GA Core Guardrails

> To use an attached JSON instead of the minimal one here, overwrite
> `observability/grafana/dashboards/ga_core_dashboard.json` with your file.
