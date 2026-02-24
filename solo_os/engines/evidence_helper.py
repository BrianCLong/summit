import json
from pathlib import Path
from datetime import datetime, timezone
import os

def write_engine_evidence(engine_name: str, run_id: str, summary: dict, metrics: dict):
    base_path = Path("solo_os/evidence/runs") / engine_name / run_id
    base_path.mkdir(parents=True, exist_ok=True)

    evidence_id = f"EVD-ENTRE-502318-ENG-{engine_name.upper()[:3]}-{run_id}"

    report = {
        "evidence_id": evidence_id,
        "summary": summary,
        "environment": {"engine": engine_name},
        "backend": "solo_os",
        "artifacts": []
    }

    metrics_data = {
        "evidence_id": evidence_id,
        "metrics": metrics
    }

    stamp = {
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "git_commit": os.environ.get("GIT_COMMIT", "unknown"),
        "run_id": run_id
    }

    with open(base_path / "report.json", "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)
    with open(base_path / "metrics.json", "w") as f:
        json.dump(metrics_data, f, indent=2, sort_keys=True)
    with open(base_path / "stamp.json", "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    return str(base_path)
