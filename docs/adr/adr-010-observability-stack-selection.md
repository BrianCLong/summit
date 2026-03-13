# ADR 010: Observability Stack Selection

## Status
Accepted

## Context
Summit's Service Mesh, Knowledge Graph orchestration engine, and asynchronous worker pools demand a rigorous observability stack. Without standardized telemetry (metrics, traces, and logs), the engineering team lacks the ability to diagnose multi-hop latency bottlenecks, alert on system degradation, enforce Service Level Objectives (SLOs), or isolate tenant-specific errors within the API gateway.

## Decision
We will standardize on an OpenTelemetry (OTel) observability stack that provides metrics and tracing across all microservices.

1.  **OpenTelemetry (OTel):** The API, worker pods, and API Gateway will initialize OpenTelemetry to generate traces and metrics. Collectors will run within the environments to export telemetry data to backend sinks.
2.  **Metrics Backend (Prometheus):** A Prometheus instance will serve as the time-series metric sink. All scraping (pull-based) and exporting (push-based) metric workflows will target Prometheus.
3.  **Tracing Backend (Jaeger):** Distributed tracing spans (such as `feed.batch` from the ingest workers or multi-hop RAG retrievals) will be sent to Jaeger via UDP endpoints (`JAEGER_HOST` / `JAEGER_PORT`), allowing developers to visualize complex dependency trees.
4.  **Visualization and Alerting (Grafana):** Grafana will sit on top of Prometheus and Jaeger to visualize dashboards. We will enforce dashboard Service Level Indicators (SLIs), track throughput trackers, and build alerting rules (with embedded runbook URLs).

## Consequences
- **Positive:** Standardizes instrumentation, allowing all components to use the same OpenTelemetry SDKs (Python, TypeScript, Go).
- **Positive:** Enables end-to-end distributed tracing via Jaeger, drastically reducing debugging time for complex GraphRAG traversals and asynchronous background jobs.
- **Positive:** Strong ecosystem support and seamless integration with existing CI validations for Prometheus alerts and Grafana dashboards.
- **Negative:** Maintaining the stack (Prometheus storage, Jaeger indices, OTel Collectors) adds operational overhead, especially at high throughput.
- **Negative:** Storing full traces for all requests can be cost-prohibitive. We may eventually need to implement tail-based sampling or probabilistic sampling for non-error requests.
