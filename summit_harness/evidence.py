import json
from pathlib import Path
from typing import Any, Dict, List


class EvidenceWriter:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write(self, report: dict[str, Any], metrics: dict[str, Any]):
        # Write report.json
        with open(self.output_dir / "report.json", "w", encoding="utf-8") as f:
            json.dump(report, f, sort_keys=True, indent=2)

        # Write metrics.json
        with open(self.output_dir / "metrics.json", "w", encoding="utf-8") as f:
            json.dump(metrics, f, sort_keys=True, indent=2)

        # Write index.json
        # The key should be the evidence ID, and it should contain a "files" list.
        primary_evd_id = report.get("evidence_id")
        if not primary_evd_id and report.get("evidence_ids"):
            primary_evd_id = report["evidence_ids"][0]

        if not primary_evd_id:
            primary_evd_id = f"EVD-UNKNOWN-{report.get('run_id', 'unknown')}"

        index = {
            "version": "1.0",
            "items": {
                primary_evd_id: {
                    "files": [
                        str(self.output_dir / "report.json"),
                        str(self.output_dir / "metrics.json"),
                        str(self.output_dir / "stamp.json")
                    ]
                }
            }
        }
        with open(self.output_dir / "index.json", "w", encoding="utf-8") as f:
            json.dump(index, f, sort_keys=True, indent=2)

    def write_stamp(self, stamp: dict[str, Any]):
        with open(self.output_dir / "stamp.json", "w", encoding="utf-8") as f:
            json.dump(stamp, f, sort_keys=True, indent=2)
