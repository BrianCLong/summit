import subprocess
import os
import pytest

TOOL_PATH = "tools/run_gates.py"

def test_deny_by_default_no_args():
    result = subprocess.run(["python3", TOOL_PATH], capture_output=True, text=True)
    assert result.returncode == 1
    assert "Deny by default" in result.stdout

def test_deny_by_default_missing_file():
    result = subprocess.run(["python3", TOOL_PATH, "--input", "non_existent.json"], capture_output=True, text=True)
    assert result.returncode == 1
    assert "Deny by default" in result.stdout

def test_deny_by_default_empty_input():
    fixture_path = "tests/fixtures/deny_by_default/empty_context.json"
    # Ensure fixture exists (will be created in next step, but test depends on it)
    if not os.path.exists(fixture_path):
        pytest.skip(f"Fixture {fixture_path} not found")

    result = subprocess.run(["python3", TOOL_PATH, "--input", fixture_path], capture_output=True, text=True)
    assert result.returncode == 1
    assert "Deny by default" in result.stdout
