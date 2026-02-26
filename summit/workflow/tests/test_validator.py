import pytest
import shutil
from pathlib import Path
from summit.workflow.base import WorkflowValidator

def test_workflow_validator_mws():
    output_dir = "artifacts/test/workflow_unit"
    if Path(output_dir).exists():
        shutil.rmtree(output_dir)

    validator = WorkflowValidator(output_dir=output_dir)
    # Validate the current directory as a dummy target
    results = validator.validate("summit/workflow")

    assert results["status"] == "validated"
    assert "path" in results

    evidence_id = validator.generate_evidence(results, "test-run-id-1234567890")
    assert evidence_id.startswith("WF-CORE-")

    assert Path(output_dir, "report.json").exists()
    assert Path(output_dir, "metrics.json").exists()
    assert Path(output_dir, "stamp.json").exists()

def test_workflow_validator_nonexistent():
    validator = WorkflowValidator()
    results = validator.validate("nonexistent/path")
    assert results["status"] == "failed"
    assert "error" in results
