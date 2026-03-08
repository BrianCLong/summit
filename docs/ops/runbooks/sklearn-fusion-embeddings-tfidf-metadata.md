# Runbook: Sklearn Fusion Pipeline

## How to run the demo CLI
Run the demo with the local deterministic golden dataset (fast, CPU only, no network):
```bash
python -m summit_fusion.cli run --golden GOLDEN/datasets/fusion_demo.jsonl --out artifacts/fusion_demo/
```

## How to enable real embeddings backend locally
To use the `all-MiniLM-L6-v2` `sentence-transformers` backend:
1. Ensure the optional dependency is installed:
   ```bash
   pip install ai-ml-suite/fusion_sklearn[embeddings]
   ```
2. Run with the explicit network opt-in flag:
   ```bash
   python -m summit_fusion.cli run --golden GOLDEN/datasets/fusion_demo.jsonl --out artifacts/fusion_demo/ --allow-network
   ```

## Artifacts and Retention
Artifacts are generated in the `--out` directory:
- `metrics.json`: Accuracy/F1 scores.
- `report.json`: Pipeline structure and dataset hash.
- `stamp.json`: Deterministic execution proof with evidence ID.

Do not commit these artifacts to git unless explicitly updating golden references. They are used internally by the drift detector script.
