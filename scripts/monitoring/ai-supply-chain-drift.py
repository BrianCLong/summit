#!/usr/bin/env python3
import json
import os


def main():
    print("Running Drift Monitor...")
    # Mock trend data for prototype
    trends = {
        "new_dependency_spike": 12,
        "policy_bypass_rate": 0.02,
        "top_flagged_patterns": ["requezts", "fake-lib"]
    }

    os.makedirs("evidence/ai-supply-chain-firewall", exist_ok=True)
    with open("evidence/ai-supply-chain-firewall/trends.json", "w") as f:
        json.dump(trends, f, indent=2)

    drift_report = {
        "status": "baseline",
        "alerts_generated": 0
    }

    with open("evidence/ai-supply-chain-firewall/drift_report.json", "w") as f:
        json.dump(drift_report, f, indent=2)

    print("Drift report and trends generated.")

if __name__ == "__main__":
    main()
