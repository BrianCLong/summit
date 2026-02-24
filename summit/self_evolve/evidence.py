import json
import os
from typing import Dict, Any

class EvolutionEvidenceWriter:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.base_path = f"artifacts/self-evolving-agents/{run_id}"
        os.makedirs(self.base_path, exist_ok=True)

    def write_evidence(self, evidence_data: Dict[str, Any]):
        # Deterministic: no timestamps, stable field ordering
        with open(os.path.join(self.base_path, "evidence.json"), "w") as f:
            json.dump(evidence_data, f, sort_keys=True, indent=2)

    def write_metrics(self, metrics_data: Dict[str, Any]):
        with open(os.path.join(self.base_path, "metrics.json"), "w") as f:
            json.dump(metrics_data, f, sort_keys=True, indent=2)

    def write_stamp(self, stamp_data: Dict[str, Any]):
        # Stable fields only, no wall-clock
        with open(os.path.join(self.base_path, "stamp.json"), "w") as f:
            json.dump(stamp_data, f, sort_keys=True, indent=2)
