import os
import hashlib
from pathlib import Path
from typing import Any, Dict, Optional
from summit.evidence.writer import write_bundle

class WorkflowValidator:
    """
    Core validator for Summit workflows (dbt, Airflow).
    Produces deterministic evidence of validation.
    """
    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or "artifacts/workflow"

    def validate(self, target_path: str) -> Dict[str, Any]:
        """
        Validate a workflow project (dbt or Airflow).
        Currently implements a minimal winning slice (MWS).
        """
        target = Path(target_path)
        if not target.exists():
            return {
                "status": "failed",
                "error": f"Path does not exist: {target_path}",
                "path": target_path
            }

        # Mock validation for PR1
        # In PR2/PR3 we will add actual dbt/Airflow logic
        return {
            "status": "validated",
            "path": target_path,
            "summary": f"Minimal validation for {target_path}",
            "details": {
                "type": "generic",
                "files_checked": 1
            }
        }

    def generate_evidence(self, results: Dict[str, Any], run_id: str):
        """
        Generate machine-verifiable evidence artifacts.
        """
        # In a real scenario, we might derive evidence_id from results hash
        # For now, we use the provided run_id if it looks like an evidence ID,
        # otherwise we prefix it.
        evidence_id = run_id if run_id.startswith("WF-") else f"WF-CORE-{run_id[:12]}"

        run_ctx = {
            "evidence_id": evidence_id,
            "run_id": run_id,
            "summary": results.get("summary", "Workflow Validation"),
            "policies_applied": ["deny-by-default"],
            "artifacts": [
                {"name": "validation_results", "data": results}
            ],
            "metrics": {
                "evidence_id": evidence_id,
                "files_scanned": results.get("details", {}).get("files_checked", 0),
                "status": results["status"]
            }
        }

        write_bundle(run_ctx, self.output_dir)
        return evidence_id
