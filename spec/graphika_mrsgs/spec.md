# Graphika MRSGS Specification

## Concept

Multi-Resolution Spectral Graph Sketching (MRSGS) detects coordinated campaigns by computing spectral sketches over actor–content bipartite graphs in successive windows. Sketches at multiple resolutions are compared to baseline libraries to surface anomalies and produce replayable campaign artifacts.

## Data model

- **Nodes**: Actors (accounts) and content items (URLs, hashtags, media).
- **Edges**: Interaction events with timestamp, weight, and interaction type.
- **Windows**: Fixed or adaptive time buckets with execution budgets.

## Processing flow

1. Ingest windowed interaction events and build normalized bipartite adjacency matrices.
2. Compute spectral sketches at coarse and fine resolutions using streaming-friendly approximations.
3. Compare sketches to reference baselines; derive anomaly scores per window.
4. Localize subgraphs contributing most to the anomaly score (influence budgeted).
5. Emit campaign artifacts with anomaly score, localized explanation, determinism token, and commitments.

## Outputs

- **Campaign artifact**: anomaly score, localized subgraph, Merkle commitments to nodes/edges, determinism token, optional attestation quote.
- **Operational alerts**: threshold-based triggers with budget overruns annotated.
