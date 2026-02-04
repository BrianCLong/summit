import json
import pathlib
import subprocess
import sys

import pytest


@pytest.fixture
def temp_evidence_root(tmp_path):
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()
    return tmp_path

def run_verifier(root_path):
    ci_dir = root_path / "ci"
    ci_dir.mkdir()
    script_path = pathlib.Path("ci/evidence_verify_sot.py")
    target_script = ci_dir / "evidence_verify_sot.py"
    target_script.write_text(script_path.read_text())
    target_script.chmod(0o755)

    result = subprocess.run([sys.executable, str(target_script)], cwd=str(root_path), capture_output=True, text=True)
    return result

def test_verify_success(temp_evidence_root):
    evidence_dir = temp_evidence_root / "evidence"
    sot_dir = evidence_dir / "EVD-SOT-TEST-001"
    sot_dir.mkdir()

    (sot_dir / "report.json").write_text(json.dumps({"status": "ok"}))
    (sot_dir / "metrics.json").write_text(json.dumps({"score": 0.9}))
    (sot_dir / "stamp.json").write_text(json.dumps({"ts": "2026-01-31T12:00:00Z"}))

    index = {
        "version": "1.0",
        "items": [
            {
                "evidence_id": "EVD-SOT-TEST-001",
                "files": {
                    "report": "evidence/EVD-SOT-TEST-001/report.json",
                    "metrics": "evidence/EVD-SOT-TEST-001/metrics.json",
                    "stamp": "evidence/EVD-SOT-TEST-001/stamp.json"
                }
            }
        ]
    }
    (evidence_dir / "index.json").write_text(json.dumps(index))

    result = run_verifier(temp_evidence_root)
    assert result.returncode == 0
    assert "OK: evidence verified" in result.stdout

def test_verify_fail_timestamp_in_report(temp_evidence_root):
    evidence_dir = temp_evidence_root / "evidence"
    sot_dir = evidence_dir / "EVD-SOT-TEST-001"
    sot_dir.mkdir()

    (sot_dir / "report.json").write_text(json.dumps({"status": "ok", "time": "2026-01-31T12:00:00Z"}))
    (sot_dir / "metrics.json").write_text(json.dumps({"score": 0.9}))
    (sot_dir / "stamp.json").write_text(json.dumps({"ts": "2026-01-31T12:00:00Z"}))

    index = {
        "version": "1.0",
        "items": [
            {
                "evidence_id": "EVD-SOT-TEST-001",
                "files": {
                    "report": "evidence/EVD-SOT-TEST-001/report.json",
                    "metrics": "evidence/EVD-SOT-TEST-001/metrics.json",
                    "stamp": "evidence/EVD-SOT-TEST-001/stamp.json"
                }
            }
        ]
    }
    (evidence_dir / "index.json").write_text(json.dumps(index))

    result = run_verifier(temp_evidence_root)
    assert result.returncode == 2
    assert "FAIL: EVD-SOT-TEST-001 timestamps found outside stamp.json" in result.stderr

def test_verify_fail_missing_stamp(temp_evidence_root):
    evidence_dir = temp_evidence_root / "evidence"
    sot_dir = evidence_dir / "EVD-SOT-TEST-001"
    sot_dir.mkdir()

    (sot_dir / "report.json").write_text(json.dumps({"status": "ok"}))
    (sot_dir / "metrics.json").write_text(json.dumps({"score": 0.9}))
    (sot_dir / "stamp.json").write_text(json.dumps({"actor": "none"})) # No timestamp

    index = {
        "version": "1.0",
        "items": [
            {
                "evidence_id": "EVD-SOT-TEST-001",
                "files": {
                    "report": "evidence/EVD-SOT-TEST-001/report.json",
                    "metrics": "evidence/EVD-SOT-TEST-001/metrics.json",
                    "stamp": "evidence/EVD-SOT-TEST-001/stamp.json"
                }
            }
        ]
    }
    (evidence_dir / "index.json").write_text(json.dumps(index))

    result = run_verifier(temp_evidence_root)
    assert result.returncode == 2
    assert "FAIL: EVD-SOT-TEST-001 stamp.json must contain at least one timestamp" in result.stderr
