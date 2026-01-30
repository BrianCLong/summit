import json
import os
import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        # Canonical JSON: sorted keys, indent 2
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")

def write_evidence_bundle(
    output_dir: Path,
    evidence_id: str,
    summary: str,
    artifacts: List[str],
    metrics: Dict[str, Any],
    git_commit: str,
) -> None:
    """
    Writes a full evidence bundle (report, metrics, stamp, index entry).
    """

    # 1. report.json
    report_data = {
        "evidence_id": evidence_id,
        "summary": summary,
        "artifacts": artifacts
    }
    write_json(output_dir / "report.json", report_data)

    # 2. metrics.json
    metrics_data = {
        "evidence_id": evidence_id,
        "metrics": metrics
    }
    write_json(output_dir / "metrics.json", metrics_data)

    # 3. stamp.json
    # Timestamp only here.
    now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    stamp_data = {
        "created_at": now_utc,
        "git_commit": git_commit
    }
    write_json(output_dir / "stamp.json", stamp_data)

    # 4. evidence/index.json
    # Creates a mini index for this bundle.
    index_data = {
        "items": [
            {
                "evidence_id": evidence_id,
                "report": "report.json",
                "metrics": "metrics.json",
                "stamp": "stamp.json"
            }
        ]
    }
    write_json(output_dir / "evidence" / "index.json", index_data)
