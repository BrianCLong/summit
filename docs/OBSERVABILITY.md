# Observability

This guide documents the observability stack for the Summit platform.

## Architecture

The observability stack consists of:

- **Prometheus**: Metrics collection and storage.
- **Grafana**: Visualization via dashboards.
- **Alertmanager**: Alert routing and notification.
- **Jaeger**: Distributed tracing.
- **Node Exporter**: System metrics (CPU, Memory, Disk).
- **OpenTelemetry**: Instrumentation for traces and metrics.

## Quick Start

1.  Start the monitoring stack:

    ```bash
    docker compose -f monitoring/docker-compose.monitoring.yml up -d
    ```

2.  Access the services:
    - **Grafana**: [http://localhost:3000](http://localhost:3000) (User: `admin`, Password: `admin123`)
    - **Prometheus**: [http://localhost:9090](http://localhost:9090)
    - **Alertmanager**: [http://localhost:9093](http://localhost:9093)
    - **Jaeger UI**: [http://localhost:16686](http://localhost:16686)

## Dashboards

A comprehensive "Summit System Overview" dashboard is available in Grafana. It covers:

- Request Rate & Error Rate
- p95 Latency
- Active Connections
- AI Job Processing
- Database Health

## Distributed Tracing

Tracing is implemented using OpenTelemetry. Traces are exported to Jaeger.
To view traces:

1.  Generate traffic to the application.
2.  Open Jaeger UI.
3.  Select `intelgraph-server` service.
4.  Click "Find Traces".

## Alerting

Alerts are defined in `monitoring/alert_rules.yml`. Key alerts include:

- High Error Rate (> 5%)
- High Latency (p95 > 2s)
- Database Connection Failures
- Low Disk Space

## Metrics

The application exposes metrics at `/metrics`.
Key metrics include:

- `http_requests_total`: Total HTTP requests.
- `http_request_duration_seconds`: HTTP latency histogram.
- `ai_jobs_total`: AI/ML job counters.
- `db_connections_active`: Active DB connections.
- `cache_hits_total` / `cache_misses_total`: Cache performance.
