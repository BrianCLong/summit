import argparse
import json


def apply_risk_overlay(evidence_items):
    metrics = {
        "data_exposure_risk": 0,
        "vendor_dependency_risk": 0,
        "cost_opacity_risk": 0,
        "automation_fragility_risk": 0,
        "policy_blind_spots": 0
    }

    flags = []

    for item in evidence_items:
        # Mock logic
        metrics["data_exposure_risk"] += 1
        flags.append({
            "evidence_id": item["id"],
            "flag": "unverified_data_handling",
            "severity": "medium"
        })

    return metrics, flags

def main():
    parser = argparse.ArgumentParser(description="Apply Governance Risk Overlay")
    parser.add_argument("--input", type=str, required=True, help="Path to evidence.json")
    parser.add_argument("--metrics_out", type=str, required=True, help="Path to output metrics.json")
    parser.add_argument("--flags_out", type=str, required=True, help="Path to output policy_flags.json")
    args = parser.parse_args()

    with open(args.input) as f:
        evidence_items = json.load(f)

    metrics, flags = apply_risk_overlay(evidence_items)

    with open(args.metrics_out, "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    with open(args.flags_out, "w") as f:
        json.dump(flags, f, indent=2, sort_keys=True)

if __name__ == "__main__":
    main()
