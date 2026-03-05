import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict

from summit_fusion.eval import leakage_safe_split_and_fit
from summit_fusion.evidence import EvidenceId, stable_json_dumps


def load_jsonl(path: str):
    texts, labels = [], []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            texts.append(data.get("text", ""))
            labels.append(data.get("label", 0))
    return texts, labels

def main():
    parser = argparse.ArgumentParser(description="Summit Fusion Vectorization CLI")
    parser.add_argument("command", choices=["run"], help="Command to run")
    parser.add_argument("--golden", required=True, help="Path to golden dataset JSONL")
    parser.add_argument("--out", required=True, help="Output directory for artifacts")
    parser.add_argument("--allow-network", action="store_true", help="Allow downloading embeddings model")

    args = parser.parse_args()

    if args.command == "run":
        if args.allow_network:
            os.environ["SUMMIT_FUSION_ALLOW_NETWORK"] = "1"
            use_dummy = False
        else:
            use_dummy = True

        print(f"Loading dataset: {args.golden}")
        texts, labels = load_jsonl(args.golden)

        # Calculate dataset hash for determinism check
        with open(args.golden, "rb") as f:
            dataset_bytes = f.read()
        dataset_hash = hashlib.sha256(dataset_bytes).hexdigest()

        print(f"Dataset hash: {dataset_hash}")

        # Run leakage safe evaluation
        pipeline, metrics = leakage_safe_split_and_fit(
            texts, labels,
            test_size=0.2,
            random_state=42,
            use_dummy_embeddings=use_dummy
        )

        print(f"Metrics: {metrics}")

        # Ensure output directory exists
        out_path = Path(args.out)
        out_path.mkdir(parents=True, exist_ok=True)

        # Create artifacts
        report = {
            "dataset_hash": dataset_hash,
            "pipeline": "TF-IDF + TruncatedSVD + Metadata + Embeddings",
            "use_dummy_embeddings": use_dummy,
            "metrics": metrics
        }

        # Canonicalize report to produce stable hashes
        report_str = stable_json_dumps(report)
        evidence_id = EvidenceId.from_dict("FUSION", report)

        # Save metrics.json
        with open(out_path / "metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)

        # Save report.json
        with open(out_path / "report.json", "w") as f:
            json.dump(report, f, indent=2)

        # Save stamp.json (Deterministic artifact timestamp/proof)
        # We don't use real timestamps because CI expects determinism
        stamp = {
            "evidence_id": str(evidence_id),
            "dataset_hash": dataset_hash,
            "commit_sha": os.environ.get("GITHUB_SHA", "unknown-local-sha"),
            "status": "success"
        }
        with open(out_path / "stamp.json", "w") as f:
            json.dump(stamp, f, indent=2)

        print(f"Generated artifacts in {args.out}")
        print(f"Evidence ID: {evidence_id}")

if __name__ == "__main__":
    main()
