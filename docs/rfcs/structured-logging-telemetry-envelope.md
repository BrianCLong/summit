# RFC: Structured Logging Unification & Telemetry Envelope

## Summary

We will unify logging across API services, asynchronous workers, and data pipelines under a single telemetry envelope that is schema-controlled, privacy-aware, and trace-friendly. The design standardizes context propagation (trace IDs, span IDs, request metadata), actor typing, and redaction rules, while updating transports (stdout/OTLP/long-term archive) and dashboards to consume the normalized shape.

## Goals

- Provide a single JSON envelope with required metadata (trace, span, actor, tenancy, request context, environment) for all runtime domains.
- Enforce deterministic redaction for sensitive fields before emission and at collector ingress.
- Support multiple transports (stdout, OTLP, shipper -> Elastic/OpenSearch, archival bucket) without per-service drift.
- Deliver dashboards and alert queries that assume the new schema.
- Offer an incremental adoption path with compatibility shims and validation hooks.

## Non-goals

- Replace existing tracing provider (we continue to rely on OpenTelemetry for spans).
- Change business-domain event payloads; the envelope wraps existing `msg` and `data` fields.

## Current State

- API services use Pino + OpenTelemetry with partial correlation propagation; field names vary (`correlationId`, `traceId`).
- Workers and pipelines emit heterogeneous shapes (sometimes missing actor/tenant, inconsistent `service` naming, ad-hoc redaction).
- Dashboards assume per-service mappings, making cross-domain debugging slow and brittle.

## Proposed Telemetry Envelope

All emissions MUST conform to the following top-level structure (JSON Schema draft-07 excerpt):

```json
{
  "$id": "https://summit.tech/schemas/telemetry-envelope.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "timestamp",
    "severity",
    "service",
    "env",
    "traceId",
    "spanId",
    "actor",
    "request",
    "msg"
  ],
  "properties": {
    "envelopeVersion": { "type": "string", "enum": ["v1"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "severity": { "type": "string", "enum": ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] },
    "service": { "type": "string" },
    "serviceRole": { "type": "string", "enum": ["api", "worker", "pipeline", "cli", "job"] },
    "env": { "type": "string" },
    "traceId": { "type": "string" },
    "spanId": { "type": "string" },
    "parentSpanId": { "type": "string" },
    "correlationId": { "type": "string" },
    "request": {
      "type": "object",
      "required": ["id", "source"],
      "properties": {
        "id": { "type": "string" },
        "method": { "type": "string" },
        "path": { "type": "string" },
        "source": { "type": "string", "enum": ["http", "grpc", "queue", "cron", "cli"] },
        "remoteIp": { "type": "string" },
        "userAgent": { "type": "string" },
        "tenantId": { "type": "string" },
        "region": { "type": "string" }
      }
    },
    "actor": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string", "enum": ["user", "service", "system", "anonymous"] },
        "id": { "type": "string" },
        "orgId": { "type": "string" },
        "scopes": { "type": "array", "items": { "type": "string" } }
      }
    },
    "msg": { "type": "string" },
    "data": { "type": ["object", "array", "null"] },
    "error": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "message": { "type": "string" },
        "stack": { "type": "string" }
      }
    },
    "metrics": { "type": "object" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "sampling": {
      "type": "object",
      "properties": { "decision": { "type": "string" }, "rate": { "type": "number" } }
    },
    "version": { "type": "string" }
  }
}
```

### Emission Examples

- **API request (HTTP):** includes `request.method`, `request.path`, tenant and actor scope.
- **Worker job (queue):** `request.source=queue`, `request.id` = job ID, `serviceRole=worker`.
- **Pipeline step:** `request.source=cron|cli`, `tags` describing stage and dataset.

### Redaction Rules

- Mandatory redaction list: auth headers/tokens, credentials, payment data, PII (email/phone), and any field matching regexes `(?i)(password|secret|token|key|credential|ssn|card|authorization|cookie)`.
- Redaction occurs **before** serialization; collectors apply a second-pass denylist (`headers`, `body`, `query`, `cookies`, `secrets`).
- Add `redactionApplied: true` when any field is scrubbed.

### Context Propagation

