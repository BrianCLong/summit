import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

from evaluator import TemporalEvaluator

ROOT = Path(__file__).resolve().parents[2]
FIXTURES_PATH = ROOT / "evals" / "fixtures" / "temporal-reasoning" / "fixtures.jsonl"
EVIDENCE_DIR = ROOT / "evidence" / "runs" / "temporal-reasoning"
EVIDENCE_ID = "EVD-TEMPORAL-REASONING-EVAL-001"

def run_eval():
    evaluator = TemporalEvaluator()
    results = []

    if not FIXTURES_PATH.exists():
        print(f"Error: Fixtures file not found at {FIXTURES_PATH}")
        sys.exit(1)

    with open(FIXTURES_PATH, "r") as f:
        for line in f:
            if not line.strip():
                continue
            fixture = json.loads(line)
            result = evaluator.evaluate(fixture)
            result["fixture_type"] = fixture["metadata"]["type"]
            results.append(result)

    total = len(results)
    passed = sum(1 for r in results if r["score"] == 1.0)

    # Recency bias detection logic
    recency_bias_checks = [r for r in results if r["fixture_type"] == "recency_bias"]
    recency_bias_count = sum(1 for r in recency_bias_checks if r.get("is_recency_bias", False))
    recency_bias_rate = recency_bias_count / len(recency_bias_checks) if recency_bias_checks else 0.0

    # Temporal accuracy score
    temporal_accuracy_score = passed / total if total > 0 else 0.0

    metrics = {
        "temporal_accuracy_score": temporal_accuracy_score,
        "recency_bias_rate": recency_bias_rate,
        "total_fixtures": total,
        "passed_fixtures": passed
    }

    findings = {
        "results": results,
        "summary": {
            "temporal_accuracy_score": temporal_accuracy_score,
            "recency_bias_rate": recency_bias_rate,
            "total": total,
            "passed": passed
        }
    }

    report = {
        "evidence_id": EVIDENCE_ID,
        "module": "temporal_reasoning",
        "subject": {
            "type": "eval",
            "name": "temporal-reasoning-harness"
        },
        "result": "pass" if temporal_accuracy_score > 0.5 else "fail", # Simple threshold
        "findings": findings,
        "artifacts": [
            {"kind": "metrics", "path": "metrics.json"},
            {"kind": "stamp", "path": "stamp.json"}
        ]
    }

    stamp = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "run_id": "temporal-reasoning-run"
    }

    # Save artifacts
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    with open(EVIDENCE_DIR / "report.json", "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)
    with open(EVIDENCE_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)
    with open(EVIDENCE_DIR / "stamp.json", "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    # Update evidence/index.json if it exists
    index_path = ROOT / "evidence" / "index.json"
    if index_path.exists():
        try:
            with open(index_path, "r") as f:
                index_data = json.load(f)

            items = index_data.get("items", [])
            existing = next((item for item in items if item["evidence_id"] == EVIDENCE_ID), None)

            rel_dir = "evidence/runs/temporal-reasoning"
            new_files = [
                f"{rel_dir}/report.json",
                f"{rel_dir}/metrics.json",
                f"{rel_dir}/stamp.json"
            ]

            if existing:
                existing["files"] = sorted(list(set(existing["files"] + new_files)))
            else:
                items.append({
                    "evidence_id": EVIDENCE_ID,
                    "files": sorted(new_files)
                })
            index_data["items"] = items
            with open(index_path, "w") as f:
                json.dump(index_data, f, indent=2, sort_keys=True)
        except Exception as e:
            print(f"Warning: could not update index: {e}")

    print(f"Evaluation complete. Score: {temporal_accuracy_score}, Recency Bias Rate: {recency_bias_rate}")
    print(f"Artifacts saved to {EVIDENCE_DIR}")

if __name__ == "__main__":
    run_eval()
