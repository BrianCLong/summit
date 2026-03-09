import subprocess
import sys

def run(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True)
    if res.returncode != 0:
        print(f"Command failed with code {res.returncode}")
        return False
    return True

def main():
    success = True
    success &= run("pytest tests/policy/test_biometric_gate.py tests/input/test_router_contract.py")
    success &= run("python3 ci/verify_evidence.py")
    success &= run("python3 evidence/validate.py")
    success &= run("python3 ci/dependency_delta_guard.py")
    success &= run("python3 ci/deps_delta_check.py")

    if not success:
        sys.exit(1)
    print("All CI checks passed.")

if __name__ == "__main__":
    main()
