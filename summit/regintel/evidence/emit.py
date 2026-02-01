import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

def emit_evidence(
    base_path: str,
    item_slug: str,
    git_sha: str,
    pipeline_name: str,
    run_sequence: str,
    report_data: Dict[str, Any],
    metrics_data: Dict[str, Any],
    stamp_data: Dict[str, Any]
) -> str:
    """
    Emits evidence artifacts to artifacts/evidence/<EID>/

    EID = regintel/<item_slug>/<git_sha>/<pipeline_name>/<run_sequence>

    Returns the evidence_id path string.
    """
    eid = f"regintel/{item_slug}/{git_sha}/{pipeline_name}/{run_sequence}"
    evidence_dir = Path(base_path) / "evidence" / eid

    evidence_dir.mkdir(parents=True, exist_ok=True)

    # Write report.json
    with open(evidence_dir / "report.json", "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, sort_keys=True)
        f.write("\n")

    # Write metrics.json
    with open(evidence_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2, sort_keys=True)
        f.write("\n")

    # Write stamp.json
    # Ensure generated_at/created_at are set if not present
    if "created_at" not in stamp_data:
        stamp_data["created_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    with open(evidence_dir / "stamp.json", "w", encoding="utf-8") as f:
        json.dump(stamp_data, f, indent=2, sort_keys=True)
        f.write("\n")

    return str(eid)
