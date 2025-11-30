# Prompt #5: SLO Dashboards + OpenTelemetry + Prometheus (Ops)

**Target**: Core GA Q3 2025
**Owner**: SRE/Ops team
**Depends on**: OTEL instrumentation, Prometheus, Grafana

---

## Pre-Flight Checklist

```bash
# ✅ Check existing observability stack
curl http://localhost:9090/api/v1/label/__name__/values | jq '.data | length'
curl http://localhost:3001/api/health

# ✅ Verify OTEL configuration
grep -r "OTEL\|opentelemetry" server/src/ services/*/src/
ls -la observability/

# ✅ Check Jaeger
curl http://localhost:16686/api/services

# ✅ Verify Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
```

**Expected**: Prometheus running with targets, Grafana accessible, Jaeger collecting traces.

---

## Claude Prompt

```
You are implementing full observability (SLO dashboards, OTEL tracing, Prometheus metrics) for IntelGraph Core GA.

CONTEXT:
- Existing: docker-compose.dev.yml has Prometheus, Grafana, Jaeger, Loki
- Config: observability/prometheus/prometheus-dev.yml, observability/grafana/provisioning/
- Stack: Node.js services, Neo4j, PostgreSQL, Redis
- Frontend: apps/web/src/components/

REQUIREMENTS:
Wire complete observability for Core GA:

1. **OpenTelemetry Tracing**:
   - Instrument critical paths:
     - Ingest pipeline: File upload → Parse → Validate → Store
     - Entity Resolution: Find candidates → Score → Merge
     - NL→Cypher: Prompt → Generate → Estimate → Execute
     - Graph query: API → Neo4j → Transform → Return
   - Spans: Include attributes (userId, tenantId, queryHash, cost)
   - Propagate context: Across services (W3C Trace Context headers)
   - Export: To Jaeger (OTLP endpoint: http://jaeger:4318)

2. **Prometheus Metrics**:
   - Expose /metrics on all services (port 4000, 4010, etc.)
   - Custom metrics:
     - graph_query_duration_seconds (histogram, buckets: 0.1, 0.5, 1, 2, 5, 10)
     - graph_query_cost_credits (histogram)
     - entity_resolution_merges_total (counter)
     - ingest_records_processed_total (counter)
     - budget_usage_percent (gauge)
     - neo4j_query_errors_total (counter)
   - Standard metrics: process_*, nodejs_*, http_request_duration_seconds

3. **SLO Definitions**:
   - SLO 1: p95 graph query latency <1.5s (3-hop, 50k nodes)
   - SLO 2: Ingest throughput ≥1000 records/sec
   - SLO 3: API availability ≥99.9% (excluding planned maintenance)
   - SLO 4: Entity resolution accuracy ≥95% (F1 score on golden dataset)
   - Error budget: 0.1% downtime = 43 minutes/month

4. **Grafana Dashboards**:
   - Dashboard 1: SLO Overview
     - Panels: SLO compliance (green/red), error budget burn rate
     - Time range: Last 30 days
   - Dashboard 2: Latency Heatmaps
     - Panels: p50/p95/p99 latency over time (heatmap visualization)
     - Breakdown: By query type, tenant, user
   - Dashboard 3: Saturation (Resource Utilization)
     - Panels: CPU, memory, disk, Neo4j heap, connection pools
     - Alerts: CPU >80%, memory >85%
   - Dashboard 4: Traffic & Errors
     - Panels: Requests/sec, error rate, status code distribution
     - Alerts: Error rate >1%, 5xx rate >0.1%

5. **Alert Rules**:
   - Prometheus alerts (observability/prometheus/alerts/slo-alerts.yaml):
     - HighLatency: p95 >1.5s for 5 minutes
     - ErrorBudgetBurnRate: Consuming >10% of monthly budget in 1 hour
     - ServiceDown: Any service unavailable for >2 minutes
     - SlowIngest: Throughput <500 records/sec for 10 minutes
   - Alertmanager config: Route to Slack, PagerDuty, or email

6. **Runbooks**:
   - RUNBOOKS/perf-regression.md: "SLO violated → Check slow queries → Add indexes"
   - RUNBOOKS/ingest-backlog.md: "Throughput low → Scale workers → Check Redis queue"
   - Include: Diagnosis steps, remediation, escalation path

DELIVERABLES:

1. server/src/telemetry/otel.ts (or extend existing)
   - export function setupTracing(serviceName: string)
   - Initialize OTEL SDK with Jaeger exporter
   - Auto-instrument: HTTP, GraphQL, Neo4j driver
   - Custom spans for critical paths

2. server/src/telemetry/metrics.ts
   - export const graphQueryDuration = new Histogram(...)
   - export const budgetUsage = new Gauge(...)
   - Expose /metrics endpoint (Prometheus format)

3. services/ingest/src/telemetry.py (if FastAPI)
   - from opentelemetry import trace
   - Instrument: ingest pipeline with spans
   - Export to Jaeger

4. observability/prometheus/recording-rules.yaml (add):
   - job:graph_query_latency:p95 (5m)
   - job:ingest_throughput:rate5m
   - job:error_budget_burn_rate:1h

5. observability/prometheus/alerts/slo-alerts.yaml
   - Alert definitions (see sample below)

6. observability/grafana/provisioning/dashboards/slo-overview.json
   - SLO compliance panel (stat visualization)
   - Error budget gauge
   - Latency heatmap

7. observability/grafana/provisioning/dashboards/latency-heatmap.json
   - Heatmap: graph_query_duration_seconds over time
   - Variables: $service, $tenant

8. observability/grafana/provisioning/dashboards/saturation.json
   - Resource utilization panels
   - Node exporter metrics (if available)

9. RUNBOOKS/perf-regression.md
   - Steps: Check dashboard → Identify slow queries → Run EXPLAIN → Add index
   - Example commands, expected outcomes

10. RUNBOOKS/ingest-backlog.md
    - Steps: Check Redis queue depth → Scale workers → Monitor throughput
    - Escalation: If backlog >1M, page on-call

11. Tests:
    - server/tests/telemetry.test.ts (verify spans created)
    - scripts/validate-slo.sh (check if SLO metrics exist)
    - k6 load test to validate SLO under load

ACCEPTANCE CRITERIA:
✅ OTEL traces visible in Jaeger for ingest, ER, NL→Cypher paths
✅ Prometheus scrapes all services (/metrics endpoints)
✅ SLO dashboard shows real-time compliance (green/red)
✅ Alerts fire when SLO violated (test with chaos engineering)
✅ p95 latency <1.5s on benchmark (3-hop, 50k nodes)

TECHNICAL CONSTRAINTS:
- OTEL: Use @opentelemetry/sdk-node, @opentelemetry/exporter-trace-otlp-http
- Prometheus: prom-client library for Node.js
- Grafana: JSON dashboards (don't use Terraform provider for MVP)
- SLO calculation: Use Prometheus recording rules for performance
- Runbooks: Markdown with code blocks (executable commands)

SAMPLE OTEL SETUP (server/src/telemetry/otel.ts):
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function setupTracing(serviceName: string) {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
    }),
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().then(() => console.log('Tracing terminated'));
  });
}
```

