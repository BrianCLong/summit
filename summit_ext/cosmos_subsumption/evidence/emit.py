from __future__ import annotations

import json
import os
import time
from pathlib import Path

# Use a specific evidence directory for this extension to avoid cluttering root if needed,
# but the plan suggests 'evidence/' which usually means root evidence directory.
# We will use 'evidence/cosmos-server' to stay organized.
ROOT = Path("evidence/cosmos-server")

def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def emit(evidence_index: dict, report: dict, metrics: dict) -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    write_json(ROOT / "report.json", report)
    write_json(ROOT / "metrics.json", metrics)
    # timestamps ONLY here
    write_json(ROOT / "stamp.json", {"unix_ms": int(time.time() * 1000)})
    write_json(ROOT / "index.json", evidence_index)

if __name__ == "__main__":
    # stub run
    emit(
        evidence_index={
            "EVD-COSMOS-SERVER-GW-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
        },
        report={"status": "stub", "notes": ["TODO: wire to policy eval"]},
        metrics={"counters": {"policies_evaluated": 0}},
    )
    print(f"Evidence emitted to {ROOT}")
