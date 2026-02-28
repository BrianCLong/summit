# Forecasting Embeddings Architecture

Instead of “embeddings as static feature columns,” Summit:
- Converts embeddings → graph-structured event vectors.
- Anchors signals to entities in Neo4j.
- Adds temporal decay weighting.
- Audits improvement via deterministic evidence system.
- Ships feature flag OFF by default.