SAMPLE PROMETHEUS METRICS (server/src/telemetry/metrics.ts):
```typescript
import { register, Histogram, Gauge, Counter } from 'prom-client';

export const graphQueryDuration = new Histogram({
  name: 'graph_query_duration_seconds',
  help: 'Graph query latency in seconds',
  labelNames: ['query_type', 'tenant_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const budgetUsage = new Gauge({
  name: 'budget_usage_percent',
  help: 'Current budget usage as percentage',
  labelNames: ['tenant_id'],
});

export const ingestRecords = new Counter({
  name: 'ingest_records_processed_total',
  help: 'Total records processed by ingest pipeline',
  labelNames: ['source_type', 'status'],
});

export function setupMetricsEndpoint(app: Express) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}
```

SAMPLE ALERT RULE (observability/prometheus/alerts/slo-alerts.yaml):
```yaml
groups:
  - name: slo_alerts
    interval: 30s
    rules:
      - alert: HighGraphQueryLatency
        expr: histogram_quantile(0.95, rate(graph_query_duration_seconds_bucket[5m])) > 1.5
        for: 5m
        labels:
          severity: warning
          slo: latency
        annotations:
          summary: "Graph query p95 latency exceeds SLO (>1.5s)"
          description: "p95 latency is {{ $value }}s (threshold: 1.5s)"
          runbook: "https://intelgraph.io/runbooks/perf-regression"

      - alert: ErrorBudgetBurnRate
        expr: rate(http_requests_total{status=~"5.."}[1h]) / rate(http_requests_total[1h]) > 0.001
        for: 15m
        labels:
          severity: critical
          slo: availability
        annotations:
          summary: "Burning error budget too fast (>10x normal rate)"
          description: "Error rate: {{ $value | humanizePercentage }}"
          runbook: "https://intelgraph.io/runbooks/incident-response"
```

SAMPLE RECORDING RULE (observability/prometheus/recording-rules.yaml):
```yaml
groups:
  - name: slo_recording_rules
    interval: 30s
    rules:
      - record: job:graph_query_latency:p95
        expr: histogram_quantile(0.95, sum(rate(graph_query_duration_seconds_bucket[5m])) by (le, job))

      - record: job:ingest_throughput:rate5m
        expr: sum(rate(ingest_records_processed_total[5m])) by (job)

      - record: job:error_budget_burn_rate:1h
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) / 0.001
```

OUTPUT:
Provide:
(a) OTEL instrumentation code (TypeScript + Python if needed)
(b) Prometheus metrics definitions
(c) Grafana dashboards (JSON)
(d) Alert rules (YAML)
(e) Recording rules (YAML)
(f) Runbooks (Markdown)
(g) Tests (verify metrics exist, traces created)
(h) Helm chart updates (if deploying to Kubernetes)
```

---

## Success Metrics

- [ ] All services expose /metrics endpoint
- [ ] Traces visible in Jaeger for critical paths (ingest, ER, NL→Cypher)
- [ ] SLO dashboard shows real-time compliance
- [ ] p95 latency <1.5s on 3-hop, 50k node benchmark
- [ ] Alerts fire during chaos test (kill Neo4j, expect ServiceDown alert)

---

## Follow-Up Prompts

1. **SLO reporting**: Weekly SLO reports emailed to stakeholders
2. **Distributed tracing**: Add trace IDs to error messages for debugging
3. **Custom exporters**: Send metrics to Datadog, New Relic, or Splunk

---

## References

- Existing config: `observability/prometheus/prometheus-dev.yml`
- Grafana provisioning: `observability/grafana/provisioning/`
- OTEL Node SDK: https://opentelemetry.io/docs/instrumentation/js/
- Prometheus client: https://github.com/siimon/prom-client
- SLO methodology: https://sre.google/workbook/implementing-slos/
