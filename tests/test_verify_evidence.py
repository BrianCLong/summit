import subprocess
import sys
from pathlib import Path

def test_verify_evidence_runs():
    repo_root = Path(__file__).resolve().parents[1]
    script = repo_root / "tools" / "ci" / "verify_evidence.py"
    res = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    # It might fail if index.json is invalid (which it currently is), but we will fix it in Step 7.
    # So this test will eventually pass.
    # For now, we just assert it ran (returncode might be 1 if validation fails).
    # But the plan expects it to pass at the end.

    # NOTE: We assert returncode == 0 assuming the test runs AFTER the fix.
    assert res.returncode == 0, res.stderr
