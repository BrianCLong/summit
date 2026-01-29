import os
import json
import time
from datetime import datetime
from pathlib import Path
from .config import TTTConfig
from .policies import check_path_write_allowed, check_external_network, check_training_allowed, check_global_kill_switch

def run(config: TTTConfig):
    # Enforce policies
    check_global_kill_switch()
    check_path_write_allowed(config.output_dir)

    if not config.dry_run:
        check_training_allowed()
        # In a real run, we would perform training here

    # Ensure output dir exists
    Path(config.output_dir).mkdir(parents=True, exist_ok=True)

    # Dry run loop simulation
    attempts_summary = []
    metrics = {}

    for i in range(config.max_attempts):
        # Simulate attempt
        attempt_id = f"att-{i}"
        score = 0.5  # Stub
        attempts_summary.append({
            "attempt_id": attempt_id,
            "status": "completed",
            "score": score
        })

    # Metrics
    metrics["avg_score"] = 0.5
    metrics["total_attempts"] = config.max_attempts

    # Write evidence
    write_evidence(config, attempts_summary, metrics)

def write_evidence(config: TTTConfig, attempts_summary, metrics):
    out = Path(config.output_dir)

    # Report
    report = {
        "schema_version": "1.0.0",
        "run_id": config.run_id,
        "narrative": "Dry run execution of TTT Discover loop.",
        "config": {
            "env_id": config.env_id,
            "dry_run": config.dry_run
        },
        "attempts_summary": attempts_summary
    }
    with open(out / "report.json", "w") as f:
        json.dump(report, f, indent=2)

    # Metrics
    metrics_data = {
        "schema_version": "1.0.0",
        "run_id": config.run_id,
        "metrics": metrics
    }
    with open(out / "metrics.json", "w") as f:
        json.dump(metrics_data, f, indent=2)

    # Stamp
    stamp = {
        "schema_version": "1.0.0",
        "run_id": config.run_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "duration_ms": 100.0 # Stub
    }
    with open(out / "stamp.json", "w") as f:
        json.dump(stamp, f, indent=2)
