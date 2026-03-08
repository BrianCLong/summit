#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import List

# Ensure the parent directory of agents is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agents.ai_supply_chain_firewall.policy_gate import (
    enforce_gate,
    evaluate_dependencies,
    generate_metrics,
    generate_stamp,
)


def main():
    parser = argparse.ArgumentParser(description="Run the AI Supply Chain Firewall.")
    parser.add_argument("--deps", type=str, nargs="+", help="List of dependencies to analyze", required=True)
    parser.add_argument("--mode", type=str, choices=["observe", "enforce"], default="observe", help="Enforcement mode")
    parser.add_argument("--output-dir", type=str, default="evidence/ai-supply-chain-firewall", help="Directory for evidence")
    args = parser.parse_args()

    deps = args.deps

    # Mock reading YAML config for prototype (assume threshold 1)
    config = {
        "typosquat": {"edit_distance_threshold": 1}
    }

    report = evaluate_dependencies(deps, config)
    metrics = generate_metrics(report)
    stamp = generate_stamp(report)

    os.makedirs(args.output_dir, exist_ok=True)

    with open(os.path.join(args.output_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2)

    with open(os.path.join(args.output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    with open(os.path.join(args.output_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

    print(f"Analysis complete. Found {metrics['total_blocked']} high-risk dependencies.")

    passed = enforce_gate(report, block_threshold=0.75)

    if args.mode == "enforce" and not passed:
        print("FAIL: High risk dependencies blocked by policy.")
        sys.exit(1)

    print("SUCCESS: Gate passed (or running in observe mode).")
    sys.exit(0)

if __name__ == "__main__":
    main()
