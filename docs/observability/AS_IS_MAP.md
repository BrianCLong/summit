# Summit Observability: As-Is Map & Gap Analysis

**Date:** 2025-10-26
**Status:** Audit Complete

## 1. Current Telemetry Architecture

The current system has a fragmented observability stack with multiple overlapping implementations.

### Backend (Node.js/TypeScript)

- **Primary Monitoring (`server/src/monitoring/`)**:
  - **Metrics**: `metrics.js` uses `prom-client` to define a comprehensive set of custom metrics (HTTP, GraphQL, DB, AI, Business).
  - **Tracing**: Two implementations exist:
    - `opentelemetry.ts`: A modern OpenTelemetry NodeSDK implementation with Jaeger and Prometheus exporters.
    - `tracing.js`: A legacy manual tracing implementation (uuid based spans).
  - **Middleware**: `middleware.js` instrumenting HTTP and GraphQL requests.

- **Telemetry Library (`server/src/lib/telemetry/`)**:
  - `comprehensive-telemetry.ts`: A separate singleton class initializing its own OpenTelemetry MeterProvider and PrometheusExporter (port 9464). This creates a potential port conflict or duplicate exporter issue with `opentelemetry.ts`.
  - `diagnostic-snapshotter.ts`: Captures heap snapshots and config state on thresholds.
  - `anomaly-detector.ts`: Statistical anomaly detection (Z-score) on metrics.

### Frontend (React)

- `apps/web/src/telemetry/otel.ts`: Contains a stub `withSpan` function (console logging only). No real instrumentation.
- `apps/web/src/telemetry/metrics.ts`: Exists (need to verify content, likely RUM stubs).

### Configuration & Infrastructure

- **Dashboards (`observability/dashboards/`)**: JSON definitions exist for:
  - `system-health.json`
  - `comprehensive-telemetry.json`
  - `business_metrics.json`
  - `golden-path-health.json`
- **Alerts (`observability/alert-rules.yml`)**: Extensive Prometheus rules for the "Conductor" (Maestro) service, covering routing, experts, MCP, and cost.

## 2. Gap Analysis

| Category         | Gap                                                                                                                             | Impact                                                                   |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Architecture** | **Duplication**: `monitoring/metrics.js` (prom-client) vs `lib/telemetry` (OTel API).                                           | Confusion on which metrics to use; double instrumentation overhead.      |
| **Architecture** | **Tracing Split**: `tracing.js` vs `opentelemetry.ts`.                                                                          | Inconsistent trace propagation; potential for broken distributed traces. |
| **Frontend**     | **Missing RUM**: No real OTel instrumentation in the client.                                                                    | Blind spot for client-side latency and errors.                           |
| **Journey**      | **Maestro Visibility**: While alerts exist, a dedicated "Maestro Journey" dashboard connecting run events to traces is missing. | Hard to debug complex agentic workflows.                                 |
| **Standards**    | **Log Correlation**: Logging (Pino) needs to strictly ensure `traceId` and `tenantId` are present in all contexts.              | Difficulty correlating logs with traces in multi-tenant flows.           |

## 3. Prioritized Plan

1.  **Unify Backend Telemetry**:
    - Consolidate `server/src/monitoring/` and `server/src/lib/telemetry/` into `server/src/lib/observability/`.
    - Establish `opentelemetry.ts` as the single source of truth for SDK init.
    - Port `metrics.js` to TypeScript (`metrics.ts`) and ensure it works harmoniously with the OTel SDK.
    - Retain `diagnostic-snapshotter` and `anomaly-detector`, refactored to use the new unified system.

2.  **Implement Frontend Observability**:
    - Replace `otel.ts` stub with `@opentelemetry/sdk-trace-web`.
    - Instrument Apollo Client and React Router.

3.  **Standardize SLOs & Dashboards**:
    - Formalize the SLOs from `docs/OBSERVABILITY_SLOs.md` into dashboard queries.
    - Create `observability/dashboards/maestro-journey.json`.

4.  **Runbooks & Incidents**:
    - Verify and link runbooks for the extensive `alert-rules.yml`.

5.  **Multi-Tenancy**:
    - Ensure `tenantId` is a first-class citizen in all metrics and traces (already partially present in `metrics.js`).
