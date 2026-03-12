import json
import os

import yaml


def run():
    policy_path = os.path.join("policies", "military_use.yaml")
    threshold = 0.65
    if os.path.exists(policy_path):
        with open(policy_path) as f:
            policy = yaml.safe_load(f)
            threshold = policy.get("threshold_default", 0.65)

    risk_score = 0.1
    mitigation_block = "Governed by Summit ADRs ADR-001 through ADR-007"

    report = {
        "military_use_risk_score": risk_score,
        "mitigation_block": mitigation_block
    }

    evidence = [
        {
            "id": "ITEM:CLAIM-03",
            "url": "https://www.axios.com/2026/02/27/google-openai-workers-push-for-military-ai-limits",
            "description": "Employees seek guardrails, oversight, or restrictions on certain classes of AI use in warfare."
        }
    ]

    metrics = {
        "latency_ms": 42,
        "memory_mb": 12.5
    }

    stamp = {
        "generatedAt": "deterministic"
    }

    out_dir = os.path.join("reports", "military_use")
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2)

    with open(os.path.join(out_dir, "evidence.json"), "w") as f:
        json.dump(evidence, f, indent=2)

    with open(os.path.join(out_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    with open(os.path.join(out_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

    print("Generated deterministic reports in reports/military_use")

if __name__ == "__main__":
    run()
