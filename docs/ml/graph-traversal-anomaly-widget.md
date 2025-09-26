# Graph Traversal Anomaly Detection Widget

This document describes the end-to-end anomaly detection pipeline that now powers graph traversal analysis within Summit.

## Overview

* **Model** – `server/ml/models/graph_anomaly.py` implements an Isolation Forest-based detector that scores nodes returned from Neo4j traversals. The detector emits per-node anomaly scores, feature metrics, and natural language rationales.
* **GraphQL** – `graphTraversalAnomalies` is exposed through the GraphOps schema and resolver stack, wiring the Python detector into the existing Neo4j access layer.
* **Service Adapter** – `GraphAnomalyService` bridges Node.js and Python by streaming traversal data into the detector and parsing the JSON response.
* **UI Widget** – `client/src/components/dashboard/GraphAnomalyWidget.tsx` surfaces anomaly insights inside the analytics tab of the home dashboard.

## Data Flow

1. A user selects an investigation and root entity in the dashboard widget.
2. The widget issues the following GraphQL query:

   ```graphql
   query GraphTraversalAnomalies($entityId: ID!, $investigationId: ID!, $radius: Int, $threshold: Float) {
     graphTraversalAnomalies(
       entityId: $entityId,
       investigationId: $investigationId,
       radius: $radius,
       threshold: $threshold
     ) {
       summary {
         totalNodes
         anomalyCount
         threshold
       }
       nodes {
         id
         score
         isAnomaly
         reason
         metrics
       }
     }
   }
   ```

3. The resolver fetches the subgraph via `GraphOpsService.expandNeighborhood`, then calls `GraphAnomalyService.scoreTraversal`, which streams the traversal to the Python model.
4. The Python detector computes feature vectors (degree, relationship diversity, tag density, neighbor influence), fits Isolation Forest, and returns scored nodes with explanations.
5. The widget renders anomaly badges, metrics chips, and rationales, refreshing on demand.

## Python CLI Usage

The detector can also be exercised via CLI for offline analysis:

```bash
echo '{"nodes": [...], "edges": [...]} ' | python3 server/ml/models/graph_anomaly.py --threshold 0.55
```

It prints JSON containing a `summary`, `nodes`, and optional `metadata` payload to stdout. This is the exact contract used by the Node.js service.

## Testing

`pytest server/ml/tests/test_graph_anomaly.py` validates:

* Feature extraction and scoring on representative graphs
* Heuristic fallback for small traversals
* CLI round-trip serialization with metadata propagation

## Dashboard Experience

The widget appears atop the Analytics tab and provides:

* Root entity input with refresh control
* Chips summarising traversal size, anomaly counts, detector threshold, and contamination ratio
* Detailed cards for each node with anomaly/baseline badges, scores, and explanatory metrics

This instrumentation makes graph anomalies first-class citizens in analyst workflows and ensures consistent server, model, and UI coverage.
