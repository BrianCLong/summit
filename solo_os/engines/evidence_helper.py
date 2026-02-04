import json
from pathlib import Path
from datetime import datetime, timezone
import os

def write_engine_evidence(engine_name: str, run_id: str, summary: dict, metrics: dict, audit: dict = None):
    base_path = Path("solo_os/evidence/runs") / engine_name / run_id
    base_path.mkdir(parents=True, exist_ok=True)

    evidence_id = f"EVD-ENTRE-502318-ENG-{engine_name.upper()[:3]}-{run_id}"

    report = {
        "evidence_id": evidence_id,
        "summary": summary,
        "environment": {"engine": engine_name},
        "backend": "solo_os",
        "artifacts": ["report.json", "metrics.json", "stamp.json"]
    }
    if audit:
        report["artifacts"].append("audit.json")

    metrics_data = {
        "evidence_id": evidence_id,
        "metrics": metrics
    }

    stamp = {
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "git_commit": os.environ.get("GIT_COMMIT", "unknown"),
        "run_id": run_id
    }

    # Files to write
    files = {
        "report.json": report,
        "metrics.json": metrics_data,
        "stamp.json": stamp
    }

    for filename, content in files.items():
        with open(base_path / filename, "w") as f:
            json.dump(content, f, indent=2, sort_keys=True)

    # Local index.json
    local_index = {
        "item_slug": "ENTRE-502318",
        "evidence": [
            {
                "evidence_id": evidence_id,
                "files": [
                    str(base_path / "report.json"),
                    str(base_path / "metrics.json"),
                    str(base_path / "stamp.json")
                ]
            }
        ]
    }
    with open(base_path / "index.json", "w") as f:
        json.dump(local_index, f, indent=2, sort_keys=True)

    if audit:
        with open(base_path / "audit.json", "w") as f:
            json.dump(audit, f, indent=2, sort_keys=True)

    return str(base_path)
