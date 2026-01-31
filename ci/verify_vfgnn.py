import json
import os
import subprocess
import sys


def run_command(cmd, msg):
    print(f"Running: {msg}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"FAILED: {msg}")
        return False
    print(f"PASSED: {msg}")
    return True

def verify_evidence_index():
    print("Verifying evidence/index.json...")
    try:
        with open("evidence/index.json") as f:
            index = json.load(f)

        required_ids = [
            "EVD-vfgnn-SPEC-001",
            "EVD-vfgnn-GOV-001",
            "EVD-vfgnn-ROB-001",
            "EVD-vfgnn-ATT-001",
            "EVD-vfgnn-NEG-001"
        ]

        items = index['items']
        if isinstance(items, dict):
            found_ids = set(items.keys())
        else:
            found_ids = {item['evidence_id'] for item in items}
        missing = [rid for rid in required_ids if rid not in found_ids]

        if missing:
            print(f"FAILED: Missing evidence IDs: {missing}")
            return False

        print("PASSED: Evidence Index check")
        return True
    except Exception as e:
        print(f"FAILED: Evidence check error: {e}")
        return False

def main():
    checks = [
        ("python3 federated_gnn/tests/test_robust_aggregation.py", "Robust Aggregation Tests"),
        ("python3 federated_gnn/tests/test_backdoor_gates.py", "Backdoor Gate Tests"),
        ("python3 federated_gnn/gates/verify_update_signature.py federated_gnn/tests/fixtures/update_signed.pass.json federated_gnn/tests/fixtures/party_A.json", "Signature Gate (Pass)"),
        ("! python3 federated_gnn/gates/verify_update_signature.py federated_gnn/tests/fixtures/update_unsigned.fail.json federated_gnn/tests/fixtures/party_A.json", "Signature Gate (Fail)"),
        # Add anomaly check
        ("python3 federated_gnn/gates/update_anomaly_thresholds.py federated_gnn/tests/fixtures/update_signed.pass.json federated_gnn/tests/fixtures/thresholds.json", "Anomaly Gate (Pass)"),
    ]

    success = True
    for cmd, msg in checks:
        if cmd.startswith("! "):
            real_cmd = cmd[2:]
            print(f"Running (expect fail): {msg}")
            # Suppress output for expected failure
            result = subprocess.run(real_cmd, shell=True, capture_output=True)
            if result.returncode == 0:
                print(f"FAILED: {msg} (Should have failed but passed)")
                success = False
            else:
                print(f"PASSED: {msg}")
        else:
            if not run_command(cmd, msg):
                success = False

    if not verify_evidence_index():
        success = False

    if success:
        print("\nALL VFGNN VERIFICATION CHECKS PASSED")
        sys.exit(0)
    else:
        print("\nSOME CHECKS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
