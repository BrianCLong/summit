#!/usr/bin/env python3
import os
import sys
import yaml

GOV_POLICY_PATH = "summit/assurance/agent_deployment/policies/agent_governance_policy.yaml"
CONTROL_MATRIX_PATH = "summit/assurance/agent_deployment/policies/human_control_matrix.yaml"

def check_governance():
    if not os.path.exists(GOV_POLICY_PATH):
        print(f"FAIL: Missing {GOV_POLICY_PATH}")
        return False

    with open(GOV_POLICY_PATH, 'r') as f:
        gov_data = yaml.safe_load(f)

    # Deny-by-default check (CLAIM-04)
    if not gov_data.get("governance", {}).get("deny_by_default"):
        print(f"FAIL: {GOV_POLICY_PATH} must explicitly enable 'deny_by_default'")
        return False

    # Risk assessment / Data classification check (CLAIM-01/04)
    if not gov_data.get("governance", {}).get("risk_level"):
        print(f"FAIL: {GOV_POLICY_PATH} must define risk_level")
        return False

    print(f"PASS: {GOV_POLICY_PATH} governance checks.")
    return True

def check_human_control():
    if not os.path.exists(CONTROL_MATRIX_PATH):
        print(f"FAIL: Missing {CONTROL_MATRIX_PATH}")
        return False

    with open(CONTROL_MATRIX_PATH, 'r') as f:
        control_data = yaml.safe_load(f)

    # Human override definition (CLAIM-05)
    if not control_data.get("collaboration", {}).get("override_chain"):
        print(f"FAIL: {CONTROL_MATRIX_PATH} must define override_chain (CLAIM-05)")
        return False

    if not control_data.get("collaboration", {}).get("escalation_paths"):
        print(f"FAIL: {CONTROL_MATRIX_PATH} must define escalation_paths (CLAIM-05)")
        return False

    print(f"PASS: {CONTROL_MATRIX_PATH} human control checks.")
    return True

def main():
    # Feature flag check
    enforce = os.getenv("AGENT_DEPLOYMENT_ENFORCEMENT", "off")
    if enforce != "on":
        print("AGENT_DEPLOYMENT_ENFORCEMENT is not enabled. Skipping.")
        sys.exit(0)

    success = True
    if not check_governance():
        success = False
    if not check_human_control():
        success = False

    if not success:
        sys.exit(1)

    print("ALL governance enforcement checks PASSED.")

if __name__ == "__main__":
    main()
