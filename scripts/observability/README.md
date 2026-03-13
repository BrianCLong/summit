# Summit Observability Scripts

Operational monitoring utilities for the Summit GraphRAG pipeline.

## Overview

This directory contains standalone scripts for tracking the performance, health, and complexity of the Summit GraphRAG service. These tools are designed to be callable from production environments without modifying the core service logic.

## Scripts

### 1. Summit Dashboard (`summit_dashboard.ts`)
The primary entry point that aggregates metrics from multiple sources into a structured JSON output.

**Usage:**
```bash
# Requires Node.js 22+
node --input-type=module -e "import { generateDashboard } from './scripts/observability/summit_dashboard.ts'; generateDashboard().then(m => console.log(JSON.stringify(m, null, 2)))"
```

**Output Example:**
```json
{
  "status": "online",
  "pipeline": {
    "latency_probe_ms": 1250,
    "stages": {
      "entity_extraction": 450,
      "graph_query": 200,
      "answer_synthesis": 600
    },
    "complexity": {
      "avg_nodes_traversed": 45,
      "avg_docs_searched": 12,
      "avg_depth": 3
    }
  },
  "operational": {
    "counters": [
      { "name": "retrieval", "total": 1000, "errors": 2 }
    ]
  },
  "timestamp": "2025-02-26T14:30:00Z"
}
```

### 2. Pipeline Probe (`scripts/metrics/pipeline_probe.ts`)
Executes synthetic queries against the GraphRAG `/query` endpoint to extract per-stage latency (extraction, query, synthesis) and graph complexity metrics (nodes, docs, depth).

### 3. Metrics Scraper (`scripts/metrics/scraper.ts`)
Scrapes the Prometheus `/metrics` endpoint of the GraphRAG service to report cumulative counters for throughput and error analysis.

## Configuration

Environment variables can be used to configure the target endpoints:

- `GRAPH_RAG_URL`: URL of the GraphRAG query endpoint (default: `http://localhost:8002/query`)
- `METRICS_URL`: URL of the Prometheus metrics endpoint (default: `http://localhost:8002/metrics`)

## Integration

These scripts are designed to be integrated into custom checks and operational dashboards. They handle connection failures gracefully by returning an `offline` status.
