# Summit Observability Setup

This document describes how to run and verify the Summit observability stack.

## Architecture

The stack consists of:
*   **Prometheus**: Metrics collection and alerting.
*   **Grafana**: Visualization dashboards.
*   **Jaeger**: Distributed tracing (traces).
*   **Loki**: Log aggregation.
*   **Promtail**: Log collection.
*   **Alertmanager**: Alert routing.

## Running the Stack

The observability stack is integrated into the development Docker Compose setup.

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start the application services (`api`, `gateway`, etc.) and the observability services.

## Accessing Interfaces

*   **Grafana**: [http://localhost:3001](http://localhost:3001) (User: `admin`, Pass: `admin`)
    *   Dashboards are automatically provisioned in the "Summit Observability" folder.
    *   New "System Health" dashboard available.
*   **Prometheus**: [http://localhost:9090](http://localhost:9090)
*   **Jaeger UI**: [http://localhost:16686](http://localhost:16686)
*   **Alertmanager**: [http://localhost:9093](http://localhost:9093)

## Metrics & Tracing

*   **Application Metrics**: The `api` service exposes metrics at `/metrics`. Prometheus scrapes this every 15s.
*   **Distributed Tracing**: The `api` and `gateway` services are configured to send OTLP traces to Jaeger.
    *   `OTEL_EXPORTER_OTLP_ENDPOINT`: `http://jaeger:4318`
*   **Logs**: Promtail collects logs from Docker containers and sends them to Loki. View them in Grafana (Explore -> Loki).

## Alerts

Alert rules are defined in `observability/prometheus/alerts/`.
*   `alerts.yml`: Contains standard system health alerts (High Error Rate, High Latency).

## Troubleshooting

If dashboards are empty:
1.  Check if Prometheus targets are up: [http://localhost:9090/targets](http://localhost:9090/targets).
2.  Ensure services are running (`docker-compose -f docker-compose.dev.yml ps`).
