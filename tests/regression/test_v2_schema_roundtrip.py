import subprocess
import os
import sys
import pytest

def test_v2_schema_roundtrip():
    # Run the eval script
    # Ensure we are in the root directory
    root_dir = os.getcwd()
    script_path = os.path.join(root_dir, "evals/influence_ops/v2_schema_roundtrip_eval.py")

    assert os.path.exists(script_path), f"Script not found at {script_path}"

    cmd = [sys.executable, script_path]
    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    print(result.stderr)

    assert result.returncode == 0, f"Eval script failed with code {result.returncode}: {result.stderr}"
    assert "Evidence generated" in result.stdout
