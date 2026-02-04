import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any

# Ensure we can import from the current directory if needed
sys.path.append(str(Path(__file__).parent.parent.parent))

from benchmarks.spatialgeneval.io import load_prompt_bundle, PromptBundle
from benchmarks.spatialgeneval.judge.base import DummyJudge, JudgeAdapter

def aggregate_scores(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(results)
    if total == 0:
        return {"accuracy": 0.0, "total": 0}

    correct = sum(1 for r in results if r["pred_index"] == r["answer_index"])
    accuracy = correct / total

    # By subdomain
    subdomains = {}
    for r in results:
        sd = r["subdomain"]
        if sd not in subdomains:
            subdomains[sd] = {"correct": 0, "total": 0}
        subdomains[sd]["total"] += 1
        if r["pred_index"] == r["answer_index"]:
            subdomains[sd]["correct"] += 1

    sd_accuracy = {sd: v["correct"] / v["total"] for sd, v in subdomains.items()}

    return {
        "overall_accuracy": accuracy,
        "correct_count": correct,
        "total_count": total,
        "accuracy_by_subdomain": sd_accuracy
    }

def compute_robustness(results1: List[Dict[str, Any]], results2: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Computes agreement between two judges."""
    agreement_count = 0
    total = min(len(results1), len(results2))
    if total == 0:
        return {"two_judge_agreement": 0.0, "total": 0}

    for r1, r2 in zip(results1, results2):
        if r1["pred_index"] == r2["pred_index"]:
            agreement_count += 1

    return {
        "two_judge_agreement": agreement_count / total,
        "total": total
    }

def run_eval(bundle: PromptBundle, images_dir: Path, judge: JudgeAdapter) -> List[Dict[str, Any]]:
    results = []
    for qa in bundle.questions:
        image_path = images_dir / f"{qa.prompt_id}.png"
        if not image_path.exists():
            continue

        output = judge.evaluate(str(image_path), qa.question, qa.choices)

        results.append({
            "question_id": qa.question_id,
            "prompt_id": qa.prompt_id,
            "subdomain": qa.subdomain,
            "pred_index": output.pred_index,
            "answer_index": qa.answer_index,
            "correct": output.pred_index == qa.answer_index,
            "confidence": output.confidence,
            "judge_id": output.judge_id
        })
    return results

def main():
    parser = argparse.ArgumentParser(description="SpatialGenEval Runner")
    parser.add_argument("--images-dir", type=str, required=True, help="Directory containing generated images")
    parser.add_argument("--data-file", type=str, required=True, help="JSONL file with prompts and QA")
    parser.add_argument("--output-dir", type=str, default="evidence/spatialgeneval", help="Output directory for evidence")
    args = parser.parse_args()

    # Load manifest for flags
    manifest_path = Path(__file__).parent / "manifest.json"
    if not manifest_path.exists():
        print(f"Error: manifest.json not found at {manifest_path}")
        sys.exit(1)

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    flags = manifest.get("default_flags", {})
    if not flags.get("SPATIALGENEVAL_ENABLED", False):
        print("SpatialGenEval is disabled. Set SPATIALGENEVAL_ENABLED=true in manifest.json to run.")
        sys.exit(0)

    images_dir = Path(args.images_dir)
    data_file = Path(args.data_file)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    bundle = load_prompt_bundle(data_file)
    judge = DummyJudge()

    results = run_eval(bundle, images_dir, judge)
    metrics_data = aggregate_scores(results)

    if flags.get("SPATIALGENEVAL_MULTI_JUDGE", False):
        # In a real scenario, this would use a second judge.
        # For now, we simulate with the same results.
        robustness = compute_robustness(results, results)
        metrics_data["robustness"] = robustness

    run_id = "default_run"

    report = {
        "benchmark_id": "spatialgeneval",
        "run_id": run_id,
        "artifacts": [
            str(output_dir / "metrics.json"),
            str(output_dir / "stamp.json")
        ]
    }

    metrics_out = {
        "benchmark_id": "spatialgeneval",
        "run_id": run_id,
        "metrics": metrics_data
    }

    stamp = {
        "benchmark_id": "spatialgeneval",
        "run_id": run_id,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    with open(output_dir / "report.json", 'w') as f:
        json.dump(report, f, indent=2)
    with open(output_dir / "metrics.json", 'w') as f:
        json.dump(metrics_out, f, indent=2)
    with open(output_dir / "stamp.json", 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"Results written to {output_dir}")

if __name__ == "__main__":
    main()