- Adopt W3C trace context: map OpenTelemetry `traceId`/`spanId`/`traceFlags` into envelope; `correlationId` stays for backward compatibility.
- HTTP: emit/expect `traceparent` + `baggage` headers; inject `x-correlation-id` as fallback.
- Queues/pipelines: propagate the same keys via message attributes/metadata.

### Transport Strategy

- **Primary:** stdout JSON -> OTEL Collector (OTLP) -> backend (Tempo/Jaeger + Loki/Elastic). Preserve schema via collector processors.
- **Secondary:** Ship to long-term object storage (gzip-parquet) via batch exporter for compliance.
- **Local dev:** colored console pretty-printer wraps the envelope without changing fields.

### Dashboards & Alerting

- Kibana/Grafana folders pre-configured to filter on `service`, `serviceRole`, `tenantId`, `actor.type`, `traceId`, `severity`.
- Golden queries: `severity:ERROR AND serviceRole:api`, `actor.type:user AND request.source:http`, P99 latency by `service` using `metrics.duration_ms`.
- Alerts: error-rate SLO per service, redaction drop-rate, missing trace-context rate.

## Implementation Plan

1. **Schema package**
   - Publish `telemetry-envelope.schema.json` (generated from above) under `docs/schemas` and export TS types (zod/TypeBox) for API/worker/pipeline runtimes.
   - Add AJV validation helper (`assertEnvelope`) and redaction utility (`redactEnvelope`) shared in a lightweight `@intelgraph/telemetry` package.
2. **API adoption**
   - Wrap Pino transport with envelope builder and validator; ensure OTEL context manager injects `traceId`/`spanId`.
   - Enforce `serviceRole=api`, attach `request` + `actor` from auth middleware.
3. **Workers & pipelines**
   - Provide queue middleware to inject `traceparent` + `baggage` into job metadata; wrap loggers to set `serviceRole=worker|pipeline`.
   - Require `request.id` (job ID or batch ID) and stage tags.
4. **Collector & transports**
   - OTEL collector processors: schema validation, denylist redaction, resource attribute mapping (`service.name` -> `service`).
   - S3/Blob archival exporter gated by `TELEMETRY_ARCHIVE_ENABLED`.
5. **Dashboards**
   - Update Kibana saved objects / Grafana dashboards to read from new fields; add drilldown links from logs to traces using `traceId`.
6. **Governance & rollout**
   - Lint rule: block logs missing required envelope fields.
   - Gradual rollout flag `TELEMETRY_ENVELOPE_ENFORCED`; start in shadow mode emitting both old/new for 1 sprint, then cut over.

## Migration & Compatibility

- **Dual-write window:** emit legacy fields (`correlationId`, legacy shapes) for 2 weeks; collectors can project new envelope to old dashboards during transition.
- **Backfill:** rehydrate recent archives via MapReduce job that wraps legacy entries in the new envelope for longitudinal queries.
- **Contracts:** versioned envelope (`envelopeVersion`) allows future additive changes without breaking collectors.

## Risks & Mitigations

- **PII leakage risk**: double-pass redaction + unit tests; centralized denylist easily extendable.
- **Performance overhead**: benchmark envelope builder; sampling support (`sampling.decision/rate`) to reduce volume during incidents.
- **Dashboards drift**: export dashboards as code and test via golden JSON snapshots in CI.

## Validation & Testing

- Schema validation tests (AJV) for required fields and redaction behavior.
- Snapshot tests for envelope builders across API/worker/pipeline contexts.
- Integration test hitting OTEL collector in CI to ensure field mapping and trace-log correlation.
- Performance test to ensure <2% overhead at P99 for logger wrapper.

## Operational Playbook

- Feature flag toggles (`TELEMETRY_ENVELOPE_ENFORCED`, `TELEMETRY_ARCHIVE_ENABLED`).
- Runbook entry for partial outage: degrade to stdout-only, keep envelope; drop `data` for large payloads.
- On-call quick queries: `traceId:${TRACE} | sort @timestamp`, `severity:ERROR AND request.tenantId:${TENANT}`.

## Forward-looking Enhancements

- Auto-classify sensitive payloads using lightweight on-box Tika/PII detectors before redaction.
- Structured-log semantic enrichment (e.g., map `actor.scopes` to `role` labels) via WASM processors in the collector.
- Adaptive sampling that ramps sampling rates based on `severity` + `metrics.duration_ms` percentiles.
