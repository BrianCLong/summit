import json
import os
import hashlib
import datetime
import sys

def deterministic_hash(data):
    # Sort keys for deterministic JSON string
    encoded = json.dumps(data, sort_keys=True).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()

def emit_evidence(results, output_dir="summit/evals/step35flash/evidence_output"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 1. Report (Human readable summary)
    report = {
        "evidence_id": "EVD-step35flash-eval-001",
        "summary": f"Step 3.5 Flash Evaluation Run: {len(results)} cases executed.",
        "artifacts": [res["case"] for res in results]
    }

    # 2. Metrics (Numbers only)
    metrics = {
        "total_cases": len(results),
        "passed_cases": sum(1 for r in results if r.get("status") == "pass"),
        "failed_cases": sum(1 for r in results if r.get("status") == "fail"),
        "total_latency_ms": sum(r.get("latency_ms", 0) for r in results)
    }

    # 3. Stamp (Timestamps only here)
    stamp = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "run_id": deterministic_hash(report), # Use hash of report as deterministic ID base
        "git_sha": "unknown" # In real CI, get from env
    }

    # Write files
    with open(os.path.join(output_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    with open(os.path.join(output_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    # Also write index.json mapping this evidence
    index = {
        "evidence": [
            {
                "id": report["evidence_id"],
                "area": "evals",
                "files": ["report.json", "metrics.json", "stamp.json"]
            }
        ]
    }
    with open(os.path.join(output_dir, "index.json"), "w") as f:
        json.dump(index, f, indent=2, sort_keys=True)

    print(f"Evidence emitted to {output_dir}")

if __name__ == "__main__":
    # Mock results for demonstration/scaffold
    mock_results = [
        {"case": "Smoke Test", "status": "pass", "latency_ms": 120},
        {"case": "Long Context Stress", "status": "pass", "latency_ms": 450},
        {"case": "Budget Overrun Attempt", "status": "pass", "latency_ms": 90, "note": "Failed gracefully as expected"}
    ]
    emit_evidence(mock_results)
