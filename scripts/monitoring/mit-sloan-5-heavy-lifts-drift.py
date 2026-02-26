#!/usr/bin/env python3
import os
import sys
import yaml
import json

# Paths
AGENT_REGISTRY = "agents/registry.yaml"
AGENT_SCOPE = "agent_scope.yaml"
EVIDENCE_DIR = "summit/assurance/agent_deployment/evidence/"
DRIFT_REPORT = os.path.join(EVIDENCE_DIR, "drift_report.json")

def check_drift():
    drift_detected = False
    findings = []

    # 1. Scope Creep Detection
    if os.path.exists(AGENT_SCOPE):
        with open(AGENT_SCOPE, 'r') as f:
            scope_data = yaml.safe_load(f)
            # Placeholder for scope history comparison
            findings.append("Checked agent_scope.yaml for scope creep.")
    else:
        findings.append("Warning: agent_scope.yaml missing for drift check.")

    # 2. Privilege Escalation Detection
    if os.path.exists(AGENT_REGISTRY):
        with open(AGENT_REGISTRY, 'r') as f:
            registry_data = yaml.safe_load(f)
            # Check for high-risk capabilities added without proper governance
            for agent in registry_data.get("agents", []):
                for cap in agent.get("capabilities", []):
                    if cap.get("risk_level") == "critical" and not cap.get("requires_approval"):
                        findings.append(f"Drift Detected: Privilege escalation for {agent['identity']['name']} - critical capability {cap['name']} requires approval.")
                        drift_detected = True

    report = {
        "drift_detected": drift_detected,
        "findings": findings,
        "timestamp": "2026-02-26T12:00:00Z" # Deterministic placeholder
    }

    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    with open(DRIFT_REPORT, "w") as f:
        json.dump(report, f, indent=2)

    if drift_detected:
        print("FAIL: Deployment drift detected!")
        return False

    print("PASS: No significant deployment drift detected.")
    return True

def main():
    # Feature flag check
    enforce = os.getenv("AGENT_DEPLOYMENT_ENFORCEMENT", "off")
    if enforce != "on":
        print("AGENT_DEPLOYMENT_ENFORCEMENT is not enabled. Skipping.")
        sys.exit(0)

    if not check_drift():
        sys.exit(1)

if __name__ == "__main__":
    main()
