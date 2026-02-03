import json
from typing import Any, Dict, Iterable, List

from modules.cog_resilience.validate import load_never_log_fields


class AuditExporter:
    def __init__(self):
        self.prohibited_fields = load_never_log_fields()

    def redact_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """
        Returns a new dictionary with prohibited fields removed.
        """
        return {
            k: v for k, v in record.items()
            if k not in self.prohibited_fields
        }

    def export_jsonl(self, records: Iterable[dict[str, Any]], output_path: str):
        """
        Writes redacted records to a JSONL file.
        Ensures determinism with sort_keys=True.
        """
        with open(output_path, 'w') as f:
            for record in records:
                clean_record = self.redact_record(record)
                f.write(json.dumps(clean_record, sort_keys=True) + '\n')

def export_audit_log(records: list[dict[str, Any]], output_path: str):
    """
    Convenience function to export a list of records to an audit log.
    """
    exporter = AuditExporter()
    exporter.export_jsonl(records, output_path)
