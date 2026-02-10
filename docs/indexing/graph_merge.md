# Graph Merge Indexing

## Overview
This module implements distributed large-scale k-NN graph construction by graph merge, following the approach described in arXiv:2509.11697v1.

## Architecture
- **Contract**: Defines `IndexGraph` and `IndexMeta` structures.
- **Invariants**: Ensures graph quality (connectivity, degree bounds).
- **Merge Algorithms**:
  - Two-way merge (flagged sampling).
  - Multi-way merge (partitioned sampling).
- **Distributed Runner**: Peer-to-peer exchange of supporting graphs.

## Verification
- **Evidence**: All runs produce `report.json`, `metrics.json`, and `stamp.json`.
- **Determinism**: Timestamps isolated to `stamp.json`.
- **Policy**: Cross-tenant merges are denied by default.
