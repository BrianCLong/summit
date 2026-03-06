import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]

def test_run_evals():
    # Run the eval script
    cmd = ["python3", str(ROOT / "evals" / "info_integrity" / "run_evals.py")]
    result = subprocess.run(cmd, capture_output=True, text=True)

    assert result.returncode == 0
    assert "SUCCESS: All evals passed compliance gates" in result.stdout

    # Check if evidence was created
    evidence_dir = ROOT / "evidence" / "runs" / "ai-miso-psyop-2025"
    assert (evidence_dir / "report.json").exists()
    assert (evidence_dir / "metrics.json").exists()
    assert (evidence_dir / "stamp.json").exists()
