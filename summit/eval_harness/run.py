from __future__ import annotations
import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from summit.evidence.index import append_item, EvidenceItem

def calculate_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--run-id", required=True) # e.g. EVD-LLMSELECT55DA-EVAL-001
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    out_dir = Path(args.out_dir) / args.run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load dataset
    ds = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                ds.append(json.loads(line))

    # 2. Run Eval (Mock)
    results = []
    metrics_data = {
        "accuracy": 0.0,
        "consistency": 1.0, # Mock
        "p95_latency_ms": 0.0,
        "cost_usd_est": 0.0,
        "refusal_rate": 0.0
    }

    total_latency = 0

    for row in ds:
        t0 = time.perf_counter()
        # Mock Logic:
        # Accuracy: always "answer" matches expected? No, just mock.
        # Guardrails: check expected_behavior.

        actual_output = "Mock Answer"
        refused = False

        if row["case_type"] == "guardrails" or row["case_type"] == "out_of_scope":
            refused = True # Mock success for these
            actual_output = "I cannot answer that."

        dt_ms = (time.perf_counter() - t0) * 1000
        total_latency += dt_ms

        results.append({
            **row,
            "actual": {"text": actual_output, "refused": refused},
            "latency_ms": dt_ms
        })

    # Metrics Calc (Stub)
    metrics_data["p95_latency_ms"] = total_latency / len(ds) if ds else 0
    metrics_data["accuracy"] = 1.0 # Mock perfect score
    metrics_data["refusal_rate"] = 0.5 # Mock

    # 3. Write Artifacts

    # raw_results.json
    raw_path = out_dir / "raw_results.json"
    write_json(raw_path, results)

    # report.json
    report_path = out_dir / "report.json"
    report = {
        "evidence_id": args.run_id,
        "run_id": args.run_id,
        "summary": "LLM Eval Run (Mock)",
        "artifacts": [
            {"path": str(raw_path.resolve().relative_to(Path.cwd())), "sha256": calculate_sha256(raw_path)}
        ]
    }
    write_json(report_path, report)

    # metrics.json
    metrics_path = out_dir / "metrics.json"
    metrics = {
        "run_id": args.run_id,
        "model": "mock-model",
        "metrics": metrics_data
    }
    write_json(metrics_path, metrics)

    # stamp.json (ONLY timestamp source)
    stamp_path = out_dir / "stamp.json"
    stamp = {
        "run_id": args.run_id,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "git_sha": "HEAD" # TODO: get actual SHA?
    }
    write_json(stamp_path, stamp)

    # 4. Update Index
    # We must point to the files relative to repo root

    # The out_dir might be absolute or relative. We should ensure relative to CWD.
    try:
        report_rel = report_path.resolve().relative_to(Path.cwd())
        metrics_rel = metrics_path.resolve().relative_to(Path.cwd())
        stamp_rel = stamp_path.resolve().relative_to(Path.cwd())
    except ValueError:
        # Fallback if out_dir is absolute
        # Assuming run is from repo root
        report_rel = report_path
        metrics_rel = metrics_path
        stamp_rel = stamp_path

    item = EvidenceItem(
        evidence_id=args.run_id,
        paths=[str(report_rel), str(metrics_rel), str(stamp_rel)]
    )
    append_item(Path("evidence/index.json"), item)

    print(f"Eval run {args.run_id} complete.")

if __name__ == "__main__":
    main()
