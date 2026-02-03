import subprocess
import sys
from pathlib import Path


def test_telemetry_privacy_gate_passes() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        [sys.executable, "ci/check_telemetry_privacy.py"],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
