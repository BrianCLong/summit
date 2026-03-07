# Analytics Service & Tradecraft Suite v1

## Overview

The Analytics Service provides a pluggable engine for graph analytics, pattern mining, and anomaly detection. It operates directly against the Graph Core APIs (Neo4j) without direct database coupling, ensuring architectural cleanliness.

## Features

### 1. Link / Path / Community / Centrality

- **Path Finding**:
  - Shortest Path (BFS/Dijkstra)
  - K-Shortest Paths
- **Community Detection**:
  - Label Propagation (LPA) / Connected Components
  - (Future) Louvain/Leiden via GDS
- **Centrality**:
  - Betweenness Centrality (Approximation via Bridges)
  - Eigenvector Centrality (Approximation via Recursive Degree)

### 2. Pattern Miner

- **Temporal Motifs**: Bursts and lulls in transactional activity.
- **Co-travel / Co-presence**: Entities appearing in same events/locations.
- **Financial Structuring**: Smurfing, layering (fan-out/fan-in) topologies.

### 3. Anomaly / Risk Scoring

- **Degree Anomalies**: Egonet size exceeding thresholds.
- **Temporal Spikes**: Volume spikes against historical baseline.
- **Selector Misuse**: Shared selectors (e.g., phone numbers) across multiple identities.

### 4. XAI (Explainable AI)

Every analytic result includes an `xai` payload with:

- `features`: Input parameters used.
- `metrics`: Quantitative scores (e.g., modularity, path count).
- `explanation`: Human-readable text explaining why the result was returned.
- `contributingFactors`: List of key drivers (e.g., "Graph topology", "Recent Volume").

## API Usage

### Endpoints

#### Path Finding

`GET /analytics/path`

Params:

- `sourceId`: ID of start node
- `targetId`: ID of end node
- `algorithm`: `shortest` (default) or `k-paths`
- `k`: Number of paths (for k-paths)
- `maxDepth`: Max hops (default 5)

#### Community Detection

`GET /analytics/community`

Params:

- `algorithm`: `lpa` (default), `louvain`, `leiden`

#### Centrality

`GET /analytics/centrality`

Params:

- `algorithm`: `betweenness`, `eigenvector`
- `limit`: Max nodes to return

#### Pattern Mining

`GET /analytics/patterns`

Params:

- `type`: `temporal-motifs`, `co-travel`, `financial-structuring`

#### Anomaly Detection

`GET /analytics/anomaly`

Params:

- `type`: `degree`, `temporal-spike`, `selector-misuse`

## Benchmarks & Limits

| Algorithm       | Max Nodes | Max Depth | Typical Latency (p95) |
| --------------- | --------- | --------- | --------------------- |
| Shortest Path   | 1M+       | 15        | < 200ms               |
| K-Paths         | 100k      | 6         | < 800ms               |
| Community (LPA) | 500k      | N/A       | 1-2s                  |
| Pattern Mining  | 1M+       | N/A       | 500ms - 2s            |

_Note: Latencies depend on underlying Neo4j instance resources._

## Provenance

All analytic executions are stateless and deterministic based on the graph state at query time. XAI payloads provide the necessary context for analysts to understand the "why" behind every flag.
