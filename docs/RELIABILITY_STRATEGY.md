# Reliability Strategy: Tier 0 Journeys & SLOs

This document defines the critical user journeys (Tier 0) for the platform and establishes Service Level Objectives (SLOs) for them.

## Tier 0 User Journeys

Tier 0 journeys are critical paths that must be available for the system to be considered "up".

| Journey               | Description                                   | Owner              | Endpoint / Component     |
| :-------------------- | :-------------------------------------------- | :----------------- | :----------------------- |
| **Login**             | User authentication and token issuance.       | Identity Team      | `POST /auth/login`       |
| **Core Workflow**     | executing complex graph search and analysis.  | Graph Team         | GraphQL `search` query   |
| **Maestro Execution** | Initiating and monitoring orchestration runs. | Orchestration Team | `POST /api/maestro/runs` |
| **Data Ingestion**    | High-volume entity/edge ingestion.            | Data Team          | `POST /api/ingest`       |
| **System Health**     | Liveness and readiness probes.                | SRE Team           | `/health`                |

## Service Level Objectives (SLOs)

We define SLOs based on **Availability** (successful request rate) and **Latency** (p95 duration).

| Journey               | Availability Target | Latency Target (p95) | Window  |
| :-------------------- | :------------------ | :------------------- | :------ |
| **Login**             | 99.95%              | < 500ms              | 30 days |
| **Core Workflow**     | 99.9%               | < 1500ms             | 30 days |
| **Maestro Execution** | 99.9%               | < 800ms              | 30 days |
| **Data Ingestion**    | 99.9%               | < 2000ms             | 30 days |
| **System Health**     | 99.99%              | < 200ms              | 30 days |

## Error Budget Policy

- **Green**: Budget > 20%. Feature development continues as normal.
- **Yellow**: Budget < 20%. Focus shifts to reliability hardening. No non-critical deploys.
- **Red**: Budget Exhausted (< 0%). **Feature Freeze**. All engineering effort directed to restoring reliability.

## Telemetry Implementation

SLIs (Service Level Indicators) are collected via Prometheus histograms and counters defined in `server/src/observability/reliability-metrics.ts`.

- **Latency**: `reliability_request_duration_seconds`
- **Errors**: `reliability_request_errors_total`
- **Queue Depth**: `reliability_queue_depth`
