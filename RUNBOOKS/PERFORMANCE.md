# Performance Runbook

## Overview
This document describes how to measure and verify the performance of the Summit platform, specifically targeting the "Golden Path" operations.

## Key Metrics
We care about:
- **API Latency**: GraphQL response time for key queries (Entities, Investigations).
- **Frontend Bundle Size**: Size of initial JS bundles.
- **Interactive Graph Performance**: Rendering speed of the Graph Workbench.

## Tools
- **K6**: For API load testing and benchmarking.
- **Vite Bundle Visualizer**: For frontend bundle analysis.

## Running API Benchmarks

A K6 script is provided to benchmark the Critical User Journey (CUJ).

### Prerequisites
- K6 installed (`brew install k6` or similar).
- Summit stack running locally (`make up`).

### Execution
Run the golden path benchmark:

```bash
k6 run k6/golden-path.js
```

### Interpreting Results
Look for `http_req_duration`.
- **p95 < 500ms** is the target for `entities` search.
- **p95 < 200ms** is the target for `investigations` load.

Example output:
```
http_req_duration..............: avg=45.23ms  min=22.12ms  med=38.41ms  max=189.22ms p(90)=78.12ms  p(95)=102.44ms
```

## Frontend Bundle Analysis

To check for bundle bloat:

```bash
cd client
npx vite-bundle-visualizer
```

- Ensure `cytoscape` and other heavy libraries are not in the main entry chunk.
- Look for chunks larger than 500KB.

## Database Indexes
We use Neo4j Fulltext Indexes for search performance.
- `entity_smart_search`: Indexes `name`, `title`, `description`, `label`, `text`, `summary`, `content`, `props`.

If search is slow, verify the index exists:
```cypher
CALL db.indexes();
```
