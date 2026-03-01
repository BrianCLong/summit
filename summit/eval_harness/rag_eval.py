from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List


def calc_recall_at_k(retrieved: list[str], relevant: list[str], k: int) -> float:
    retrieved_k = retrieved[:k]
    hits = sum(1 for doc in relevant if doc in retrieved_k)
    return hits / len(relevant) if relevant else 0.0

def calc_mrr(retrieved: list[str], relevant: list[str]) -> float:
    for rank, doc in enumerate(retrieved):
        if doc in relevant:
            return 1.0 / (rank + 1)
    return 0.0

def evaluate_answer_faithfulness(answer: str, retrieved_docs: list[str]) -> float:
    """Mock heuristic for answer faithfulness."""
    if not retrieved_docs:
        return 0.0

    # Just a mock heuristic: if words from answer overlap with docs
    answer_words = set(answer.lower().split())
    doc_words = set()
    for doc in retrieved_docs:
        doc_words.update(doc.lower().split())

    overlap = len(answer_words.intersection(doc_words))
    return min(1.0, overlap / max(1, len(answer_words)))

class RagEvalHarness:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)

    def evaluate(self, dataset: list[dict[str, Any]], run_id: str = "default-run") -> dict[str, Any]:
        if os.environ.get("SUMMIT_ENABLE_RAG_EVAL", "0") != "1":
            print("RAG Eval is disabled by feature flag SUMMIT_ENABLE_RAG_EVAL")
            return {}

        self.output_dir.mkdir(parents=True, exist_ok=True)

        metrics_data = {
            "recall@5": 0.0,
            "mrr": 0.0,
            "faithfulness": 0.0,
            "latency_p95_ms": 0.0
        }

        total_recall = 0.0
        total_mrr = 0.0
        total_faithfulness = 0.0
        latencies = []

        for item in dataset:
            retrieved = item.get("retrieved", [])
            relevant = item.get("relevant", [])
            answer = item.get("answer", "")
            latency = item.get("latency_ms", 0.0)

            total_recall += calc_recall_at_k(retrieved, relevant, k=5)
            total_mrr += calc_mrr(retrieved, relevant)
            total_faithfulness += evaluate_answer_faithfulness(answer, retrieved)
            latencies.append(latency)

        n = len(dataset)
        if n > 0:
            metrics_data["recall@5"] = total_recall / n
            metrics_data["mrr"] = total_mrr / n
            metrics_data["faithfulness"] = total_faithfulness / n
            latencies.sort()
            idx = int(0.95 * len(latencies))
            metrics_data["latency_p95_ms"] = latencies[idx] if latencies else 0.0

        # Write deterministic outputs
        metrics = {
            "run_id": run_id,
            "metrics": metrics_data,
            "evidence_id": f"EVID-RAG-{hashlib.sha256(json.dumps(metrics_data, sort_keys=True).encode()).hexdigest()[:8]}",
            "claim_ref": "ITEM:CLAIM-02 | Summit original"
        }

        metrics_path = self.output_dir / "metrics.json"
        metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        # stamp.json without wall-clock timestamps for determinism
        # using a stable string for created_at like "CI_RUN_TIMESTAMP"
        # Since it says "No unstable timestamps in metrics.json", we will put a stable mock date in stamp.json or whatever is deterministic.
        stamp = {
            "run_id": run_id,
            "created_at": "1970-01-01T00:00:00Z", # Deterministic / stable timestamp
            "git_commit": "DETERMINISTIC_COMMIT_SHA",
        }

        stamp_path = self.output_dir / "stamp.json"
        stamp_path.write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        return metrics_data

if __name__ == "__main__":
    import argparse
    import sys
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    with open(args.dataset, encoding="utf-8") as f:
        data = json.load(f)

    harness = RagEvalHarness(args.out_dir)
    harness.evaluate(data)
