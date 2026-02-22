#!/usr/bin/env python3
import subprocess
import sys
import pathlib
import json

ROOT = pathlib.Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "artifacts" / "prov_context_check.json"

def run_command(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(ROOT))
    if result.returncode != 0:
        print(f"Command failed: {cmd}")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        return False
    return True

def main():
    print("Running Provenance Context Drift Detector...")

    # 1. Run generator
    if not run_command("python3 ci/generate_prov_context.py"):
        sys.exit(1)

    # 2. Check for git diff in spec/prov_context.jsonld
    diff = subprocess.run("git diff spec/prov_context.jsonld", shell=True, capture_output=True, text=True, cwd=str(ROOT))
    if diff.stdout:
        print("ALERT: Drift detected in spec/prov_context.jsonld relative to committed version!")
        print(diff.stdout)
        # In a real scenario, this would trigger an alert or open an issue
        sys.exit(1)

    # 3. Run validator
    if not run_command("python3 ci/validate_prov_context.py"):
        sys.exit(1)

    print("✓ No drift detected. Provenance context is stable.")
    sys.exit(0)

if __name__ == "__main__":
    main()
