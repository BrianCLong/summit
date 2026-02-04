from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"
SCRIPT = ROOT / "tools" / "validate_evidence.py"


def run_validator(fixture_dir: Path) -> subprocess.CompletedProcess[str]:
    env = {
        "PYTHONPATH": str(ROOT),
        "EVIDENCE_ROOT": str(fixture_dir),
        "SCHEMAS_DIR": str(ROOT / "schemas" / "evidence"),
    }
    index_file = fixture_dir / "evidence" / "index.json"
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(index_file), "--strict"],
        cwd=fixture_dir,
        capture_output=True,
        text=True,
        env=env,
    )


def test_validate_evidence_success() -> None:
    result = run_validator(FIXTURES / "evidence_good")
    assert result.returncode == 0, result.stderr


def test_validate_evidence_missing_stamp() -> None:
    result = run_validator(FIXTURES / "evidence_bad_missing_stamp")
    assert result.returncode != 0
    assert "Artifact not found" in result.stderr
