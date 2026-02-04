import json
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import subprocess

class EvidenceWriter:
    def __init__(self, evidence_id: str, output_dir: Path):
        self.evidence_id = evidence_id
        self.output_dir = output_dir / evidence_id
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.artifacts = []
        self.inputs = []

    def write_json(self, filename: str, data: Any):
        path = self.output_dir / filename
        with open(path, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)
        self.artifacts.append(filename)

    def write_stamp(self, input_hash: Optional[Dict[str, str]] = None, tool_versions: Optional[Dict[str, str]] = None):
        try:
            commit = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
        except Exception:
            commit = "unknown"

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Schema evidence/schemas/stamp.schema.json properties:
        # evidence_id, timestamp, commit, input_hash_tree, tool_versions
        stamp_data = {
            "evidence_id": self.evidence_id,
            "timestamp": now,
            "commit": commit,
        }

        if input_hash:
            stamp_data["input_hash_tree"] = input_hash
        if tool_versions:
            stamp_data["tool_versions"] = tool_versions

        self.write_json("stamp.json", stamp_data)

    def write_metrics(self, metrics: Dict[str, Any]):
        # Schema evidence/schemas/metrics.schema.json properties:
        # evidence_id, metrics (object)
        data = {
            "evidence_id": self.evidence_id,
            "metrics": metrics
        }
        self.write_json("metrics.json", data)

    def write_report(self, summary: str, inputs: List[str] = None):
        # Schema evidence/schemas/report.schema.json properties:
        # evidence_id, summary, inputs, outputs, notes

        if inputs is None:
            inputs = []

        data = {
            "evidence_id": self.evidence_id,
            "summary": summary,
            "inputs": inputs,
            "outputs": self.artifacts,
            "notes": []
        }
        self.write_json("report.json", data)

    def add_artifact(self, filename: str, content: str):
        path = self.output_dir / filename
        # Ensure parent dir exists
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            f.write(content)
        self.artifacts.append(filename)
