# Graph Performance & Collaboration Scalability Plan

## Overview

This plan addresses the current graph performance bottlenecks: force-directed "hairball" breakdowns at scale, Neo4j super-node timeouts, and unbounded WebSocket broadcasts. It introduces rendering, data-model, and collaboration changes along with measurable benchmarks to keep IntelGraph responsive for investigations with thousands of entities.

## 1) Hairball Problem — Hierarchical + WebGL LOD Rendering

- **Strategy:** Move heavy rendering to WebGL with level-of-detail (LOD) controls and hierarchical clustering so large investigations stay interactive.
- **Layout pipeline:**
  1. **Server/API:** Return pre-clustered community/group metadata (e.g., Louvain/Leiden clusters or rule-based buckets like `by_country`, `by_org`).
  2. **Client:**
     - Default to **hierarchical layout** (radial/tree per cluster) for >500 nodes, switching to **LOD WebGL** for >1,000 nodes.
     - Maintain two graphs: **overview graph** (clusters as nodes) and **detail graph** (expanded members). Use hover/expand to progressively reveal members.
- **Rendering rules:**
  - Render clusters as super-nodes until the local degree < `clusterThreshold` (e.g., 50) or viewport zoom crosses a density threshold.
  - Cull labels/edges outside the viewport; throttle layout ticks and debounce interactions.
- **Implementation sketch (client):**

```typescript
import * as THREE from "three";
import { createHierarchicalLayout } from "./layout/hierarchical";

export function renderGraph(canvas: HTMLCanvasElement, graph) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 5000);

  const lod = new THREE.LOD();
  const { overviewNodes, edges } = createHierarchicalLayout(graph, { clusterThreshold: 50 });

  overviewNodes.forEach((node) => {
    const mesh = new THREE.Mesh(node.geometry, node.material);
    lod.addLevel(mesh, node.lodDistance);
    scene.add(mesh);
  });

  // Switch to detailed meshes when zoomed-in or nodeCount < 1000
  if (graph.nodes.length <= 1000 || camera.zoom > 2.5) {
    graph.nodes.forEach((node) => scene.add(node.mesh));
  }

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
```

- **Data safeguards:**
  - Cap physics iterations; fallback to static hierarchical placement if GPU is saturated.
  - Use worker-based layout computation to avoid blocking the UI thread.
  - Persist viewport/cluster expansion state to avoid re-layout churn between navigations.

## 2) Neo4j Super-Node Mitigation — Relationship Bucketing

- **Problem:** Nodes with >10k relationships cause scan and memory pressure.
- **Model:** Replace direct high-cardinality relationships with bucketed edges partitioned by time or facet.

```cypher
// Write path
type Bucket { id: ID!, start: datetime, end: datetime, type: STRING }
MATCH (p:Person {id: $id})
MERGE (p)-[:IN_BUCKET {facet: 'knows', range: '2024-Q1'}]->(b:Bucket {id: $bucketId})
MERGE (b)-[:CONTAINS]->(f:Person {id: $friendId});

// Read path for a quarter
MATCH (p:Person {id: $id})-[:IN_BUCKET {facet: 'knows', range: '2024-Q1'}]->(b:Bucket)
MATCH (b)-[:CONTAINS]->(f:Person)
RETURN f LIMIT 200;
```

- **Operational playbook:**
  - Index `Bucket(id)`, `Bucket(range)`, and `:Person(id)`; add composite index on `(facet, range)` for bucket relationships.
  - Enforce a **max bucket size** (e.g., 1,000 edges) and roll over buckets when limits are reached.
  - Add nightly compaction to rebalance buckets and drop cold buckets to lower storage and traversal cost.
  - Expose a resolver flag `useBuckets=true` and feature-flag rollout per tenant.

## 3) Real-Time Collaboration at Scale — Redis Pub/Sub Rooms

- **Problem:** Broadcast-to-all WebSocket pushes overload at ~100 users.
- **Architecture:**
  - Introduce **room-based channels** keyed by investigation/graph ID.
  - Use **Redis Pub/Sub** (or Redis Streams for replayable history) behind the WebSocket gateway; each node subscribes only to rooms it serves.
  - Add presence keys `presence:{roomId}` with TTL heartbeats to bound memory use.
- **Flow:**
  1. Client joins room → gateway subscribes to `rooms:<roomId>`.
  2. Mutations publish to `rooms:<roomId>` with actor metadata and debounced patches.
  3. Optional replay: read recent entries from Redis Streams on reconnect.
- **Safety:** Apply per-room rate limits, payload size caps, and tracing attributes (`roomId`, `tenantId`, `mutationType`).

## 4) Benchmarking & Validation

- **Targets:**
  - **Render (1k nodes):** <2s initial draw, 60 FPS median interactions.
  - **Neo4j queries:** <500ms P95 for bucketed reads; timeout guard at 2s.
  - **Collaboration:** 1,000 concurrent users across shards with <150ms end-to-end fanout.
- **Suggested tests:**
  - **Render:** headless WebGL benchmark that loads synthetic graphs at 500/1,000/5,000 nodes and records first-render time and FPS.
  - **Neo4j:** cypher stress test using the bucketed query path with randomized buckets.
  - **Collab:** load-test with 1k virtual users publishing 1 msg/s into 50 rooms via k6 or Artillery, capturing Redis and gateway CPU.
- **Instrumentation:** Emit metrics `graph.render.initial_ms`, `graph.render.fps`, `neo4j.bucket.read_ms`, `collab.pubsub.latency_ms`, and dashboards with alarms at 80% of thresholds.

## 5) Innovation Track

- **GPU-friendly clustering:** Integrate a WebGPU-based force pass for localized refinement inside expanded clusters while retaining hierarchical layout for the whole graph.
- **Adaptive sampling:** Dynamically downsample low-importance nodes/edges based on centrality and user viewport to keep render cost bounded.
- **Predictive prefetch:** Use recent navigation history to prefetch likely-neighbor clusters into GPU buffers before expansion.
