import json
import os
import hashlib
from typing import Any, Dict

class ObservabilityWriter:
    def __init__(self, evidence_id: str, base_dir: str = "artifacts/observability"):
        self.evidence_id = evidence_id
        self.directory = os.path.join(base_dir, evidence_id)
        os.makedirs(self.directory, exist_ok=True)
        self.trace_file = os.path.join(self.directory, "trace.jsonl")

    def write_event(self, event: Dict[str, Any]):
        """Writes an event to trace.jsonl."""
        # Ensure deterministic key ordering for consistency
        with open(self.trace_file, "a") as f:
            f.write(json.dumps(event, sort_keys=True, default=str) + "\n")

    def write_report(self, report: Dict[str, Any]):
        path = os.path.join(self.directory, "report.json")
        with open(path, "w") as f:
            json.dump(report, f, indent=2, sort_keys=True, default=str)

    def write_stamp(self):
        """Generates stamp.json based on trace hash."""
        if not os.path.exists(self.trace_file):
            return

        with open(self.trace_file, "rb") as f:
            content = f.read()
            h = hashlib.sha256(content).hexdigest()

        stamp = {
            "trace_sha256": h,
            "evidence_id": self.evidence_id,
            "version": "1.0"
        }
        with open(os.path.join(self.directory, "stamp.json"), "w") as f:
            json.dump(stamp, f, indent=2, sort_keys=True)
