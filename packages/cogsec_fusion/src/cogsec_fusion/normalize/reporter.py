import json
import os
import datetime
import hashlib
from typing import Dict, List, Any

class EvidenceReporter:
    def __init__(self, evidence_root: str, evidence_id: str):
        self.evidence_root = evidence_root
        self.evidence_id = evidence_id
        self.report_items: List[Dict[str, Any]] = []
        self.metrics: Dict[str, Any] = {}
        self.evidence_dir = os.path.join(evidence_root, evidence_id)
        os.makedirs(self.evidence_dir, exist_ok=True)

    def add_item(self, item: Dict[str, Any]):
        self.report_items.append(item)

    def set_metric(self, key: str, value: Any):
        self.metrics[key] = value

    def finalize(self, git_sha: str = "unknown"):
        # Write report.json
        report = {
            "evidence_id": self.evidence_id,
            "items": self.report_items
        }
        with open(os.path.join(self.evidence_dir, "report.json"), "w") as f:
            json.dump(report, f, indent=2)

        # Write metrics.json
        with open(os.path.join(self.evidence_dir, "metrics.json"), "w") as f:
            json.dump(self.metrics, f, indent=2)

        # Write stamp.json
        stamp = {
            "timestamp": datetime.datetime.now().isoformat(),
            "git_sha": git_sha,
            "evidence_id": self.evidence_id
        }
        with open(os.path.join(self.evidence_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f, indent=2)

        return self.evidence_dir
