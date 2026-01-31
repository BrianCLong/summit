import json
from pathlib import Path
from datetime import datetime, timezone
import hashlib

def write_compliance_evidence(report_data, target_dir="evidence/compliance"):
    """
    Writes a deterministic compliance evidence artifact.
    """
    target_path = Path(target_dir)
    target_path.mkdir(parents=True, exist_ok=True)

    # Use timezone.utc for Python < 3.11 compatibility
    timestamp = datetime.now(timezone.utc).isoformat()

    # Normalize data for deterministic hashing
    canonical_json = json.dumps(report_data, sort_keys=True)
    content_hash = hashlib.sha256(canonical_json.encode()).hexdigest()

    evidence = {
        "meta": {
            "timestamp": timestamp,
            "schema_version": "1.0",
            "actor": "compliance-bot"
        },
        "content_hash": content_hash,
        "data": report_data
    }

    filename = f"EVD-COMPLIANCE-{content_hash[:8]}.json"
    file_path = target_path / filename

    with open(file_path, "w") as f:
        json.dump(evidence, f, indent=2, sort_keys=True)

    return str(file_path)
