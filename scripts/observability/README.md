# Summit Observability Scripts

Operational monitoring utilities for the Summit GraphRAG pipeline.

## Overview

This directory contains standalone scripts for tracking the performance, health, and complexity of the Summit GraphRAG service. These tools are designed to be callable from production environments without modifying the core service logic.

## Scripts

### 1. Summit Dashboard (`summit_dashboard.ts`)
The primary entry point that aggregates metrics from multiple sources into a structured JSON output.

**Usage:**
```bash
npx tsx scripts/observability/summit_dashboard.ts
```

**Output Example:**
```json
{
  "status": "online",
  "pipeline": {
    "latency_p95_ms": 1250,
    "stages": {
      "retrieval": 450,
      "fusion": 200,
      "generation": 600
    },
    "complexity": {
      "avg_nodes_traversed": 45,
      "avg_docs_searched": 12
    }
  },
  "operational": {
    "throughput_qps": 2.5,
    "error_rate_percent": 0.1,
    "components": [...]
  },
  "timestamp": "2025-02-26T14:30:00Z"
}
```

### 2. Pipeline Probe (`scripts/metrics/pipeline_probe.ts`)
Executes synthetic queries against the GraphRAG `/query` endpoint to extract per-stage latency and graph complexity metrics.

### 3. Metrics Scraper (`scripts/metrics/scraper.ts`)
Scrapes the Prometheus `/metrics` endpoint of the GraphRAG service to calculate throughput and component-level error rates.

## Configuration

Environment variables can be used to configure the target endpoints:

- `GRAPH_RAG_URL`: URL of the GraphRAG query endpoint (default: `http://localhost:8002/query`)
- `METRICS_URL`: URL of the Prometheus metrics endpoint (default: `http://localhost:8002/metrics`)

## Integration

These scripts are designed to be integrated into:
- Datadog/NewRelic custom checks
- Periodic health-check cron jobs
- Deployment verification gates
- Operational dashboards
