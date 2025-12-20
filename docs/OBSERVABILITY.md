# Summit Observability Guide

**Version**: 2.0
**Last Updated**: 2025-11-20
**Status**: Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Distributed Tracing](#distributed-tracing)
5. [Logging](#logging)
6. [Metrics & Dashboards](#metrics--dashboards)
7. [Alerting & SLOs](#alerting--slos)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Overview

Summit's observability stack provides comprehensive monitoring, logging, and tracing across all services using industry-standard tools:

- **Traces**: Jaeger with OpenTelemetry
- **Logs**: Loki with Promtail
- **Metrics**: Prometheus with Grafana
- **Alerts**: AlertManager with multi-window burn rate SLOs

### Key Features

- ✅ **Distributed Tracing**: End-to-end request tracing across all services
- ✅ **Correlated Logs**: Logs linked to traces via trace IDs
- ✅ **SLO-Based Alerting**: Multi-window burn rate alerts based on Google SRE practices
- ✅ **Golden Signals Dashboards**: Traffic, Errors, Latency, Saturation
- ✅ **Structured Logging**: Consistent JSON logs with OpenTelemetry correlation
- ✅ **Service Health**: Comprehensive health checks and metrics

### Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana** | http://localhost:3001 | Dashboards, visualization |
| **Prometheus** | http://localhost:9090 | Metrics storage, queries |
| **Jaeger UI** | http://localhost:16686 | Trace visualization |
| **Loki** | http://localhost:3100 | Log aggregation |
| **AlertManager** | http://localhost:9093 | Alert routing, silencing |

**Credentials**:
- Grafana: `admin` / `admin` (change on first login)
- Others: No authentication in development

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Request                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Gateway    │──────► Traces ──┐
              │   :4100     │                  │
              └──────┬──────┘                  │
                     │                         │
                     ▼                         ▼
              ┌─────────────┐           ┌──────────┐
              │   API       │──────► Jaeger:16686│
              │   :4000     │           └──────────┘
              └──────┬──────┘                  ▲
                     │                         │
         ┌───────────┼───────────┐             │
         ▼           ▼           ▼             │
    ┌────────┐  ┌────────┐  ┌────────┐        │
    │ Neo4j  │  │Postgres│  │ Redis  │────────┘
    │ :7687  │  │ :5432  │  │ :6379  │
    └────────┘  └────────┘  └────────┘
         │           │           │
         └───────────┴───────────┘
                     │
                     ▼
              Metrics/Logs
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌─────────┐ ┌──────┐  ┌──────────┐
    │Promtail │ │ Loki │  │Prometheus│
    │ (logs)  │ │:3100 │  │  :9090   │
    └─────────┘ └──────┘  └──────────┘
                     │           │
                     └─────┬─────┘
                           ▼
                    ┌────────────┐
                    │  Grafana   │
                    │   :3001    │
                    └────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │AlertManager │
                    │    :9093    │
                    └─────────────┘
```

### Data Flow

1. **Traces**: OpenTelemetry SDK → Jaeger Collector → Jaeger Storage → Jaeger UI
2. **Logs**: Application → Stdout → Docker → Promtail → Loki → Grafana
3. **Metrics**: Application → Prometheus exporter → Prometheus → Grafana
4. **Alerts**: Prometheus → AlertManager → Slack/PagerDuty/Webhook

## Quick Start

### Start Observability Stack

```bash
# Start all services including observability
make up

# Verify services are healthy
make smoke

# Or manually check
docker-compose ps
```

Expected output: All services should show `healthy` or `running`.

### Access Dashboards

1. **Grafana**: http://localhost:3001
   - Login: `admin` / `admin`
   - Navigate to "Dashboards" → "Summit - Golden Signals"

2. **Jaeger**: http://localhost:16686
   - Select "summit-api" service
   - Click "Find Traces"

3. **Prometheus**: http://localhost:9090
   - Try query: `rate(http_requests_total[5m])`

### Generate Test Traffic

```bash
# Generate sample requests
for i in {1..100}; do
  curl -s http://localhost:4000/health > /dev/null
  echo "Request $i sent"
  sleep 0.1
done

# Check traces in Jaeger
open http://localhost:16686

# Check metrics in Grafana
open http://localhost:3001/d/summit-golden-signals
```

## Distributed Tracing

### OpenTelemetry Instrumentation

All Summit services use OpenTelemetry for automatic instrumentation:

```typescript
// server/src/monitoring/opentelemetry.ts
import { otelService } from '@intelgraph/monitoring';

// Initialize on app startup
otelService.initialize();

// Automatic instrumentation for:
// - HTTP requests
// - GraphQL resolvers
// - Database queries (Neo4j, PostgreSQL)
// - Background jobs (BullMQ)
```

### Manual Tracing

For custom operations:

```typescript
import { otelService } from '@intelgraph/monitoring';

// Wrap custom operation
await otelService.wrapNeo4jOperation('findEntities', async () => {
  const result = await neo4j.run(query);
  return result;
});

// Add span attributes
otelService.addSpanAttributes({
  'user.id': userId,
  'query.type': 'cypher',
});

// Add span events
otelService.addSpanEvent('cache_miss', { key: cacheKey });
```

### Viewing Traces

**Jaeger UI**: http://localhost:16686

1. **Select service**: Choose from dropdown (summit-api, summit-gateway)
2. **Set filters**:
   - Operation: Specific endpoint (e.g., `POST /graphql`)
   - Tags: `error=true` for errors
   - Min Duration: `500ms` for slow traces
3. **Click "Find Traces"**
4. **Click a trace** to see detailed span timeline

**Trace Details**:
- **Span duration**: How long each operation took
- **Span tags**: Metadata (user ID, status code, etc.)
- **Span logs**: Events within the span
- **Errors**: Red spans indicate errors

### Linking Traces to Logs

In Grafana, click "Logs" button in Jaeger trace view to jump to correlated logs.

In Loki, click "Trace" button next to log entry to jump to Jaeger.

## Logging

### Structured Logging with Pino

All services use `@intelgraph/logger` for consistent structured logging:

```typescript
import createLogger from '@intelgraph/logger';

const logger = createLogger({
  serviceName: 'summit-api',
  level: 'info',
});

// Log with context
logger.info({ userId: '123', action: 'login' }, 'User logged in');

// Errors
logger.error({ err: error, requestId }, 'Request failed');
```

**Automatic fields**:
- `time`: ISO 8601 timestamp
- `level`: Log level (INFO, WARN, ERROR)
- `service`: Service name
- `traceId`: OpenTelemetry trace ID (automatic)
- `spanId`: OpenTelemetry span ID (automatic)
- `environment`: Development/production

### Viewing Logs

**Grafana Explore**: http://localhost:3001/explore

```logql
# All API logs
{service="api"}

# Errors only
{service="api"} | json | level="ERROR"

# Logs for specific trace
{service="api"} | json | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"

# Count errors per minute
sum(count_over_time({service="api"} | json | level="ERROR" [1m])) by (service)
```

**Common queries**:

```logql
# Slow queries
{service="api"} |= "query" | json | duration > 1000

# Failed authentication
{service="api"} |= "authentication failed"

# By user
{service="api"} | json | userId="user-123"
```

### Log Levels

Use appropriate log levels:

| Level | Usage | Example |
|-------|-------|---------|
| `trace` | Very detailed debugging | Variable values, loop iterations |
| `debug` | Debugging information | Function entry/exit, cache hits |
| `info` | Normal operations | Request started, user action |
| `warn` | Warnings, degraded state | Retry attempt, fallback used |
| `error` | Errors, exceptions | Failed request, caught exception |
| `fatal` | Fatal errors, app crash | Unrecoverable error |

## Metrics & Dashboards

### Available Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **Golden Signals** | [Link](http://localhost:3001/d/summit-golden-signals) | Traffic, Errors, Latency, Saturation |
| **SLO Overview** | [Link](http://localhost:3001/d/summit-slo-overview) | SLO compliance, error budget |
| **System Health** | [Link](http://localhost:3001/d/system-health) | CPU, memory, disk, network |

### Key Metrics

#### Golden Signals

```promql
# Traffic: Request rate
sum(rate(http_requests_total[5m])) by (service)

# Errors: Error rate
sum(rate(http_requests_total{code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# Latency: P99 latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)

# Saturation: CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

#### Custom Metrics

Export custom metrics from your service:

```typescript
import { otelService } from '@intelgraph/monitoring';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('summit-api');

// Counter
const requestCounter = meter.createCounter('api_requests', {
  description: 'Total API requests',
});

requestCounter.add(1, { endpoint: '/graphql', method: 'POST' });

// Histogram
const latencyHistogram = meter.createHistogram('api_latency', {
  description: 'API request latency',
  unit: 'ms',
});

latencyHistogram.record(duration, { endpoint: '/graphql' });
```

### Creating Dashboards

1. Go to Grafana → Dashboards → New Dashboard
2. Add panel → Select "Prometheus" data source
3. Enter PromQL query
4. Configure visualization
5. Save dashboard

**Tips**:
- Use variables for dynamic filtering (service, environment)
- Add threshold lines for SLO targets
- Use heatmaps for latency distributions
- Link related dashboards

## Alerting & SLOs

### Service Level Objectives

Defined in `observability/slo/comprehensive-slos.yaml`:

| Service | Availability SLO | Latency SLO |
|---------|------------------|-------------|
| API | 99.9% | P99 < 500ms |
| Gateway | 99.95% | P99 < 100ms |
| Web | 99.9% | P95 < 2s |
| Neo4j | 99.99% | P99 < 1s |
| PostgreSQL | 99.99% | P99 < 1s |

### Multi-Window Burn Rate Alerts

Based on Google SRE Workbook methodology:

| Severity | Burn Rate | Long Window | Short Window | Budget in | Action |
|----------|-----------|-------------|--------------|-----------|--------|
| **Critical** | 14.4x | 1h | 5m | 2 days | Page immediately |
| **High** | 6x | 6h | 30m | 5 days | Page in hours |
| **Medium** | 1x | 3d | 6h | 30 days | Create ticket |

**How it works**:
- Alert fires when BOTH windows exceed burn rate threshold
- Reduces false positives while maintaining quick detection
- 2-minute wait period before paging

### Alert Configuration

Alerts defined in `observability/prometheus/alerts/`:

```yaml
# Example: API Error Budget Burn
- alert: APIErrorBudgetBurnCritical
  expr: |
    (
      sum(rate(http_requests_total{service="api",code=~"5.."}[1h]))
      /
      sum(rate(http_requests_total{service="api"}[1h]))
      > (14.4 * 0.001)
    )
    and
    (
      sum(rate(http_requests_total{service="api",code=~"5.."}[5m]))
      /
      sum(rate(http_requests_total{service="api"}[5m]))
      > (14.4 * 0.001)
    )
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "API error budget burning at critical rate"
    runbook_url: "https://runbooks.summit.dev/observability/error-rate-spike"
```

### Alert Routing

AlertManager routes alerts based on severity:

- **Critical**: Slack #alerts-critical + PagerDuty
- **Warning**: Slack #alerts-warning
- **Info**: Webhook for tracking

Configure in `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_URL=https://events.pagerduty.com/v2/enqueue
PAGERDUTY_KEY=your-integration-key
```

### Silencing Alerts

During maintenance:

```bash
# Silence alert in AlertManager UI
open http://localhost:9093

# Or via API
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name":"alertname","value":"APIErrorBudgetBurnCritical"}],
    "startsAt": "2025-11-20T12:00:00Z",
    "endsAt": "2025-11-20T14:00:00Z",
    "createdBy": "oncall",
    "comment": "Planned maintenance"
  }'
```

## Troubleshooting

### Common Issues

#### Issue: No traces in Jaeger

**Check**:
1. Is Jaeger running? `docker-compose ps jaeger`
2. Is JAEGER_ENDPOINT set? `echo $JAEGER_ENDPOINT`
3. Are traces being sent? Check API logs for OTLP errors

**Fix**:
```bash
# Restart Jaeger
docker-compose restart jaeger

# Check API environment
docker exec summit-api env | grep JAEGER
```

#### Issue: Logs not appearing in Loki

**Check**:
1. Is Promtail running? `docker-compose ps promtail`
2. Is Loki receiving logs? `curl http://localhost:3100/ready`
3. Check Promtail logs: `docker-compose logs promtail`

**Fix**:
```bash
# Restart log stack
docker-compose restart loki promtail

# Check Promtail config
docker exec summit-promtail cat /etc/promtail/config.yaml
```

#### Issue: Alerts not firing

**Check**:
1. Is Prometheus evaluating rules? Go to http://localhost:9090/rules
2. Is AlertManager configured? `curl http://localhost:9093/api/v2/status`
3. Check alert expression in Prometheus

**Fix**:
```bash
# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload

# Restart AlertManager
docker-compose restart alertmanager
```

### Debugging Queries

```promql
# Check if metrics are being scraped
up{job="summit-api"}

# Check scrape errors
prometheus_target_scrapes_sample_out_of_order_total

# Check rule evaluation errors
prometheus_rule_evaluation_failures_total
```

### Performance Impact

Observability overhead:

| Component | CPU | Memory | Network |
|-----------|-----|--------|---------|
| OpenTelemetry | <2% | ~50MB | ~100KB/s |
| Pino logging | <1% | ~20MB | ~50KB/s |
| Prometheus scrape | <1% | N/A | ~10KB/s |

**Total overhead**: ~3-5% CPU, ~100MB memory

To reduce:
- Lower trace sampling rate (set `OTEL_SAMPLE_RATE=0.1`)
- Increase scrape interval (15s → 60s)
- Reduce log level in production (`LOG_LEVEL=warn`)

## Best Practices

### Observability Best Practices

1. **Use Structured Logging**
   ```typescript
   // ✅ Good
   logger.info({ userId, orderId, amount }, 'Order placed');

   // ❌ Bad
   logger.info(`User ${userId} placed order ${orderId} for ${amount}`);
   ```

2. **Add Context to Spans**
   ```typescript
   otelService.addSpanAttributes({
     'user.id': userId,
     'order.total': orderTotal,
     'payment.method': paymentMethod,
   });
   ```

3. **Use Appropriate Log Levels**
   - Don't log at `debug` in production
   - Don't log sensitive data (passwords, tokens)
   - Use `warn` for retryable errors
   - Use `error` for unrecoverable errors

4. **Monitor What Matters**
   - Focus on Golden Signals (latency, traffic, errors, saturation)
   - Monitor business metrics (orders, signups, revenue)
   - Track SLOs, not just uptime

5. **Alert on Symptoms, Not Causes**
   ```yaml
   # ✅ Good: Alert on user impact
   - alert: HighLatency
     expr: p99_latency > 500ms

   # ❌ Bad: Alert on internal metric
   - alert: HighCPU
     expr: cpu_usage > 80%
   ```

6. **Reduce Alert Noise**
   - Use multi-window alerts
   - Set appropriate thresholds
   - Use inhibition rules
   - Page only for critical issues

7. **Include Runbook Links**
   - Every alert should have a runbook
   - Document common causes and fixes
   - Include commands and queries

### Dashboard Best Practices

1. **Golden Signals First**: Start every dashboard with latency, traffic, errors, saturation
2. **Use Consistent Time Ranges**: Default to "Last 1 hour", allow customization
3. **Add Thresholds**: Show SLO targets as threshold lines
4. **Link Related Dashboards**: Create navigation between dashboards
5. **Use Variables**: Make dashboards reusable with $service, $environment variables

### Runbook Best Practices

See examples:
- [High Latency Runbook](../../RUNBOOKS/observability/high-latency.md)
- [Error Rate Spike Runbook](../../RUNBOOKS/observability/error-rate-spike.md)

Structure:
1. **Overview**: What the alert means
2. **Initial Response**: First 5 minutes
3. **Investigation**: Step-by-step debugging
4. **Common Causes**: Known issues and fixes
5. **Mitigation**: Immediate actions to reduce impact
6. **Escalation**: When and who to escalate to

## Next Steps

1. **Explore Dashboards**: http://localhost:3001
2. **Generate Test Traffic**: See "Quick Start" above
3. **Review SLOs**: `observability/slo/comprehensive-slos.yaml`
4. **Read Runbooks**: `RUNBOOKS/observability/`
5. **Customize Alerts**: `observability/prometheus/alerts/`

## Resources

- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **Prometheus Query Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Grafana Tutorials**: https://grafana.com/tutorials/
- **Google SRE Book**: https://sre.google/sre-book/table-of-contents/
- **Google SRE Workbook**: https://sre.google/workbook/table-of-contents/

---

**Questions or Issues?**
- Platform Team: #platform-team
- On-Call: #summit-incidents
- Documentation: https://docs.summit.dev

**Last Updated**: 2025-11-20
