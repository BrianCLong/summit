import hashlib
import json
import os
from typing import Any, Dict


def compute_hash(data: Any) -> str:
    encoded = json.dumps(data, sort_keys=True).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()

class EvidenceGenerator:
    def __init__(self, run_id: str, git_sha: str, config: dict[str, Any]):
        self.run_id = run_id
        self.git_sha = git_sha
        self.config = config
        self.config_hash = compute_hash(config)

    def generate_stamp(self) -> dict[str, Any]:
        return {
            "tool": "graph-validator",
            "version": "1.0.0",
            "git_sha": self.git_sha,
            "run_id": self.run_id,
            "config_hash": self.config_hash,
            "pipeline": "graph-validator"
        }

    def save_artifacts(self, out_dir: str, report: dict[str, Any], metrics: dict[str, Any]):
        os.makedirs(out_dir, exist_ok=True)

        stamp = self.generate_stamp()

        with open(os.path.join(out_dir, "report.json"), "w") as f:
            json.dump(report, f, indent=2, sort_keys=True)

        with open(os.path.join(out_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f, indent=2, sort_keys=True)

        with open(os.path.join(out_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f, indent=2, sort_keys=True)
