# Graphika MRSGS Specification

## Concept

Multi-Resolution Spectral Graph Sketching (MRSGS) detects coordinated campaigns
by computing spectral sketches over actor–content bipartite graphs in
successive windows. Sketches at multiple resolutions are compared to baseline
libraries to surface anomalies and produce replayable campaign artifacts.

## Goals

- Detect coordinated influence behavior with bounded memory.
- Provide human-reviewable explanation subgraphs.
- Produce deterministic, replayable artifacts for audits.

## Data model

- **Nodes**: Actors (accounts), content items (URLs, hashtags, media).
- **Edges**: Interaction events with timestamp, weight, and interaction type.
- **Windows**: Fixed or adaptive time buckets with execution budgets.
- **Baselines**: Reference sketches keyed by domain facets.

## Processing flow

1. Ingest windowed interaction events and build normalized bipartite adjacency
   matrices.
2. Compute spectral sketches at coarse and fine resolutions using streaming
   approximations.
3. Compare sketches to reference baselines; derive anomaly scores per window.
4. Localize subgraphs contributing most to the anomaly score (influence
   budgeted).
5. Emit campaign artifacts with anomaly score, explanation, determinism token,
   and commitments.

## Artifacts

- **Campaign artifact**: anomaly score, localized subgraph, Merkle commitments
  to nodes/edges, determinism token, optional attestation quote.
- **Operational alerts**: threshold-based triggers with budget overruns
  annotated.

## Security & compliance

- Bind artifacts to determinism tokens and policy versions.
- Store artifact digests in transparency logs.
- Redact sensitive identifiers according to disclosure obligations.

## Observability

- Metrics: sketch latency, baseline hit-rate, anomaly score distribution,
  explanation sizes, and budget overruns.
