#!/usr/bin/env python3
import sys
import subprocess
import os
import json

def run_check(name, command):
    print(f"Running check: {name}...")
    try:
        subprocess.check_call(command, shell=True, env={**os.environ, "PYTHONPATH": "."})
        print(f"PASS: {name}")
        return True
    except subprocess.CalledProcessError:
        print(f"FAIL: {name}")
        return False

def check_file_exists(path):
    exists = os.path.exists(path)
    print(f"Check file exists: {path} -> {'PASS' if exists else 'FAIL'}")
    return exists

def main():
    checks = [
        ("MCP Transport Tests", "python3 summit/tests/mcp/test_transport_http.py"),
        ("Tool Catalog Sync Tests", "python3 summit/tests/mcp/test_tool_registry_sync.py"),
        ("Security Policy Tests", "python3 summit/tests/security/test_policy_deny_by_default.py"),
        ("Context Budget Tests", "python3 summit/tests/context/test_context_budgeter.py"),
        ("Model Adapter Tests", "python3 summit/tests/models/test_adapter_contract.py"),
    ]

    failed = False
    for name, cmd in checks:
        if not run_check(name, cmd):
            failed = True

    artifacts = [
        "artifacts/evidence/mcp/roundtrip.report.json",
        "artifacts/evidence/mcp/tool_catalog.json",
        "artifacts/evidence/security/policy_audit.log.jsonl",
        "artifacts/evidence/context/context_pack.metrics.json"
    ]

    for path in artifacts:
        if not check_file_exists(path):
            failed = True

    if failed:
        print("DRIFT DETECTED OR CHECKS FAILED")
        sys.exit(1)

    print("ALL CHECKS PASSED: No drift detected.")

if __name__ == "__main__":
    main()
