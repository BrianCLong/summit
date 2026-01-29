import json
import time
from pathlib import Path
from datetime import datetime, timezone

class EvidenceWriter:
    def __init__(self, evidence_dir: Path):
        self.evidence_dir = evidence_dir
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.evidence_dir / "index.json"

    def write_evidence(self, evd_id: str, report: dict, metrics: dict):
        evd_dir = self.evidence_dir / evd_id
        evd_dir.mkdir(exist_ok=True)

        # Write report.json
        (evd_dir / "report.json").write_text(json.dumps(report, indent=2))

        # Write metrics.json
        (evd_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))

        # Write stamp.json
        stamp = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "timestamp": time.time()
        }
        (evd_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

        # Update index.json
        self._update_index(evd_id)

    def _update_index(self, evd_id: str):
        if self.index_file.exists():
            try:
                index_data = json.loads(self.index_file.read_text())
            except json.JSONDecodeError:
                index_data = {"evidence": []}
        else:
            index_data = {"evidence": []}

        # Remove existing entry if present
        if "evidence" not in index_data:
            index_data["evidence"] = []

        index_data["evidence"] = [e for e in index_data["evidence"] if e.get("id") != evd_id]

        # Add new entry
        index_data["evidence"].append({
            "id": evd_id,
            "area": "skills", # Optional, but good practice
            "files": {
                "report": f"{evd_id}/report.json",
                "metrics": f"{evd_id}/metrics.json",
                "stamp": f"{evd_id}/stamp.json"
            }
        })

        self.index_file.write_text(json.dumps(index_data, indent=2))
