# Summit Feature-Fusion Vectorization Stack

Feature-fusion vectorization stack (LLM Embeddings + TF-IDF + Metadata) for Summit.
Implements the architecture described in "How to Combine LLM Embeddings + TF-IDF + Metadata in One Scikit-learn Pipeline".

## Features
- **Deterministic**: Provides stable representations and evidence IDs.
- **Leakage-safe**: Enforces split-before-fit to avoid train/test contamination.
- **Pluggable**: Dummy backend for CI, `sentence-transformers` for real execution.
- **Testable**: Minimal dependencies and mockable network interfaces.

## Install
```bash
# Basic setup
pip install ai-ml-suite/fusion_sklearn

# With embeddings backend
pip install ai-ml-suite/fusion_sklearn[embeddings]
```

## CLI Usage
```bash
python -m summit_fusion.cli run --golden GOLDEN/datasets/fusion_demo.jsonl --out artifacts/fusion_demo/
```
