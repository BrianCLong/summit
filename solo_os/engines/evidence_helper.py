import json
import os
import hashlib
from datetime import UTC, datetime
from pathlib import Path

def write_engine_evidence(engine_name: str, run_id: str, summary: dict, metrics: dict):
    base_path = Path("solo_os/evidence/runs") / engine_name / run_id
    base_path.mkdir(parents=True, exist_ok=True)

    evidence_id = f"EVD-ENTRE-502318-ENG-{engine_name.upper()[:3]}-{run_id}"
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    # Generate deterministic artifact hashes
    artifacts = []

    # Helper to write and hash
    def write_and_hash(name, data):
        content = json.dumps(data, indent=2, sort_keys=True)
        path = base_path / name
        with open(path, "w") as f:
            f.write(content)
        sha256 = hashlib.sha256(content.encode('utf-8')).hexdigest()
        return {"name": name, "sha256": sha256}

    # Prepare data conforming to summit-evidence.schema.json
    report_data = {
        "evidence_id": evidence_id,
        "timestamp": timestamp,
        "producer": {
            "name": "SFASE",
            "version": "1.0.0",
            "component": engine_name
        },
        "summary": summary,
        "artifacts": [], # Will be populated below
        "metrics": metrics
    }

    metrics_artifact = write_and_hash("metrics.json", {"evidence_id": evidence_id, "metrics": metrics})

    stamp_data = {
        "created_at": timestamp,
        "git_commit": os.environ.get("GIT_COMMIT", "unknown"),
        "run_id": run_id,
        "authority": "SFASE-Evaluator"
    }
    stamp_artifact = write_and_hash("stamp.json", stamp_data)

    report_data["artifacts"] = [metrics_artifact, stamp_artifact]
    report_artifact = write_and_hash("report.json", report_data)

    # Local index.json for internal tracking
    local_index = {
        "item_slug": "ENTRE-502318",
        "evidence": [
            {
                "evidence_id": evidence_id,
                "files": ["report.json", "metrics.json", "stamp.json"]
            }
        ]
    }
    with open(base_path / "index.json", "w") as f:
        json.dump(local_index, f, indent=2, sort_keys=True)

    return str(base_path)
