# Observability & Reliability Architecture

## Overview
Summit employs a unified observability stack to ensure system health, performance, and reliability. This document outlines the standards for Logging, Metrics, Tracing, and Reliability patterns.

## 1. Logging
We use `pino` for structured JSON logging.
- **Context**: All logs must include `correlationId`, `tenantId`, and `service`.
- **Redaction**: Sensitive headers and body fields are automatically redacted.
- **Usage**:
  ```typescript
  import logger from '../config/logger';
  logger.info({ userId: '123' }, 'User logged in');
  ```
  *Note: `correlationId` is automatically injected via AsyncLocalStorage.*

## 2. Metrics
We use OpenTelemetry and Prometheus.
- **Golden Signals**: Latency, Traffic, Errors, Saturation.
- **Helper**: Use `summitMetrics` in `server/src/utils/summit-metrics.ts`.
- **Standard Metrics**:
  - `summit_http_requests_total`
  - `summit_http_request_duration_seconds`
  - `summit_maestro_runs_total`
  - `summit_external_api_latency_seconds`

## 3. Tracing
Distributed tracing is powered by OpenTelemetry (OTel).
- **Configuration**: `server/src/otel.ts`.
- **Propagation**: W3C Trace Context headers are propagated automatically.
- **Exporters**: Supports Jaeger (`JAEGER_ENDPOINT`) and OTLP (`OTLP_ENDPOINT`).

## 4. Reliability Patterns
We use a centralized `ResilienceManager` (`server/src/utils/resilience.ts`) to enforce:
- **Timeouts**: Default 30s.
- **Retries**: Exponential backoff with jitter.
- **Circuit Breakers**: Prevent cascading failures.
- **Bulkheads**: Limit concurrency.

### Usage
```typescript
import { resilience } from '../utils/resilience';

await resilience.execute('external-api-call', async () => {
    return await api.call();
}, {
    timeout: 5000,
    retry: { maxAttempts: 3 },
    circuitBreaker: { failureThreshold: 5 }
});
```

## 5. SLOs
Defined in `server/src/config/slos.ts`.
- **API Latency**: 99% < 2s.
- **Maestro Reliability**: 99.5% success rate.
- **Ingestion**: 99% success without DLQ overflow.

## 6. Health Checks
- `/healthz`: Liveness (process up).
- `/readyz`: Readiness (DBs connected).
- `/health`: Detailed status for admins.

## 7. Frontend Telemetry
`apps/web` sends telemetry events to `/api/monitoring/telemetry/events`.
- **Correlation**: `x-correlation-id` header is sent with all requests, using a persistent session ID.
