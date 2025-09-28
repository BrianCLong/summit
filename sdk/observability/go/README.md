# Observability First Go SDK

This module wraps OpenTelemetry with sane defaults:

- OTLP HTTP exporters for traces and metrics.
- 5% parent-based trace sampling with resource attributes for service name, namespace, and environment.
- Structured JSON logging with optional PII redaction and trace/span correlation fields.

## Quick Start

```go
ctx := context.Background()
shutdown, err := otelshim.Init(ctx, otelshim.DefaultConfig("payments-api"))
if err != nil {
    log.Fatalf("failed to init telemetry: %v", err)
}
defer shutdown(ctx)
```

Metrics are automatically registered for the golden signal catalogue. Use `otel.GetMeterProvider().Meter("payments-api")` for custom instruments that follow the catalogue naming.
