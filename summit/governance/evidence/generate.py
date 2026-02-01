import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
from summit.governance.events.schema import AuditEvent

class EvidenceGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(self, events: List[AuditEvent]) -> str:
        report = {
            "summary": "Audit Report",
            "total_events": len(events),
            "events": [e.model_dump(mode='json') for e in events]
        }
        path = self.output_dir / "report.json"
        with open(path, "w") as f:
            json.dump(report, f, indent=2, sort_keys=True)
        return str(path)

    def generate_metrics(self, events: List[AuditEvent]) -> str:
        tool_calls = len([e for e in events if e.event_type == "ToolExecuted"])
        metrics = {
            "tool_calls": tool_calls,
            "errors": len([e for e in events if e.event_type == "ToolFailed"])
        }
        path = self.output_dir / "metrics.json"
        with open(path, "w") as f:
            json.dump(metrics, f, indent=2, sort_keys=True)
        return str(path)

    def generate_stamp(self, files: List[str]) -> str:
        stamp = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "file_hashes": {}
        }
        for fpath in files:
            with open(fpath, "rb") as f:
                digest = hashlib.sha256(f.read()).hexdigest()
                stamp["file_hashes"][Path(fpath).name] = digest

        path = self.output_dir / "stamp.json"
        with open(path, "w") as f:
            json.dump(stamp, f, indent=2, sort_keys=True)
        return str(path)
