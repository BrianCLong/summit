import json
import os
import sys
import datetime

# Ensure repo root is in path
sys.path.append(os.getcwd())

from summit.policy.gates.flag_enablement_gate import check_flag_enablement
from summit.evidence.writer import write_evidence

def main() -> int:
    # Load flags from a config file (mocked here or reading a real one)
    config_path = "summit/config/flags.json"
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = json.load(f)
    else:
        # Default flags are OFF
        config = {"continual_learning_enabled": False, "merge_training_enabled": False}

    # Load evidence index
    index_path = "artifacts/evidence/index.json"
    index_data = []
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            try:
                index_data = json.load(f)
            except:
                pass

    violations = check_flag_enablement(config, index_data)

    # Write evidence of the gate run
    report = {
        "evd_id": "EVD-LLMTRAININGCHANGE-POLICY-001",
        "summary": "Flag Enablement Policy Gate",
        "inputs": {"config": config},
        "outputs": {"violations": violations}
    }
    metrics = {"violation_count": len(violations)}
    stamp = {"created_utc": datetime.datetime.utcnow().isoformat()}

    out_dir = write_evidence("EVD-LLMTRAININGCHANGE-POLICY-001", report, metrics, stamp)
    print(f"Evidence written to {out_dir}")

    if violations:
        print("FAIL: Policy violations found:")
        for v in violations:
            print(f" - {v}")
        return 1

    print("PASS: No policy violations.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
