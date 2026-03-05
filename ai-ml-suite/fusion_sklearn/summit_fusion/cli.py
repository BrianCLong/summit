import argparse
import json
import os
import subprocess

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from summit_fusion.embedding import EmbeddingTransformer
from summit_fusion.eval import leakage_safe_split_and_train
from summit_fusion.evidence import EvidenceId, sha256_bytes, stable_json_dumps
from summit_fusion.fusion import build_fusion_feature_union


def load_data(filepath: str) -> pd.DataFrame:
    records = []
    with open(filepath) as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
    return pd.DataFrame(records)

def get_git_sha():
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode('utf-8').strip()
    except Exception:
        return "unknown"

def run_fusion(golden_path: str, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)

    with open(golden_path, 'rb') as f:
        file_bytes = f.read()

    dataset_hash = sha256_bytes(file_bytes)
    df = load_data(golden_path)

    embedding_backend = os.environ.get("SUMMIT_FUSION_EMBEDDING_BACKEND", "dummy")

    union = build_fusion_feature_union(
        embedding_transformer=EmbeddingTransformer(backend=embedding_backend)
    )

    if len(df) < 300:
        n_comp = min(len(df) - 1, 300)
        transformers = union.transformers
        for i, (name, est, cols) in enumerate(transformers):
            if name == 'tfidf':
                from summit_fusion.tfidf import build_tfidf_svd_branch
                transformers[i] = ('tfidf', build_tfidf_svd_branch(n_components=n_comp), cols)

        union.transformers = transformers

    pipeline = Pipeline([
        ("features", union),
        ("clf", LogisticRegression(random_state=42, max_iter=200))
    ])

    fitted_pipeline, metrics, X_test, y_test = leakage_safe_split_and_train(
        pipeline, df, test_size=0.2, random_state=42
    )

    stamp = {
        "git_sha": get_git_sha(),
        "dataset_hash": dataset_hash,
        "backend": embedding_backend
    }

    stamp_str = stable_json_dumps(stamp)
    stamp_id = EvidenceId(namespace="fusion_stamp", digest=sha256_bytes(stamp_str.encode('utf-8')))
    stamp["evidence_id"] = str(stamp_id)

    report = {
        "dataset_size": len(df),
        "test_size": len(X_test),
        "train_size": len(df) - len(X_test),
        "stamp_id": str(stamp_id)
    }

    metrics_str = stable_json_dumps(metrics)
    metrics_id = EvidenceId(namespace="fusion_metrics", digest=sha256_bytes(metrics_str.encode('utf-8')))
    metrics["evidence_id"] = str(metrics_id)

    with open(os.path.join(out_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2)

    with open(os.path.join(out_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    with open(os.path.join(out_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Summit Fusion Baseline Demo")
    parser.add_argument("command", choices=["run"])
    parser.add_argument("--golden", required=True, help="Path to golden dataset jsonl")
    parser.add_argument("--out", required=True, help="Output directory for artifacts")

    args = parser.parse_args()

    if args.command == "run":
        run_fusion(args.golden, args.out)

if __name__ == "__main__":
    main()
