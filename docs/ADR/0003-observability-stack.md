# ADR 0003: OpenTelemetry-first observability with Prometheus, Grafana, and Jaeger

- Status: Accepted
- Date: 2025-12-29
- Scope: Observability

## Context

Runtime services emit telemetry through OpenTelemetry, collected by an OTEL collector and exported to Prometheus for metrics and Jaeger for traces, with Grafana dashboards for visualization. These components are part of the default Compose topology referenced by the API and worker services for SLO monitoring.【F:ARCHITECTURE_MAP.generated.yaml†L211-L278】

## Decision

- Keep OTEL instrumentation as the default for API and worker processes; exporters must target the Compose-provisioned collector.
- Standardize Prometheus scrape configs under `observability/prometheus` and Grafana provisioning under `observability/grafana` for dashboards and data sources.【F:ARCHITECTURE_MAP.generated.yaml†L223-L247】
- Retain Jaeger as the tracing backend to visualize request paths and subscription flows.

## Consequences

- Telemetry pipeline health is required for SLO reporting; deployments must ensure collector endpoints are reachable before enabling traffic.
- Any new service must expose OTLP endpoints/metrics compatible with the collector and Prometheus scrape targets.
- Grafana dashboards should be versioned alongside code to detect drift and keep operational readiness verifiable.
