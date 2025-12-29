---
title: Observability
summary: Monitoring, Logging, Tracing, and Alerting stack.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Observability

Summit provides a production-grade observability stack based on OpenTelemetry, Prometheus, Grafana, Loki, and Jaeger.

## Stack Overview

| Component        | Role                       | Port  |
| :--------------- | :------------------------- | :---- |
| **Grafana**      | Visualization & Dashboards | 3001  |
| **Prometheus**   | Metrics Collection         | 9090  |
| **Loki**         | Log Aggregation            | 3100  |
| **Jaeger**       | Distributed Tracing        | 16686 |
| **AlertManager** | Alert Routing              | 9093  |

## Golden Signals

We monitor the four "Golden Signals" of SRE:

1.  **Latency**: Time to service a request.
2.  **Traffic**: Demand on the system (req/sec).
3.  **Errors**: Rate of failed requests (5xx).
4.  **Saturation**: Fullness of the service (CPU/Memory/Pools).

Dashboards are pre-provisioned in Grafana at `http://localhost:3001`.

## Logging

Structured JSON logging is used throughout via `@intelgraph/logger`.

- **Correlation**: Logs are automatically linked to Traces via `traceId`.
- **Levels**: `info` (default), `warn`, `error`, `debug` (verbose).

```typescript
logger.info({ userId, action: "search" }, "User performed search");
```

## Tracing

All services are instrumented with OpenTelemetry.

- **Automatic**: HTTP, GraphQL, DB queries.
- **Manual**: Wrap complex logic with `otelService.wrapNeo4jOperation()`.

Access the Jaeger UI at `http://localhost:16686` to visualize waterfalls.

## Alerting

Alerts are based on Multi-Window Burn Rates (Google SRE model).

- **Critical**: Page immediately (Slack #alerts-critical / PagerDuty).
- **Warning**: Notify next business day (Slack #alerts-warning).

### Example Alert (PromQL)

```promql
# High Error Rate (>1%)
sum(rate(http_requests_total{code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) > 0.01
```
