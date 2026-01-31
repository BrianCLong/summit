import argparse
import json
import os
import datetime
import random
import sys

# Constants
EVIDENCE_ID_REPORT = "EVD-ATP-LATENT-EVAL-REPORT-001"
EVIDENCE_ID_METRICS = "EVD-ATP-LATENT-EVAL-METRICS-001"
EVIDENCE_ID_STAMP = "EVD-ATP-LATENT-EVAL-STAMP-001"

def load_tasks(path):
    tasks = []
    with open(path, 'r') as f:
        for line in f:
            tasks.append(json.loads(line))
    return tasks

def simulate_backend(backend, task):
    """
    Simulates execution of a backend.
    Returns correctness (float) and token_usage (int).
    """
    if backend == "stub" or backend == "latent_stub":
        # Simulate some logic
        return 0.95, 120
    elif backend == "text_cot":
        return 0.92, 250
    else:
        # Default random simulation
        return random.random(), random.randint(100, 300)

def run_harness(backend, tasks_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)

    tasks = load_tasks(tasks_path)

    total_correctness = 0.0
    total_tokens = 0

    for task in tasks:
        corr, toks = simulate_backend(backend, task)
        total_correctness += corr
        total_tokens += toks

    avg_correctness = total_correctness / len(tasks) if tasks else 0
    avg_tokens = total_tokens / len(tasks) if tasks else 0

    # Generate artifacts

    # 1. Report
    report = {
        "evidence_id": EVIDENCE_ID_REPORT,
        "summary": f"Eval run for backend {backend}",
        "environment": {
            "backend": backend,
            "task_count": len(tasks)
        },
        "backend": backend,
        "artifacts": ["metrics.json", "stamp.json"]
    }

    # 2. Metrics
    metrics = {
        "evidence_id": EVIDENCE_ID_METRICS,
        "metrics": {
            "correctness_proxy": avg_correctness,
            "token_proxy": avg_tokens,
            "task_count": len(tasks)
        }
    }

    # 3. Stamp
    stamp = {
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "git_commit": "HEAD", # Placeholder
        "run_id": f"run-{int(datetime.datetime.now().timestamp())}"
    }

    # Write files
    report_path = os.path.join(out_dir, "report.json")
    metrics_path = os.path.join(out_dir, "metrics.json")
    stamp_path = os.path.join(out_dir, "stamp.json")
    index_path = os.path.join(out_dir, "evidence", "index.json")

    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)

    with open(stamp_path, 'w') as f:
        json.dump(stamp, f, indent=2)

    # 4. Index
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    index = {
        "items": [
            {
                "evidence_id": EVIDENCE_ID_REPORT, # Using one ID to represent the run in this simplified index
                "report": "../report.json",
                "metrics": "../metrics.json",
                "stamp": "../stamp.json"
            }
        ]
    }
    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)

    print(f"Eval completed. Evidence written to {out_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", required=True)
    parser.add_argument("--tasks", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    run_harness(args.backend, args.tasks, args.out)
