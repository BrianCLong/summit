# Observability Backfill & Standards

This document outlines the observability standards, implemented backfills, and best practices for the Summit IntelGraph platform.

## Architecture

We use a unified observability stack:

- **Metrics**: Prometheus (exposed at `/metrics`)
- **Tracing**: OpenTelemetry (integrated with Jaeger/Zipkin compatible exporters)
- **Logging**: Pino (structured logging with correlation IDs)
- **Alerting**: Prometheus Alertmanager compatible rules

### Metrics Unification

Historically, the system had split metrics between `prom-client` (application metrics) and OpenTelemetry SDK (infrastructure metrics on port 9464).

We have unified the critical path by integrating `httpMetricsMiddleware` into the main Express app. This ensures that standard HTTP RED metrics (Rate, Errors, Duration) are available in the main `/metrics` endpoint alongside custom business metrics.

### Key Metrics

| Metric Name                        | Type      | Description                                  |
| ---------------------------------- | --------- | -------------------------------------------- |
| `http_requests_total`              | Counter   | Total HTTP requests by method, route, status |
| `http_request_duration_seconds`    | Histogram | HTTP latency buckets                         |
| `business_user_signups_total`      | Counter   | New user signups                             |
| `business_api_calls_total`         | Counter   | API usage for billing/tracking               |
| `graphql_request_duration_seconds` | Histogram | GraphQL operation latency                    |

## Alerting

Alert definitions are located in `server/src/monitoring/alerts.yaml`.

**Critical Alerts:**

- **ServiceDown**: Instance is not reachable.
- **HighErrorRate**: > 1% of requests are 5xx errors.
- **PotentialBruteForce**: High rate of authentication errors.

**Warning Alerts:**

- **HighLatency**: P95 > 500ms.
- **HighMemoryUsage**: > 85% heap usage.

## Dashboards

Grafana dashboards are stored as JSON in `observability/dashboards/`.

- `summit-service.json`: Main application dashboard covering RED metrics and Business KPIs.

## How to Add New Metrics

1. Define the metric in `server/src/monitoring/metrics.ts`.
   ```typescript
   export const myNewMetric = new client.Counter({
     name: "my_feature_usage_total",
     help: "Total usage of my feature",
     labelNames: ["status"],
   });
   register.registerMetric(myNewMetric);
   ```
2. Import and use it in your service logic.
   ```typescript
   import { myNewMetric } from "../monitoring/metrics.js";
   myNewMetric.inc({ status: "success" });
   ```

## Structured Logging

All logs must use the global `appLogger` (Pino) or context-aware loggers.

```typescript
import { logger } from "./config/logger.js";

logger.info({ tenantId: "123", action: "create_node" }, "Node created successfully");
```

Correlation IDs are automatically injected into `req` and `res` headers (`x-correlation-id`) and included in all log entries generated during a request context.

## Health Checks

- `/health`: Basic liveness (200 OK).
- `/health/detailed`: Deep check of Neo4j, Postgres, Redis connectivity.
- `/health/ready`: Readiness probe for k8s.
