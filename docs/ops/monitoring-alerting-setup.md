### Stack

- **OpenTelemetry Collector** → traces & metrics to **Prometheus**/**Tempo**/**Jaeger**
- **Prometheus Operator** with **Alertmanager**
- **Grafana** dashboards (SLOs, latency heatmaps, queue depth)
- **Loki**/**ELK** for logs

### Server Instrumentation (Node/Express)

```ts
// server/src/telemetry/otel.ts
import * as otel from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
export const sdk = new otel.NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
// bootstrap
sdk.start();
```

### Prometheus Scrape Example

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: server
  namespace: intelgraph
spec:
  selector:
    matchLabels:
      app: server
  endpoints:
    - port: http
      path: /metrics
```

### SLO Alerts (examples)

```yaml
- alert: HighQueryLatency
  expr: histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le)) > 1.5
  for: 10m
  labels: { severity: page }
  annotations:
    summary: 'p95 GraphQL latency high'
    runbook_url: 'https://git.example.com/docs/runbooks/performance-troubleshooting.md'
```
