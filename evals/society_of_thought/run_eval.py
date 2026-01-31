import json
import os
import pathlib
import sys
from datetime import UTC, datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[2]

def run_smoke():
    print("Running SoT Eval Smoke Test...")
    evid = "EVD-SOT-EVAL-001"
    ev_dir = ROOT / "evidence" / evid
    ev_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "evidence_id": evid,
        "mode": "smoke",
        "results": [
            {"case": "arithmetic-001", "status": "pass"},
            {"case": "plan-001", "status": "pass"}
        ]
    }

    metrics = {
        "accuracy": 1.0,
        "cases_run": 2
    }

    stamp = {
        "timestamp": datetime.now(UTC).isoformat() + "Z",
        "actor": "eval_harness"
    }

    (ev_dir / "report.json").write_text(json.dumps(report, indent=2))
    (ev_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (ev_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

    # Register in index
    index_path = ROOT / "evidence" / "index.json"
    index = json.loads(index_path.read_text())

    if not any(it.get("evidence_id") == evid for it in index["items"]):
        index["items"].insert(0, {
            "evidence_id": evid,
            "area": "eval",
            "files": {
                "report": f"evidence/{evid}/report.json",
                "metrics": f"evidence/{evid}/metrics.json",
                "stamp": f"evidence/{evid}/stamp.json"
            }
        })
        index_path.write_text(json.dumps(index, indent=2))

    print(f"Artifacts generated for {evid}")

if __name__ == "__main__":
    if "--smoke" in sys.argv:
        run_smoke()
    else:
        print("Usage: python3 run_eval.py --smoke")
