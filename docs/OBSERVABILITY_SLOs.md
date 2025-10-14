# Observability & SLOs
- **SLOs:** API success rate 99.9%, p95 query latency < 1.5s for depth≤3; job success rate 99%.
- **Metrics:** query counts, node/edge mutations, runbook duration, connector lag.
- **Logs:** structured JSON; trace ids; provenance writes.
- **Tracing:** OpenTelemetry pipeline → exporter; attach entity ids as attributes.