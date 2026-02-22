# Incremental Graph Updates

## Overview
This system implements a "construct once, incrementally update" strategy for software graphs, inspired by arXiv 2511.05297. It avoids expensive full re-indexing by computing and applying only the changes (deltas) between snapshots.

## Architecture

**Source → Snapshot → Delta → Apply → Re-index (partial) → Evidence**

1.  **Snapshot**: A canonical representation of the graph at a point in time.
2.  **Delta**: A list of atomic operations (`UPSERT`, `TOMBSTONE`) derived from comparing two snapshots or from an event stream.
3.  **Apply**: An idempotent process that updates the Neo4j graph and records the operation.
4.  **Re-index**: (Future) Updates vector and semantic indices only for affected nodes/edges.
5.  **Evidence**: Verifies the correctness and consistency of the update process.

## Delta Operations
*   `UPSERT_NODE`: Create or update a node.
*   `UPSERT_EDGE`: Create or update an edge.
*   `TOMBSTONE_NODE`: Mark a node as deleted (soft delete).
*   `TOMBSTONE_EDGE`: Mark an edge as deleted (soft delete).

## Identity
*   Nodes are identified by a deterministic `uid` (stable semantic identity).
*   Edges are identified by a deterministic `edge_key`.
