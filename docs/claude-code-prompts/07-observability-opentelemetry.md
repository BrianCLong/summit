# Prompt 7: Observability (OpenTelemetry → Prometheus/Grafana)

## Role
SRE/Observability Engineer

## Context
IntelGraph requires comprehensive observability to:
- **Meet SLOs** - Track and alert on performance targets
- **Debug production issues** - Trace requests end-to-end
- **Optimize performance** - Identify bottlenecks
- **Error budget management** - Alert before SLO violations

OpenTelemetry provides vendor-neutral instrumentation for metrics, traces, and logs.

## Task
Implement end-to-end observability with OpenTelemetry:

### 1. Instrumentation
- Instrument all services with OTel SDK
- Emit RED metrics (Rate, Errors, Duration)
- Emit USE metrics (Utilization, Saturation, Errors) for resources
- Distributed tracing across services
- Structured logging with trace correlation

### 2. Dashboards
- Grafana dashboards for API, ingest, and graph services
- SLO burn rate alerts at 80% threshold
- Error budget tracking
- Resource utilization views

### 3. Alerting
- Prometheus alerting rules
- Integration with incident management (PagerDuty, Opsgenie, etc.)
- Runbook links from alerts

## Guardrails

### Performance
- **OTel overhead** < 5% CPU, < 100 MB memory per service
- **Trace sampling** - 1% sample rate for high-volume endpoints
- **Metric cardinality** - Limit labels to prevent explosion

### Data Retention
- **Traces**: 7 days
- **Metrics**: 30 days (high-res), 365 days (downsampled)
- **Logs**: 30 days

## Deliverables

### 1. OpenTelemetry Configuration
- [ ] OTel SDK integration for all services (TypeScript/Node.js)
- [ ] Instrumentation for:
  - [ ] HTTP/GraphQL requests
  - [ ] Database queries (Neo4j, PostgreSQL)
  - [ ] Redis cache operations
  - [ ] External API calls
- [ ] Trace context propagation (W3C Trace Context)
- [ ] Exemplar support (link metrics to traces)

### 2. Prometheus Setup
- [ ] `prometheus.yml` scrape configuration
- [ ] Service discovery for Kubernetes
- [ ] Recording rules for SLO metrics
- [ ] Alerting rules with thresholds

### 3. Grafana Dashboards
- [ ] `grafana/dashboards/` directory with JSON dashboards:
  - [ ] `api-overview.json` - API gateway metrics
  - [ ] `ingest-pipeline.json` - Ingest throughput and errors
  - [ ] `graph-queries.json` - Neo4j query performance
  - [ ] `slo-dashboard.json` - SLO burn rates and error budgets
  - [ ] `resource-utilization.json` - CPU, memory, disk, network

### 4. Alerting Rules
- [ ] `prometheus/alerts/` directory with alert rules:
  - [ ] `slo-alerts.yaml` - SLO burn rate alerts
  - [ ] `error-rate-alerts.yaml` - Error rate thresholds
  - [ ] `latency-alerts.yaml` - Latency threshold alerts
  - [ ] `resource-alerts.yaml` - Resource saturation alerts

### 5. Runbooks
- [ ] Runbook links embedded in Grafana panels
- [ ] Alert annotations with troubleshooting steps
- [ ] Example runbooks for common alerts

## Acceptance Criteria
- ✅ Synthetic traffic shows complete traces across gateway → services → databases
- ✅ SLO dashboard panels reflect configured targets (read p95 ≤ 350ms, etc.)
- ✅ Alert fires in simulation at 80% error budget burn
- ✅ TraceIDs appear in structured logs
- ✅ Exemplars link metrics to trace samples
- ✅ Dashboard loads in < 2 seconds

## OpenTelemetry Instrumentation Example

```typescript
// services/api/src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'api-gateway',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERSION || 'dev',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),

  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),

  metricReader: new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/metrics'],
      },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

## Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'intelgraph-prod'

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:9464']
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_.*'
        action: drop  # Drop Go runtime metrics if not needed

  - job_name: 'graph-service'
    static_configs:
      - targets: ['graph-service:9464']

  - job_name: 'ingest-service'
    static_configs:
      - targets: ['ingest-service:9464']

  # Kubernetes service discovery (production)
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
```

## Alerting Rules Example

```yaml
# prometheus/alerts/slo-alerts.yaml
groups:
  - name: slo_alerts
    interval: 30s
    rules:
      # API Read Latency SLO
      - alert: APIReadLatencyBreach
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket{method="GET"}[5m])
          ) > 0.350
        for: 5m
        labels:
          severity: warning
          slo: read_latency
        annotations:
          summary: "API read latency p95 > 350ms"
          description: "Read latency p95 is {{ $value }}s, exceeding SLO of 350ms"
          runbook_url: "https://runbooks.intelgraph.io/api-latency"

      # Error Budget Burn Rate (80% threshold)
      - alert: ErrorBudgetBurnHigh
        expr: |
          (
            1 - (sum(rate(http_requests_total{status=~"2.."}[1h])) /
                 sum(rate(http_requests_total[1h])))
          ) > 0.008  # 80% of 1% error budget
        for: 10m
        labels:
          severity: critical
          slo: error_budget
        annotations:
          summary: "Error budget burning at 80%+"
          description: "Error rate is {{ $value | humanizePercentage }}"
          runbook_url: "https://runbooks.intelgraph.io/error-budget"

      # Graph Query Latency SLO
      - alert: GraphQueryLatencyBreach
        expr: |
          histogram_quantile(0.95,
            rate(neo4j_query_duration_seconds_bucket[5m])
          ) > 1.2
        for: 5m
        labels:
          severity: warning
          slo: graph_query_latency
        annotations:
          summary: "Graph query latency p95 > 1.2s"
          description: "Query latency p95 is {{ $value }}s for 2-3 hop queries"
          runbook_url: "https://runbooks.intelgraph.io/graph-latency"
```

## Grafana Dashboard Example (JSON snippet)

```json
{
  "dashboard": {
    "title": "API Gateway SLO Dashboard",
    "panels": [
      {
        "title": "Read Latency p95 (SLO: 350ms)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{method=\"GET\"}[5m]))",
            "legendFormat": "p95 latency"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.35, "color": "red" }
              ]
            }
          }
        },
        "links": [
          {
            "title": "Runbook: API Latency",
            "url": "https://runbooks.intelgraph.io/api-latency"
          }
        ]
      }
    ]
  }
}
```

## Related Files
- `/home/user/summit/docs/OBSERVABILITY.md` - Observability guide
- `/home/user/summit/observability/` - Prometheus/Grafana configs
- `/home/user/summit/RUNBOOKS/` - Operational runbooks

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 7: Observability implementation"

# Or use the slash command (if configured)
/observability
```

## Notes
- Use OpenTelemetry Collector for batching and sampling
- Configure tail-based sampling for error traces (keep 100% of errors)
- Use Tempo or Jaeger for trace storage
- Export logs in OTLP format for correlation
- Consider cost-optimized metric cardinality (limit labels)
