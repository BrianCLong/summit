# Observability Signals & Quality Audit

## Overview

This document defines the "Golden Signals" used to monitor the health and stability of the platform. These signals are critical for detecting drift, outages, and performance regressions.

## 1. Golden Signals

These metrics are derived from `server/src/monitoring/metrics.js` and should be the primary indicators for alerting.

### 1.1 Authentication & Security

- **Metric**: `http_requests_total` with `status_code="401"`
- **Description**: Count of unauthorized access attempts.
- **Alert Threshold**:
  - **Warning**: > 100 failures / 5 min (potential brute force)
  - **Critical**: > 1000 failures / 5 min
- **Drift Indicator**: Sudden spike suggests attack or broken client auth token rotation.

### 1.2 Rate Limiting (Traffic Control)

- **Metric**: `rate_limit_exceeded_total`
- **Labels**: `tenant`, `class`
- **Description**: Total number of requests blocked by rate limits.
- **Alert Threshold**:
  - **Warning**: > 10% of total traffic for a tenant
- **Drift Indicator**: Consistent increase indicates policy drift (limits too low) or abuse.

### 1.3 Provenance & Compliance

- **Metric**: `intelgraph_graphrag_query_total` (with `provenanceEnabled="true"`)
- **Description**: Volume of queries with provenance tracking.
- **Drift Indicator**: Drop to zero indicates the provenance system is disabled or failing.

### 1.4 System Health

- **Metric**: `http_request_duration_seconds` (p95)
- **Description**: Latency of HTTP requests.
- **Alert Threshold**:
  - **Warning**: p95 > 500ms
  - **Critical**: p95 > 2s
- **Metric**: `application_errors_total`
- **Description**: Count of unhandled exceptions.

## 2. Signal Quality Audit

### 2.1 Missing Signals (Gap Analysis)

- **Provenance Health**: While we track queries, we lack a direct `provenance_ledger_health` gauge.
- **Policy Decisions**: We track `pbac_decisions_total`, which is good.

### 2.2 Noise Reduction

- **Auth Failures**: 401s on the `/login` endpoint are expected user errors. Alerts should focus on 401s for _valid_ tokens (expired) or unexpected 403s.
- **Rate Limits**: "Burst" logging has been sampled to 1% in `TieredRateLimitMiddleware` to prevent log spam.

## 3. Recommended Dashboards

1.  **Security Overview**:
    - Auth Failures (Rate)
    - Rate Limit Blocks (by Tenant)
    - PBAC Denials
2.  **Compliance Health**:
    - Provenance Ledger Writes/Reads
    - Audit Log Volume
3.  **System Performance**:
    - Latency (p50, p95, p99)
    - Error Rate
    - Saturation (CPU, Memory, DB Connections)

## 4. Verification

Run the drift detection script to verify the runtime state of these controls:

```bash
npx tsx server/scripts/detect_runtime_drift.ts
```
