import json
import os
from pathlib import Path
from typing import Dict, Any, List
from .redact import redact_dict

class EvolutionEvidenceWriter:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write_evidence(self, evidence_id: str, data: Dict[str, Any]):
        redacted_data = redact_dict(data)
        filepath = self.output_dir / "evidence.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "evidence_id": evidence_id,
                "data": redacted_data
            }, f, sort_keys=True, indent=2)
            f.write("\n")

    def write_metrics(self, evidence_id: str, metrics: Dict[str, Any]):
        filepath = self.output_dir / "metrics.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "evidence_id": evidence_id,
                "metrics": metrics
            }, f, sort_keys=True, indent=2)
            f.write("\n")

    def write_stamp(self, evidence_id: str, timestamp: str):
        filepath = self.output_dir / "stamp.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "evidence_id": evidence_id,
                "generated_at": timestamp
            }, f, sort_keys=True, indent=2)
            f.write("\n")

    def write_index(self, evidence_id: str, run_id: str):
        # Use relative paths from repo root
        rel_dir = f"artifacts/self-evolving-agents/{run_id}"
        index = {
            "version": "1.0.0",
            "items": {
                evidence_id: {
                    "files": [
                        f"{rel_dir}/evidence.json",
                        f"{rel_dir}/metrics.json",
                        f"{rel_dir}/stamp.json"
                    ]
                }
            }
        }
        with open(self.output_dir / "index.json", "w", encoding="utf-8") as f:
            json.dump(index, f, sort_keys=True, indent=2)
            f.write("\n")
