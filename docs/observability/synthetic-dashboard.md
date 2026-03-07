# Synthetic Monitoring Dashboard

This dashboard visualizes the health and performance of the Summit/IntelGraph platform based on synthetic journey execution.

## Overview

- **Health Status**: ✅ Healthy | ⚠️ Degraded | ❌ Critical
- **Last Run**: [Timestamp]
- **Success Rate (24h)**: XX.X%

## Key Metrics

### 1. Journey Latency (p95)

Visualizes the execution time for each step in the synthetic journey.

- **J-001 Login**: Target < 500ms
- **J-002 Upload**: Target < 2000ms
- **J-003 Graph Query**: Target < 300ms
- **J-004 Maestro Run**: Target < 5000ms

[Graph Placeholder: Time Series of Latency by Step]

### 2. Error Rate & Spikes

Tracks failed journey executions over time.

- **Spikes**: Sudden increases in error rate indicate platform instability.
- **Correlations**: Compare with deployment events.

[Graph Placeholder: Error Count per Journey Step]

### 3. Maestro Consistency

Tracks the validity of Maestro run outputs.

- **Empty Results**: % of runs returning empty/invalid artifacts.
- **Failures**: % of runs ending in `failed` status.

[Graph Placeholder: Maestro Success vs Failure Rate]

## Alerts

- **Critical**: Consecutive failures of J-001 (Login) or J-004 (Maestro).
- **Warning**: Latency regression > 50% over baseline.
- **Info**: Single step failure (transient).

## Data Source

- **Source**: `synthetic-results.json` artifacts from GitHub Actions / CI.
- **Ingestion**: Pushed to Prometheus/Grafana via intermediate exporter or directly from CI logs.
