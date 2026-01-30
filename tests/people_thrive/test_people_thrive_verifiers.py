import subprocess
import os
import pytest

VERIFY_EVIDENCE = "ci/verifiers/people_thrive/verify_evidence.py"
VERIFY_PII = "ci/verifiers/people_thrive/verify_no_pii.py"
VERIFY_SCHEMA = "ci/verifiers/people_thrive/verify_schema.py"

FIXTURES = "tests/people_thrive/fixtures"

def test_verify_evidence_positive():
    result = subprocess.run(["./.venv/bin/python3", VERIFY_EVIDENCE, f"{FIXTURES}/valid_index.json"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "PASSED" in result.stdout

def test_verify_evidence_negative_missing_id():
    result = subprocess.run(["./.venv/bin/python3", VERIFY_EVIDENCE, f"{FIXTURES}/missing_id_index.json"], capture_output=True, text=True)
    assert result.returncode != 0
    assert "FAILED" in result.stdout

def test_verify_pii_positive():
    result = subprocess.run(["./.venv/bin/python3", VERIFY_PII, f"{FIXTURES}/clean_report.json"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "PASSED" in result.stdout

def test_verify_pii_negative():
    result = subprocess.run(["./.venv/bin/python3", VERIFY_PII, f"{FIXTURES}/pii_report.json"], capture_output=True, text=True)
    assert result.returncode != 0
    assert "FAILED" in result.stdout

def test_verify_schema_positive():
    # Test against the actual evidence skeletons
    result = subprocess.run(["./.venv/bin/python3", VERIFY_SCHEMA], capture_output=True, text=True)
    assert result.returncode == 0
    assert "PASSED" in result.stdout

def test_verify_schema_negative():
    result = subprocess.run(["./.venv/bin/python3", VERIFY_SCHEMA, f"{FIXTURES}/invalid_report.json", "report"], capture_output=True, text=True)
    assert result.returncode != 0
    assert "FAILED" in result.stdout
