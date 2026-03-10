# Runbook: Autonomous Product Surfaces (APS)

## Overview

Summit turns graph intelligence into governed product surfaces.
This subsystem extends Summit from design-aware component generation into a system that can generate full product surfaces, compose them as microfrontends, and evolve them from telemetry + GraphRAG signals.

## SLOs / SLAs (Assumptions)

- **Generated-surface build pipeline availability:** 99.5%
- **Production surface mount success:** 99.9%
- **Telemetry processing freshness:** < 15 min

## Budgets

- **Generation:** graph snapshot → `SurfacePlan`: p95 < 800 ms
- **Generation:** `SurfacePlan` → TSX bundle: p95 < 2.5 s
- **Generation:** host-shell mount: p95 < 1.2 s on CI reference profile
- **Runtime:** initial bundle per surface: < 250 KB gzipped
- **Runtime:** memory overhead per mounted surface: < 60 MB
- **Runtime:** widget render budget: p95 < 120 ms for standard widgets
- **Operational:** auto-PR generation: < 1 PR per surface per 24 h
- **Operational:** Figma sync jobs disabled unless explicitly opted in
- **Operational:** telemetry ingestion overhead: < 3% request latency budget

## Alerts

- `generation success rate < 95%`
- `mount error rate > 2%`
- `surface latency budget violation`
- `PR churn anomaly`
- `drift detector critical schema mismatch`

## Runbooks

### Generation Failure
*   Check MCP endpoint.
*   Verify `graphSnapshotId` matches a known, valid snapshot.
*   Inspect CI logs for `generation failures`.

### Host-shell Registration Failure
*   Ensure the `manifest.json` is correctly signed and deployed to the `artifacts/surfaces/` endpoint.
*   Check route registration logic in host shell (e.g., `client/src/routes/generated/*`).

### Telemetry Schema Mismatch
*   Update telemetry events schema if the surface generates new widget event shapes.

### Drift Detector Alarm
*   Review output of `artifacts/monitoring/aps-drift-report.json`.
*   Ensure `SUMMIT_APS_ENABLED` flag hasn't been bypassed.

### Rollback
*   To rollback a single generated surface: remove registration.
*   To rollback all generated surfaces: toggle feature flag `SUMMIT_APS_ENABLED=false`.
