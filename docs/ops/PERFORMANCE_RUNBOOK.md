# Performance Runbook

## Overview
This runbook describes how to run and interpret the k6 performance tests for the IntelGraph platform.

## Test Scripts
The performance tests are located in the `k6/` directory.

### 1. SLO Probe (`k6/slo-probe.js`)
Validates Service Level Objectives (SLOs) against key endpoints (health, ready, metrics, graphql).
- **Target:** General system health and latency.
- **Duration:** ~1 minute.
- **Thresholds:** p95 < 200ms, Error Rate < 1%.

### 2. Golden Path (`k6/golden-path.js`)
Simulates a typical user journey: Load Investigations -> Search Entities -> Fetch Relationships.
- **Target:** Core user workflow performance.
- **Duration:** ~2 minutes.
- **Thresholds:** p95 < 1000ms, Error Rate < 1%.

## Running Locally

### Prerequisites
- [k6](https://k6.io/docs/get-started/installation/) installed.
- The server running locally at `http://localhost:4000` (default).

### Commands

Run SLO Probe:
```bash
k6 run k6/slo-probe.js
```

Run Golden Path:
```bash
k6 run k6/golden-path.js
```

Override Target URL:
```bash
k6 run k6/slo-probe.js --env TARGET=https://staging.example.com
```

Override Options:
```bash
k6 run k6/slo-probe.js --vus 50 --duration 60s
```

## CI/CD Integration
The tests run in the `Performance Baseline (k6)` workflow (`.github/workflows/perf.yml`).
- **Triggers:** Nightly schedule, manual dispatch, and PRs changing `k6/` files.
- **Behavior:** Report-only (non-blocking). Failures in k6 do not fail the workflow build.
- **Artifacts:** `slo-results.json` and raw output logs are uploaded as artifacts.

## Interpretation
Check the k6 summary output for:
- `http_req_duration`: Look at `p(95)`.
- `http_req_failed`: Should be 0.00% or very low.
- `checks`: Should be 100%.

If thresholds are breached, investigate server logs and resource usage.
