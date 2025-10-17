# Architecture Overview

Liquid Nano is a lightweight, plugin-driven runtime designed for deterministic execution on constrained edge targets. The pilot implementation ships with a TypeScript core that prioritizes observability, security controls, and composability.

## Runtime Building Blocks

- **LiquidNanoRuntime** – Core orchestrator that manages lifecycle, plugin registration, diagnostics, and metrics snapshotting.
- **Plugins** – Typed handlers implementing the `NanoPlugin` contract. They declare event compatibility via `supportsEvent` and execute logic within the runtime context.
- **Diagnostics Timeline** – Bounded ring buffer that captures event statuses, durations, and plugin attribution for near real-time introspection.
- **Metrics Registry** – In-memory store that collects counters, gauges, and duration aggregates. Easily replaced with an OTLP exporter in production.
- **Configuration Loader** – Strict validator that merges environment overrides with safe defaults.

## Event Flow

1. An integration (for example the HTTP bridge) accepts a payload and constructs a `NanoEvent`.
2. The runtime enforces security guardrails (plugin duplication, concurrency thresholds) before dispatch.
3. Registered plugins receive matching events sequentially. Each plugin may record metrics, emit logs, or escalate errors.
4. Diagnostics capture processing outcomes for observability and downstream dashboards.

## Deployment Topology

```
                       ┌─────────────────────┐
Edge Device Sensors ──►│ Liquid Nano Runtime │──► Upstream message bus / storage
                       └─────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │ Plugins (Telemetry,     │
                    │ Persistence, Transform) │
                    └────────────┬────────────┘
                                 │
                  Observability Connectors (OTLP, Prometheus)
```

### Sample Plugins

| Plugin        | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| Telemetry     | Captures payload statistics and triggers warnings.   |
| Persistence   | Invokes provided callback to persist sanitized data. |
| Transformer   | Applies optional user-defined event mutation.       |

## Extensibility Points

- Override `metrics` or `diagnostics` dependencies when instantiating the runtime.
- Provide additional plugins that handle new `NanoEvent` types.
- Configure telemetry exporters in `config/liquid-nano.config.example.json`.

The pilot bundle demonstrates how the runtime composes with HTTP ingress, but the same primitives support MQTT, gRPC, or streaming integrations.
