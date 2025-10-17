# Monitoring Playbook

The pilot includes baseline telemetry plumbing so SRE teams can observe runtime health from day one.

## Metrics

- **Runtime Counters** – `runtime.events.total`, `plugin.<name>.processed`, `plugin.<name>.failed`
- **Gauges** – `payload.size.bytes`, `custom.gauge` from plugins
- **Durations** – `plugin.<name>.duration.avg` (ms)

Metrics export options:

| Mode       | Description                                              |
| ---------- | -------------------------------------------------------- |
| `console`  | Default. Structured logs ship metrics for lightweight pilots. |
| `otlp`     | Configure `telemetry.endpoint` for OTLP/HTTP exports to OpenTelemetry Collector. |

Prometheus scrape configuration is provided in `monitoring/prometheus-scrape.yaml`. The Grafana dashboard JSON under `monitoring/grafana-dashboard.json` visualizes throughput, error rates, and latency.

## Logs

- Structured JSON logs emitted by `StructuredConsoleLogger` include timestamp, scope, level, and contextual metadata.
- Use `deploy/scripts/tail-logs.sh` to stream logs locally or attach to pods via `kubectl logs`.

## Tracing

The OTLP collector configuration in `config/otel-collector-config.yaml` forwards spans to Jaeger or Tempo. Enable by setting environment variables:

```bash
export LIQUID_NANO_TELEMETRY_MODE=otlp
export LIQUID_NANO_OTLP_ENDPOINT=http://otel-collector:4318
```

## Alerting

`monitoring/alert-rules.yaml` defines starter alert rules:

- **High Error Rate** – triggers when >5% of plugin invocations fail within 5 minutes.
- **Backlog Saturation** – warns when `runtime.events.total` increases without matching `processed` increments.

Tie alerts into PagerDuty or Slack via Alertmanager routes defined in `monitoring/alertmanager-config.yaml`.

## Health Checks

The runtime exposes a `/health` endpoint (see `deploy/Dockerfile` entrypoint script) that returns 200 when diagnostics show no failed events in the most recent window.

For Kubernetes, the readiness probe references `/health` while the liveness probe ensures the process responds within 5 seconds.
