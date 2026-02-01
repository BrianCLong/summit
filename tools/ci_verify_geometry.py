#!/usr/bin/env python3
import subprocess
import sys
import os

def run(cmd):
    print(f"> {cmd}")
    ret = subprocess.call(cmd, shell=True)
    if ret != 0:
        sys.exit(ret)

def main():
    # 1. Unit tests
    run("python3 -m pytest tests/geometry")
    run("python3 -m pytest tests/test_validate_evidence.py")

    # 2. End-to-end eval
    # Ensure PYTHONPATH includes CWD for summit module
    run("export PYTHONPATH=$PYTHONPATH:. && python3 tools/run_geometry_eval.py --out evidence/geometry_eval")

    # 3. Validate artifacts
    run("python3 tools/validate_evidence.py evidence/geometry_eval/index.json --strict")

    print("ALL CHECKS PASSED")

if __name__ == "__main__":
    main()
