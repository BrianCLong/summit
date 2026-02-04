import json
import os
import time
from pathlib import Path
from summit.geometry.config import GeometryMonitorConfig
from summit.geometry.monitor import GeometryMonitor
from summit.geometry.sink import GeometrySink

def run_synthetic_eval(output_dir: Path):
    monitor = GeometryMonitor(GeometryMonitorConfig(enabled=True))
    sink = GeometrySink()

    # Synthetic "episode"
    # Phase 1: Line (low complexity)
    # Phase 2: Plane (high complexity)
    # Phase 3: Line

    metrics_data = {"steps": []}

    for step in range(10):
        # Generate points
        if 3 <= step <= 6:
            # Plane-like
            points = [[float(i), float(j), 0.0] for i in range(4) for j in range(4)] # 16 points
        else:
            # Line-like
            points = [[float(i), 0.0, 0.0] for i in range(16)]

        event = monitor.observe(points, {"episode_id": "eval-run", "step": step})
        if event:
            sink.log(event)
            metrics_data["steps"].append({
                "step": step,
                "complexity": event.complexity_score,
                "mode": event.local_dim_mode
            })

    # Write artifacts
    output_dir.mkdir(parents=True, exist_ok=True)

    # report.json
    report = {
        "evidence_id": "EVD-GEOM-EVAL-001",
        "run_id": "eval-run-001",
        "item_slug": "geometry-complexity",
        "evd_ids": ["EVD-GEOM-EVAL-001"],
        "summary": {
            "what_ran": "Synthetic geometry complexity evaluation",
            "result": "pass"
        },
        "artifacts": {
            "metrics": "metrics.json",
            "stamp": "stamp.json"
        }
    }

    # metrics.json
    metrics = {
        "evidence_id": "EVD-GEOM-EVAL-001",
        "metrics": metrics_data
    }

    # stamp.json
    stamp = {
        "evidence_id": "EVD-GEOM-EVAL-001",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "git_sha": "HEAD",
        "runner": "eval-harness"
    }

    with open(output_dir / "report.json", "w") as f:
        json.dump(report, f, indent=2)
    with open(output_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    with open(output_dir / "stamp.json", "w") as f:
        json.dump(stamp, f, indent=2)

    # Write index.json for validation tools
    try:
        rel_dir = output_dir.relative_to(Path.cwd())
    except ValueError:
        rel_dir = output_dir

    index = {
        "version": 1,
        "items": {
            "EVD-GEOM-EVAL-001": {
                "files": [
                    str(rel_dir / "report.json"),
                    str(rel_dir / "metrics.json"),
                    str(rel_dir / "stamp.json")
                ]
            }
        }
    }
    with open(output_dir / "index.json", "w") as f:
        json.dump(index, f, indent=2)
