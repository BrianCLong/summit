import subprocess
import sys
from pathlib import Path

import pytest

# Assume we run pytest from repo root
REPO_ROOT = Path.cwd()
GATE_SCRIPT = REPO_ROOT / "tools/ci/privacy_graph_gate.py"

def test_gate_fails_on_pii(tmp_path):
    # Mock evidence dir
    evidence = tmp_path / "evidence"
    evidence.mkdir()
    (evidence / "bad.json").write_text('{"email": "fail@example.com"}')

    # Run gate in subprocess
    res = subprocess.run(
        [sys.executable, str(GATE_SCRIPT)],
        cwd=tmp_path,
        capture_output=True,
        text=True
    )
    assert res.returncode == 3
    assert "PII-like pattern" in res.stdout

def test_gate_passes_clean(tmp_path):
    evidence = tmp_path / "evidence"
    evidence.mkdir()
    (evidence / "good.json").write_text('{"metric": 100}')

    res = subprocess.run(
        [sys.executable, str(GATE_SCRIPT)],
        cwd=tmp_path,
        capture_output=True,
        text=True
    )
    assert res.returncode == 0
    assert "OK" in res.stdout

def test_gate_fails_missing_evidence(tmp_path):
    # No evidence dir
    res = subprocess.run(
        [sys.executable, str(GATE_SCRIPT)],
        cwd=tmp_path,
        capture_output=True,
        text=True
    )
    assert res.returncode == 2
    assert "evidence/ missing" in res.stdout
