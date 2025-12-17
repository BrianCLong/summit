# As-Is Observability & Reliability Map

## Logging
- **Library**: `pino` (structured logging)
- **Config**: `server/src/config/logger.ts`
- **Current State**:
    - JSON logging enforced.
    - Redaction for sensitive headers/body fields configured.
    - Missing strict `SummitLogContext` schema (correlationId, tenantId, etc. are not mandated).
    - No centralized correlation ID propagation middleware found (checked `server/src/middleware/`).

## Metrics
- **Library**: `prom-client` / `@opentelemetry/api`
- **Config**: `server/src/observability/metrics.ts`, `server/src/lib/telemetry/comprehensive-telemetry.ts`
- **Current State**:
    - `comprehensive-telemetry.ts` sets up a `MeterProvider` and Prometheus exporter on port 9464. It defines some counters/histograms manually.
    - `metrics.ts` re-exports metrics from `monitoring/metrics.js` (legacy?).
    - There is a mix of OTel metrics and `prom-client` metrics.
    - Missing standardized "Golden Signals" wrappers.
    - Redundant implementations of metrics setup.

## Tracing
- **Library**: `@opentelemetry/sdk-node` (implied by file names)
- **Config**: `server/src/otel.ts`
- **Current State**:
    - Explicitly disabled ("no-op") in `server/src/otel.ts`.
    - `startOtel()` logs "Observability (OTel) disabled".
    - No active instrumentation for HTTP/DB/LLM.

## Health Checks
- **Endpoints**: `/health`, `/health/detailed`, `/health/ready`, `/health/live`, `/health/deployment`
- **File**: `server/src/routes/health.ts`
- **Current State**:
    - Good coverage of basic health.
    - `/health/detailed` checks Neo4j, Postgres, Redis.
    - `/health/ready` acts as a readiness probe.
    - Missing standard `/healthz` / `/readyz` naming convention (uses `/health/live` and `/health/ready`).

## Reliability
- **Library**: Custom `resilienceManager` (referenced in `server/src/config/resilientDatabase.js` but needs to be verified if `server/src/middleware/resilience` exists).
- **Current State**:
    - `server/src/config/resilientDatabase.js` implements `ResilientNeo4jConnection`, `ResilientPostgresConnection`, `ResilientRedisConnection`.
    - It uses `resilienceManager` from `../middleware/resilience`.
    - Usage of circuit breakers and bulkheads is present in DB connections.
    - Need to verify if `server/src/middleware/resilience.ts` exists and what it uses (likely `opossum` or custom).

## Gaps & High Risks
1. **Tracing is disabled**: No visibility into distributed flows.
2. **Inconsistent Logging**: `correlationId` and `tenantId` are not consistently logged.
3. **Split Metrics**: Two places defining metrics (`comprehensive-telemetry` vs `metrics.ts`).
4. **Reliability Scope**: Reliability seems focused on DB layer (`resilientDatabase.js`), but need to confirm if it applies to LLM/External APIs.
5. **SLOs**: No explicit SLO definitions found.
