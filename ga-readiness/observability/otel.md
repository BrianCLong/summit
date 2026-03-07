# OpenTelemetry Standard

**Collector:** OTEL Collector (Gateway Mode)
**Protocol:** OTLP/gRPC
**Sampling:** 10% (Head-based), 100% for Errors.

## Signals

### Traces

- **Attributes:** `tenant.id`, `service.name`, `user.id` (hashed), `http.method`.
- **Propagators:** W3C Trace Context (Baggage).
- **Spans:** API Request -> Auth Middleware -> Service Logic -> DB Query.

### Metrics

- **RED Method:** Rate, Errors, Duration.
- **Business:** `jobs.ingested`, `queries.executed`, `tokens.consumed`.
- **Infrastructure:** CPU, Memory, Disk I/O, Network.

### Logs

- **Format:** JSON (Structured).
- **Levels:** INFO (Audit), WARN (Degraded), ERROR (Failure).
- **Correlation:** `trace_id` and `span_id` injected into all logs.

## Exporters

- **Production:** Prometheus (Metrics), Jaeger/Tempo (Traces), Loki/ELK (Logs).
