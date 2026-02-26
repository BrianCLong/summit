#!/usr/bin/env python3
import os
import sys
import json
import yaml

# Paths to artifacts
SCOPE_FILE = "agent_scope.yaml"
WORKFLOW_FILE = "summit/assurance/agent_deployment/workflow_map.json"
GOV_POLICY_FILE = "summit/assurance/agent_deployment/policies/agent_governance_policy.yaml"
CONTROL_MATRIX_FILE = "summit/assurance/agent_deployment/policies/human_control_matrix.yaml"
METRICS_FILE = "deployment_metrics.json"

# Output artifact paths
EVIDENCE_DIR = "summit/assurance/agent_deployment/evidence/"

def calculate_score():
    scores = {
        "scope_clarity": 0,
        "workflow_integration": 0,
        "governance_maturity": 0,
        "human_oversight": 0,
        "metrics_instrumentation": 0
    }

    # 1. Scope Clarity (0-5)
    if os.path.exists(SCOPE_FILE):
        with open(SCOPE_FILE, 'r') as f:
            data = yaml.safe_load(f)
            if data.get("task_name"): scores["scope_clarity"] += 1
            if data.get("inputs"): scores["scope_clarity"] += 1
            if data.get("outputs"): scores["scope_clarity"] += 1
            if data.get("out_of_scope"): scores["scope_clarity"] += 1
            if data.get("decomposition"): scores["scope_clarity"] += 1

    # 2. Workflow Integration (0-5)
    if os.path.exists(WORKFLOW_FILE):
        with open(WORKFLOW_FILE, 'r') as f:
            data = json.load(f)
            if data.get("upstream_systems"): scores["workflow_integration"] += 1
            if data.get("downstream_systems"): scores["workflow_integration"] += 1
            if data.get("handoff_points"): scores["workflow_integration"] += 1
            if data.get("human_intervention_nodes"): scores["workflow_integration"] += 2

    # 3. Governance Maturity (0-5)
    if os.path.exists(GOV_POLICY_FILE):
        with open(GOV_POLICY_FILE, 'r') as f:
            data = yaml.safe_load(f)
            gov = data.get("governance", {})
            if gov.get("deny_by_default"): scores["governance_maturity"] += 2
            if gov.get("risk_level"): scores["governance_maturity"] += 1
            if gov.get("accountability_chain"): scores["governance_maturity"] += 2

    # 4. Human Oversight (0-5)
    if os.path.exists(CONTROL_MATRIX_FILE):
        with open(CONTROL_MATRIX_FILE, 'r') as f:
            data = yaml.safe_load(f)
            collab = data.get("collaboration", {})
            if collab.get("human_in_the_loop"): scores["human_oversight"] += 1
            if collab.get("override_chain"): scores["human_oversight"] += 2
            if collab.get("escalation_paths"): scores["human_oversight"] += 2

    # 5. Metrics Instrumentation (0-5)
    if os.path.exists(METRICS_FILE):
        with open(METRICS_FILE, 'r') as f:
            data = json.load(f)
            if data.get("performance_kpis"): scores["metrics_instrumentation"] += 2
            if data.get("reliability_metrics"): scores["metrics_instrumentation"] += 2
            if data.get("drift_indicators"): scores["metrics_instrumentation"] += 1

    total_score = sum(scores.values())

    result = {
        "readiness_score": total_score,
        "max_score": 25,
        "threshold": 20,
        "categories": scores,
        "status": "PASSED" if total_score >= 20 else "FAILED"
    }

    os.makedirs(EVIDENCE_DIR, exist_ok=True)

    with open(os.path.join(EVIDENCE_DIR, "readiness_score.json"), "w") as f:
        json.dump(result, f, indent=2)

    # Produce additional standard artifacts
    with open(os.path.join(EVIDENCE_DIR, "report.json"), "w") as f:
        json.dump({"summary": result["status"], "score": total_score}, f, indent=2)

    with open(os.path.join(EVIDENCE_DIR, "metrics.json"), "w") as f:
        json.dump(scores, f, indent=2)

    with open(os.path.join(EVIDENCE_DIR, "stamp.json"), "w") as f:
        # Deterministic stamp as per requirements
        json.dump({"module": "agent_deployment", "framework": "mit-sloan-5-heavy-lifts"}, f, indent=2)

    print(f"Readiness Score: {total_score}/25")
    return total_score >= 20

def main():
    # Feature flag check
    enforce = os.getenv("AGENT_DEPLOYMENT_ENFORCEMENT", "off")
    if enforce != "on":
        print("AGENT_DEPLOYMENT_ENFORCEMENT is not enabled. Skipping.")
        sys.exit(0)

    if not calculate_score():
        print("FAIL: Deployment readiness score is below threshold (20/25).")
        sys.exit(1)
    else:
        print("PASS: Deployment readiness score meets threshold.")

if __name__ == "__main__":
    main()
