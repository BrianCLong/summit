import json
import subprocess
from pathlib import Path

import pytest
from jsonschema import ValidationError, validate

# Path to the verifier script
VERIFIER_SCRIPT = Path("ci/verify_evidence.py")
SCHEMAS_DIR = Path("summit/evidence/schemas")
VALID_FIXTURES = Path("tests/fixtures/evidence/valid")
INVALID_FIXTURES = Path("tests/fixtures/evidence/invalid")
INVALID_TIMESTAMP = Path("tests/fixtures/evidence/invalid_timestamp")
MISSING_FILES = Path("tests/fixtures/evidence/missing_files")

def test_verify_evidence_valid():
    """Test that valid evidence passes the verification script."""
    result = subprocess.run(
        ["python3", str(VERIFIER_SCRIPT), "--path", str(VALID_FIXTURES), "--schemas", str(SCHEMAS_DIR)],
        capture_output=True,
        text=True
    )
    assert result.returncode == 0, f"Verification failed: {result.stderr}"
    assert "Evidence verification passed." in result.stdout

def test_verify_evidence_missing_index():
    """Test that directory without index.json fails verification."""
    result = subprocess.run(
        ["python3", str(VERIFIER_SCRIPT), "--path", str(INVALID_FIXTURES), "--schemas", str(SCHEMAS_DIR)],
        capture_output=True,
        text=True
    )
    assert result.returncode != 0
    assert "index.json not found" in result.stdout

def test_verify_evidence_invalid_timestamp():
    """Test that evidence with timestamp in report.json fails."""
    result = subprocess.run(
        ["python3", str(VERIFIER_SCRIPT), "--path", str(INVALID_TIMESTAMP), "--schemas", str(SCHEMAS_DIR)],
        capture_output=True,
        text=True
    )
    assert result.returncode != 0
    assert "Found timestamp in" in result.stdout

def test_verify_evidence_missing_files():
    """Test that evidence missing required files fails."""
    result = subprocess.run(
        ["python3", str(VERIFIER_SCRIPT), "--path", str(MISSING_FILES), "--schemas", str(SCHEMAS_DIR)],
        capture_output=True,
        text=True
    )
    assert result.returncode != 0
    assert "Missing required files" in result.stdout

def test_manual_schema_validation_invalid_method():
    """Manually validate the invalid fixture against the schema to ensure schema correctness."""
    with open(SCHEMAS_DIR / "report.schema.json") as f:
        schema = json.load(f)

    with open(INVALID_FIXTURES / "report.json") as f:
        data = json.load(f)

    # The invalid fixture has "method": "invalid_method" which is not in the enum
    with pytest.raises(ValidationError) as excinfo:
        validate(instance=data, schema=schema)

    assert "'invalid_method' is not one of" in str(excinfo.value)
