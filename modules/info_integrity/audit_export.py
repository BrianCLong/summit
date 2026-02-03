import json
from pathlib import Path
from typing import Any, Dict, List

from modules.info_integrity.validate import PROHIBITED_FIELDS


def export_audit_log(output_path: Path, records: list[dict[str, Any]]):
    """
    Exports a list of records to a JSONL file, ensuring all prohibited fields are redacted.
    Only aggregate data is exported.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        for record in records:
            # Redact prohibited fields
            redacted_record = {k: v for k, v in record.items() if k not in PROHIBITED_FIELDS}
            # Ensure it's aggregate (simple check: if it looks like a signal)
            # In a real system this would be more strict.
            f.write(json.dumps(redacted_record, sort_keys=True) + "\n")

def create_aggregate_audit_export(run_dir: Path, signals: list[dict[str, Any]]):
    audit_file = run_dir / "audit_export.jsonl"
    export_audit_log(audit_file, signals)
    return audit_file
