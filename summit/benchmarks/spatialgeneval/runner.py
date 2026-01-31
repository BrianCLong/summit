import os
import json
import datetime
import argparse
from typing import List, Dict, Any
from .io import PromptRecord, QARecord
from .judge.base import DummyJudge

# Feature Flag (env var)
FLAG_NAME = "SPATIALGENEVAL_ENABLED"

# Evidence IDs
EVIDENCE_ID_BENCH = "EVD-SPATIALGENEVAL-BENCH-001"
EVIDENCE_ID_EVAL = "EVD-SPATIALGENEVAL-EVAL-001"

def run_spatialgeneval(input_file: str, out_dir: str, judge_type: str = "dummy"):
    if os.environ.get(FLAG_NAME, "false").lower() != "true":
        raise RuntimeError(f"{FLAG_NAME} is not enabled. Aborting run.")

    os.makedirs(out_dir, exist_ok=True)

    # Load Data
    records = []
    with open(input_file, 'r') as f:
        for line in f:
            records.append(json.loads(line))

    # Setup Judge
    judge = DummyJudge() # Only dummy supported for skeleton

    # Execution Loop
    results = []
    correct_count = 0
    total_count = 0

    for record in records:
        # Determine if it's prompt or QA
        # Simplified: assume input is QARecord-like with image path stub
        if "question_id" in record:
            qa = QARecord.from_dict(record)
            image_path = "stub.png" # Placeholder

            eval_result = judge.evaluate(image_path, record)

            is_correct = eval_result["pred_index"] == qa.answer_index
            if is_correct:
                correct_count += 1
            total_count += 1

            results.append({
                "question_id": qa.question_id,
                "correct": is_correct,
                "details": eval_result
            })

    accuracy = correct_count / total_count if total_count > 0 else 0

    # Generate Evidence

    # Report
    report = {
        "benchmark_id": "spatialgeneval",
        "evidence_id": EVIDENCE_ID_EVAL,
        "run_id": f"run-{int(datetime.datetime.now().timestamp())}",
        "summary": f"SpatialGenEval run with {judge_type}",
        "environment": {
            "judge": judge_type,
            "count": total_count
        },
        "backend": judge_type, # mapping for legacy schema compat
        "artifacts": ["metrics.json", "stamp.json"]
    }

    # Metrics
    metrics = {
        "evidence_id": EVIDENCE_ID_EVAL,
        "metrics": {
            "accuracy": accuracy,
            "total_questions": total_count
        }
    }

    # Stamp
    stamp = {
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "git_commit": "HEAD",
        "run_id": report["run_id"]
    }

    # Write
    with open(os.path.join(out_dir, "report.json"), 'w') as f:
        json.dump(report, f, indent=2)
    with open(os.path.join(out_dir, "metrics.json"), 'w') as f:
        json.dump(metrics, f, indent=2)
    with open(os.path.join(out_dir, "stamp.json"), 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"Run complete. Evidence written to {out_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    run_spatialgeneval(args.input, args.out)
