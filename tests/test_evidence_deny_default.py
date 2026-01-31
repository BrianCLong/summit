import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

# Locate the script relative to this test file
REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts/ci/verify_evidence.py"
EVIDENCE_DIR = REPO_ROOT / "evidence"

@pytest.fixture
def temp_evidence(tmp_path):
    # Create structure
    ev_dir = tmp_path / "evidence"
    ev_dir.mkdir()

    # Copy schemas
    schemas_src = EVIDENCE_DIR / "schemas"
    schemas_dst = ev_dir / "schemas"
    shutil.copytree(schemas_src, schemas_dst)

    # Create empty index
    index_path = ev_dir / "index.json"
    index_path.write_text('{"version": 1, "items": {}}', encoding="utf-8")

    return ev_dir

def run_verifier(evidence_path):
    env = os.environ.copy()
    env["SUMMIT_EVIDENCE_ROOT"] = str(evidence_path)
    # Ensure PYTHONPATH includes repo root if needed
    env["PYTHONPATH"] = str(REPO_ROOT)
    return subprocess.run([sys.executable, str(SCRIPT)], env=env, capture_output=True, text=True)

def test_verifier_passes_empty(temp_evidence):
    res = run_verifier(temp_evidence)
    assert res.returncode == 0, f"Verifier failed: {res.stderr}"

def test_verifier_fails_bad_index_schema(temp_evidence):
    index_path = temp_evidence / "index.json"
    index_path.write_text('{"version": "wrong", "items": {}}', encoding="utf-8")

    res = run_verifier(temp_evidence)
    assert res.returncode != 0
    # "Field 'version' in index.json must be integer"
    assert "must be integer" in res.stderr or "const" in res.stderr

def test_verifier_fails_missing_report_field(temp_evidence):
    # Create report missing summary
    report = {
        "evd_id": "EVD-TEST-001",
        "item_slug": "test-slug",
        # "summary": "missing",
        "risks": [],
        "mitigations": [],
        "artifacts": {}
    }
    (temp_evidence / "report.json").write_text(json.dumps(report))

    # Update index
    index = {
        "version": 1,
        "items": {"EVD-TEST-001": "evidence/report.json"}
    }
    (temp_evidence / "index.json").write_text(json.dumps(index))

    res = run_verifier(temp_evidence)
    assert res.returncode != 0
    assert "Missing required field 'summary'" in res.stderr

def test_verifier_fails_bad_artifact_schema(temp_evidence):
    # Report points to invalid stamp
    (temp_evidence / "bad_stamp.json").write_text('{"foo": "bar"}') # Missing created_at

    report = {
        "evd_id": "EVD-TEST-002",
        "item_slug": "test",
        "summary": "test",
        "risks": [],
        "mitigations": [],
        "artifacts": {"stamp": "evidence/bad_stamp.json"}
    }
    (temp_evidence / "report.json").write_text(json.dumps(report))

    index = {
        "version": 1,
        "items": {"EVD-TEST-002": "evidence/report.json"}
    }
    (temp_evidence / "index.json").write_text(json.dumps(index))

    res = run_verifier(temp_evidence)
    assert res.returncode != 0
    assert "Missing required field 'created_at'" in res.stderr

def test_verifier_fails_timestamp_leak(temp_evidence):
    # Create file with timestamp (use .md as .txt is ignored)
    (temp_evidence / "leaky.md").write_text("Generated at 2025-01-01")

    res = run_verifier(temp_evidence)
    assert res.returncode != 0
    assert "Possible timestamps found" in res.stderr
