import subprocess
import sys
import os

def test_gate_runner_list():
    """Test that running without args lists known gates."""
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "gate_runner.py"))
    result = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    assert result.returncode == 0
    assert "KNOWN_GATES=" in result.stdout
    assert "gate.latedata" in result.stdout

def test_gate_runner_deny_by_default():
    """Test that running a known gate returns deny code 3."""
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "gate_runner.py"))
    result = subprocess.run([sys.executable, script_path, "gate.latedata"], capture_output=True, text=True)
    assert result.returncode == 3
    assert "DENY_BY_DEFAULT" in result.stdout

def test_gate_runner_unknown_gate():
    """Test that running an unknown gate returns error code 2."""
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "gate_runner.py"))
    result = subprocess.run([sys.executable, script_path, "gate.unknown"], capture_output=True, text=True)
    assert result.returncode == 2
    assert "ERROR: unknown gate" in result.stdout
