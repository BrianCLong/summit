# Operational Readiness

This document outlines the operational readiness standards for the IntelGraph platform, including health probes, logging, and incident management.

## Health Probes

We implement standard Kubernetes-compatible health probes:

- **Liveness (`/healthz`)**: Returns 200 OK if the Node.js process is running and the event loop is responsive.
- **Readiness (`/readyz`)**: Returns 200 OK if critical dependencies (Postgres, Neo4j, Redis) are reachable. Returns 503 if any dependency fails or times out (timeout defaults to 1s per service).
- **Version (`/version`)**: Returns build information (Git SHA, Version, Build Time).

### Usage
```bash
curl http://localhost:4000/healthz
curl http://localhost:4000/readyz
curl http://localhost:4000/version
```

## Structured Logging & Correlation IDs

All logs are structured in JSON format (in production/CI) and include a `correlationId` to trace requests across services.

- **Propagation**: The `x-correlation-id` header is accepted from upstream. If missing, a UUID is generated.
- **Response**: The `x-correlation-id` header is returned in the response.
- **Logging**: All logs include `correlationId`, `service`, `env`, and `level`.
- **Pretty Printing**: Set `LOG_PRETTY=true` in development to see human-readable logs.

## Tracing

Minimal OpenTelemetry hooks are in place. If no exporter is configured (`OTEL_EXPORTER_...`), tracing runs in a minimal no-op mode to avoid overhead.

## Incident Evidence Capture

In the event of an incident, use the capture script to gather diagnostic information safely (secrets are redacted).

### Usage
```bash
# From server directory
npx tsx src/scripts/ops/capture_incident_pack.ts
```

This generates `incident-pack.json` containing:
- Service Version & Uptime
- System Metrics (CPU, Memory)
- Redacted Environment Variables
- Snapshot of Health Status (Liveness, Readiness)

### CI Guardrails

Run the operational readiness test suite to verify these controls:
```bash
pnpm test:ops
```
