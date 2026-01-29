# Analytics Methodology

Analytics tasks follow a repeatable pipeline:

1. **Feature Extraction** – derive structural and temporal metrics from the graph.
2. **Embeddings** – run node2vec to capture neighborhood context.
3. **Link Prediction** – train logistic regression on combined features and export ONNX models.
4. **Anomaly Scoring** – detect bursts or outliers on activity timelines.
   Results are stored with provenance hashes for later verification.

## Modernization: Turn #5 Standards (2026-01-25)

As of Automation Turn #5, the methodology expands to include:

5. **Claim-Centric Validation** – Evaluate assertions independently of source reputation.
6. **Stateful Collection** – Preserve session state and interaction paths during ingestion.
7. **Contradiction Detection** – Explicitly surface conflicts rather than synthesizing a single narrative.
8. **Blind Spot Logging** – Record what could *not* be observed as a high-fidelity signal.
