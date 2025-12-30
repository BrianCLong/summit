---
title: "Configuration reference"
summary: "Environment variables and defaults for Summit services."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "platform"
---

# Configuration reference

## Core environment files

- `.env` – top-level settings for Neo4j and OIDC (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `OIDC_ISSUER`).
- `server/.env` – server runtime defaults for databases, Redis, JWT, CORS, rate limits, and telemetry.

## Database

- `DATABASE_URL`: `postgresql://maestro:maestro-dev-secret@localhost:5432/maestro?sslmode=prefer`
- `PG_WRITE_POOL_SIZE`: `24`
- `PG_READ_POOL_SIZE`: `60`
- `PG_QUERY_MAX_RETRIES`: `3`
- `PG_RETRY_BASE_DELAY_MS`: `40`
- `PG_RETRY_MAX_DELAY_MS`: `500`
- `PG_IDLE_TIMEOUT_MS`: `30000`
- `PG_MAX_LIFETIME_MS`: `3600000`

## Neo4j

- `NEO4J_URI`: `bolt://localhost:7687`
- `NEO4J_USER`: `neo4j`
- `NEO4J_PASSWORD`: `neo4j-dev-password`

## Redis

- `REDIS_URL`: `redis://localhost:6379`
- `REDIS_HOST`: `localhost`
- `REDIS_PORT`: `6379`
- `REDIS_PASSWORD`: `redis-dev-secret`

## Security and auth

- `JWT_SECRET`, `JWT_REFRESH_SECRET`: placeholder secrets (`CHANGE_ME_GENERATE_SECURE_SECRET`).
- `JWT_EXPIRES_IN`: `24h`
- `JWT_REFRESH_EXPIRES_IN`: `7d`
- `SESSION_SECRET`: placeholder secret.
- `CORS_ORIGIN` / `ALLOWED_ORIGINS`: `http://localhost:3000,http://localhost:5173,https://app.maestro.dev`

## Feature flags

- `AI_ENABLED`: `false`
- `KAFKA_ENABLED`: `false`
- `MAESTRO_MCP_ENABLED`: `true`
- `MAESTRO_PIPELINES_ENABLED`: `true`

## Rate limits

- `RATE_LIMIT_WINDOW_MS`: `900000`
- `RATE_LIMIT_MAX_REQUESTS`: `1000`
- `AI_RATE_LIMIT_WINDOW_MS`: `900000`
- `AI_RATE_LIMIT_MAX_REQUESTS`: `50`
- `BACKGROUND_RATE_LIMIT_WINDOW_MS`: `60000`
- `BACKGROUND_RATE_LIMIT_MAX_REQUESTS`: `120`

## Telemetry

- `OTEL_SERVICE_NAME`: `intelgraph-server`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`: `http://localhost:4318/v1/traces`
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`: `http://localhost:4318/v1/metrics`
- `OTEL_TRACES_SAMPLER`: `parentbased_traceidratio`
- `OTEL_TRACES_SAMPLER_ARG`: `1.0`

## Next steps

- Validate your files with the [configuration how-to](../how-tos/validate-config.md).
- Check service health using the [runbook operations guide](../operations/README.md).
