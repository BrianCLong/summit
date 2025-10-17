# Troubleshooting Guide

This guide enumerates common pilot issues and prescribes resolution steps.

## Runtime Fails to Start

**Symptom:** Startup logs include `cannot register plugins while runtime is running`.

- Cause: Hot-reload attempted to register plugins after runtime start.
- Resolution: Restart the process or set `security.allowDynamicPlugins=true` during development.

## Events Dropped

**Symptom:** Diagnostics timeline shows `queued` status without processing.

1. Verify at least one plugin returns `true` from `supportsEvent` for the affected event type.
2. Check configuration: `performance.highWatermark` must exceed the incoming event rate.
3. Confirm plugin registration order via `runtime.listPlugins()` and ensure the target plugin is registered.

## High Latency

- Inspect `plugin.<name>.duration.avg` in Grafana. If values exceed thresholds, consider scaling out horizontally via the provided HPA manifest.
- Enable adaptive throttling by ensuring `performance.adaptiveThrottling` is `true`.
- Run the benchmark script (`npm run --workspace @summit/liquid-nano test:coverage` plus `node scripts/benchmark.mjs`) to profile the workload.

## HTTP Bridge Returns 400

- Invalid JSON body: use `deploy/scripts/send-sample.sh` for a known-good payload.
- Missing correlation ID: runtime autogenerates IDs, but ensure upstream integrations do not strip metadata.

## Kubernetes Pod CrashLoopBackOff

1. Check secrets: `LIQUID_NANO_OTLP_ENDPOINT` and other env vars must be defined.
2. Validate ConfigMap values with `kubectl describe configmap liquid-nano-config`.
3. Inspect logs: `kubectl logs deployment/liquid-nano`.
4. Use `deploy/scripts/debug.sh` to open an ephemeral shell with diagnostic tooling (curl, jq).

## Alert Storms

- Tune Prometheus alert thresholds in `monitoring/alert-rules.yaml`.
- Suppress noise during maintenance using Alertmanager silence templates located in `monitoring/alertmanager-config.yaml`.

Escalate unresolved issues to the Platform Engineering rotation with a link to the relevant diagnostics snapshot (exportable via `runtime.flushDiagnostics()`).
