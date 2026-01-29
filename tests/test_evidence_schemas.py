from pathlib import Path
import pytest
from summit_misinfo.evidence.validate import validate_evidence_dir
import jsonschema

FIXT = Path("tests/fixtures/evidence")

def test_evidence_pass():
    validate_evidence_dir(FIXT / "pass")

def test_evidence_fail_missing_metrics():
    with pytest.raises(FileNotFoundError, match="Missing metrics.json"):
        validate_evidence_dir(FIXT / "fail_missing_metrics")

def test_evidence_fail_schema():
    with pytest.raises(jsonschema.ValidationError):
        validate_evidence_dir(FIXT / "fail_schema")

def test_evidence_fail_bias_audit():
    with pytest.raises(ValueError, match="Bias audit failed"):
        validate_evidence_dir(FIXT / "fail_bias_audit")
