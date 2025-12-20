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

3. **Business Metrics** (`dashboards/business_metrics.json`)
   - User Signups
   - Revenue
   - API Calls
   - Active Investigations

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

## Alerting

Alert rules are defined in `observability/alert-rules-intelgraph.yml`.
Runbooks are located in `docs/runbooks/ALERT_RUNBOOKS.md`.

## Distributed Tracing

OpenTelemetry is initialized in `server/src/observability/tracer.ts`.
To enable Jaeger export, set `JAEGER_ENDPOINT` environment variable (e.g., `http://jaeger:14268/api/traces`).

## Log Aggregation

Logs are written to stdout in JSON format by Pino.
Promtail configuration is provided in `observability/loki/promtail-config.yaml` to scrape Docker logs and push to Loki.

## Synthetic Monitoring

Synthetic checks are located in `monitoring/synthetic/`.
See `monitoring/synthetic/README.md` for deployment instructions.
