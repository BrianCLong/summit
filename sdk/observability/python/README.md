# Observability First Python SDK

```python
from observability_sdk import TelemetryConfig, bootstrap_telemetry, configure_logging

bootstrap_telemetry(TelemetryConfig(service_name="billing-api"))
configure_logging()
```

This initializes OTLP exporters, parent-based sampling at 5%, and structured JSON logging with trace/span correlation.
