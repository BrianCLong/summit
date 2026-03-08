import hashlib
import json
from pathlib import Path
from typing import Any, Dict


class ActionLedger:
    def __init__(self, output_dir: str = "evidence/aeip"):
        self.output_dir = Path(output_dir)

    def write_evidence(
        self,
        evidence_id: str,
        report: dict[str, Any],
        metrics: dict[str, Any],
    ) -> dict[str, str]:
        """
        Write deterministic AEIP artifacts.
        """
        # Note: Do not include dynamic timestamps for determinism
        evidence_dir = self.output_dir / evidence_id
        evidence_dir.mkdir(parents=True, exist_ok=True)

        # We assume no raw PII here as we enforce Never-Log policy
        # However, we must strip unstable timestamps for the stamp.

        serialized_report = json.dumps(report, sort_keys=True).encode("utf-8")
        serialized_metrics = json.dumps(metrics, sort_keys=True).encode("utf-8")

        report_hash = hashlib.sha256(serialized_report).hexdigest()
        metrics_hash = hashlib.sha256(serialized_metrics).hexdigest()

        # Generate stamp deterministically
        stamp = {
            "evidence_id": evidence_id,
            "report_hash": report_hash,
            "metrics_hash": metrics_hash,
        }

        report_path = evidence_dir / "report.json"
        metrics_path = evidence_dir / "metrics.json"
        stamp_path = evidence_dir / "stamp.json"

        report_path.write_text(serialized_report.decode("utf-8") + "\n")
        metrics_path.write_text(serialized_metrics.decode("utf-8") + "\n")
        stamp_path.write_text(json.dumps(stamp, sort_keys=True) + "\n")

        return {
            "report": str(report_path),
            "metrics": str(metrics_path),
            "stamp": str(stamp_path),
        }
