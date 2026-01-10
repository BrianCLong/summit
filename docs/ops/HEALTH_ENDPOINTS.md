# Health, Readiness, and Status Endpoints

This guide describes the standardized operational health endpoints exposed by the service.
The endpoints are guarded by the `HEALTH_ENDPOINTS_ENABLED` feature flag (default `false`).
Enable it in environments where the JSON responses are needed for monitoring or probes.

## Endpoints

### `GET /healthz`

Liveness probe returning current process state.

Example response:

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### `GET /readyz`

Shallow readiness probe intended for load balancers. Dependency checks are intentionally
skipped here; deep diagnostics remain available on `/health/ready`.

Example response:

```json
{
  "status": "ready",
  "checks": {
    "database": "skipped",
    "cache": "skipped",
    "messaging": "skipped"
  },
  "message": "Shallow readiness probe; deep checks remain on /health/ready",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### `GET /status`

Service metadata for dashboards and incident triage.

Example response:

```json
{
  "status": "ok",
  "version": "1.2.3",
  "commit": "abc123",
  "startedAt": "2025-01-01T00:00:00.000Z",
  "timestamp": "2025-01-01T00:10:00.000Z",
  "uptime": 600,
  "environment": "production"
}
```

## Configuration

Set `HEALTH_ENDPOINTS_ENABLED=true` to expose the endpoints. When disabled, the routes
return `404` with a `status: "disabled"` payload to avoid leaking operational metadata.

## Operational Usage

- Use `/healthz` for container liveness probes.
- Point load balancers or service meshes to `/readyz` for traffic gating.
- Capture `/status` output in incident tickets to record version and commit context.

## Non-goals / Out of Scope

- Deep dependency verification (use `/health/ready` and `/health/detailed`).
- Prometheus formatting or metric exposure.
- Service discovery registration.
