# Feature-Fusion Vectorization Stack

**Standard:** Fusing LLM Embeddings + TF-IDF + Metadata in scikit-learn
**Status:** Alpha
**Owner:** ML Platform Team

## Overview
Based on "How to Combine LLM Embeddings + TF-IDF + Metadata in One Scikit-learn Pipeline", Summit implements a generic feature-fusion vectorization primitive. This allows creating deterministic, testable, and cached fused representations (sparse lexical + dense semantic + structured signals) in a single pipeline.

## Contracts
- **Input Matrix**: JSONL rows with `{id, text, metadata?, label?}`
- **Output Artifacts**:
  - `report.json`: Overall pipeline report with hash signatures.
  - `metrics.json`: Evaluated metrics on test split.
  - `stamp.json`: Deterministic timestamp / proof of execution.

## Non-goals
- No online dataset fetching in CI.
- No GPU requirement.
- No replacing existing Summit retrieval stack (this is an optional baseline utility).

## Integration
To build a fusion pipeline:
```python
from summit_fusion.fusion import build_fusion_pipeline

pipeline = build_fusion_pipeline(use_dummy_embeddings=True)
# pipeline is a FeatureUnion/ColumnTransformer
```
