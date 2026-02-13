import os
import subprocess
import sys


def test_gate_runner_no_args():
    result = subprocess.run([sys.executable, "ci/gates/gate_runner.py"], capture_output=True, text=True)
    if result.returncode != 0: raise AssertionError(f"Expected 0, got {result.returncode}")
    if "KNOWN_GATES=gate.latedata" not in result.stdout: raise AssertionError("Output missing known gates")

def test_gate_runner_unknown_gate():
    result = subprocess.run([sys.executable, "ci/gates/gate_runner.py", "gate.unknown"], capture_output=True, text=True)
    if result.returncode != 2: raise AssertionError(f"Expected 2, got {result.returncode}")
    if "ERROR: unknown gate" not in result.stdout: raise AssertionError("Output missing error message")

def test_gate_runner_deny_by_default():
    result = subprocess.run([sys.executable, "ci/gates/gate_runner.py", "gate.latedata"], capture_output=True, text=True)
    if result.returncode != 3: raise AssertionError(f"Expected 3, got {result.returncode}")
    if "DENY_BY_DEFAULT: gate.latedata" not in result.stdout: raise AssertionError("Output missing deny message")

if __name__ == "__main__":
    try:
        test_gate_runner_no_args()
        test_gate_runner_unknown_gate()
        test_gate_runner_deny_by_default()
        print("All smoke tests passed.")
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
