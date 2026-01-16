# Observability Baseline & Golden Signals

## 1. Golden Signals Strategy
We adhere to the **Four Golden Signals** (Latency, Traffic, Errors, Saturation) for all services.

### Core Signals
| Signal | Metric Name (Prometheus) | Description |
| :--- | :--- | :--- |
| **Latency** | `http_request_duration_seconds` | Time taken to serve a request (Histogram). |
| **Traffic** | `http_requests_total` | Demand placed on the system (Counter). |
| **Errors** | `http_requests_total{status=~"5.."}` | Rate of requests that fail (Counter). |
| **Saturation** | `container_cpu_usage_seconds_total`, `container_memory_usage_bytes` | How "full" the service is. |

## 2. Standard Instrumentation
All services must be instrumented with **OpenTelemetry** or standard Prometheus client libraries.

### Required Configuration
*   **Metrics Path**: `/metrics` (for scraping).
*   **Correlation IDs**: `X-Request-ID` and `Trace-ID` must be propagated.
*   **Logging**: JSON structure, including `trace_id` and `span_id`.

## 3. Architecture
*   **Collector**: OpenTelemetry Collector (`otel-collector.yaml`) aggregates traces and metrics.
*   **Storage**: Prometheus (Metrics), Loki (Logs), Jaeger/Tempo (Traces).
*   **Visualization**: Grafana (`docker-compose.observability.yml`).

## 4. Verification
Run `scripts/ops/validate_observability.ts` to ensure the environment meets this baseline.
