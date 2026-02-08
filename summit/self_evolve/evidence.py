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
        # Deterministic: sort keys, indent 2, REDACTED
        redacted_data = redact_dict(data)
        # Ensure no timestamps in evidence.json
        filepath = self.output_dir / "evidence.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "evidence_id": evidence_id,
                "data": redacted_data
            }, f, sort_keys=True, indent=2)

    def write_metrics(self, evidence_id: str, metrics: Dict[str, Any]):
        # Ensure no timestamps in metrics.json
        filepath = self.output_dir / "metrics.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "evidence_id": evidence_id,
                "metrics": metrics
            }, f, sort_keys=True, indent=2)

    def write_stamp(self, evidence_id: str, timestamp: str):
        # Timestamps ONLY allowed in stamp.json
        filepath = self.output_dir / "stamp.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "evidence_id": evidence_id,
                "generated_at": timestamp
            }, f, sort_keys=True, indent=2)

    def write_index(self, evidence_id: str):
        # Follow the pattern expected by tools/evidence_validate.py
        index = {
            "version": "1.0.0",
            "items": {
                evidence_id: {
                    "artifacts": [
                        str(self.output_dir / "evidence.json"),
                        str(self.output_dir / "metrics.json"),
                        str(self.output_dir / "stamp.json")
                    ]
                }
            }
        }
        # tools/evidence_validate.py looks for evidence/index.json usually,
        # but we might write one per run or update a global one.
        # For MWS, we write it in the run directory.
        with open(self.output_dir / "index.json", "w", encoding="utf-8") as f:
            json.dump(index, f, sort_keys=True, indent=2)
