import sys
import json
import os
import argparse
from typing import Dict, Any

def load_baseline(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {"queries": {}, "baseline_entropy": 0.0}
    with open(path, "r") as f:
        return json.load(f)

def load_heatmap(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        print(f"Error: Heatmap file {path} not found.")
        sys.exit(1)
    with open(path, "r") as f:
        return json.load(f)

def check_gate(heatmap: Dict[str, Any], baseline: Dict[str, Any], threshold: float = 0.95) -> bool:
    """
    Enforces the Plan Stability Gate.
    Fails if plan consistency < threshold or entropy increase > 10%.
    """
    queries = heatmap.get("queries", {})
    failed_queries = []

    total_entropy = 0.0

    for query_sig, data in queries.items():
        stability = data.get("stability_score", 0.0)

        # Check Consistency Threshold
        if stability < threshold:
            failed_queries.append({
                "signature": query_sig,
                "reason": f"Stability {stability:.2f} < {threshold}"
            })

        # Check Drift
        if data.get("is_drifting", False):
             failed_queries.append({
                "signature": query_sig,
                "reason": "Active Plan Drift Detected"
            })

        # Entropy Calculation (Simplified: 1 - stability)
        total_entropy += (1.0 - stability)

    # Check Entropy vs Baseline
    baseline_entropy = baseline.get("baseline_entropy", 0.0)
    # Allow 10% increase
    max_entropy = baseline_entropy * 1.10 if baseline_entropy > 0 else 0.1

    if total_entropy > max_entropy:
        print(f"❌ GLOBAL FAILURE: System Entropy {total_entropy:.4f} exceeds baseline {baseline_entropy:.4f} (+10%)")
        return False

    if failed_queries:
        print(f"❌ PLAN STABILITY GATE FAILED: {len(failed_queries)} queries unstable")
        for failure in failed_queries:
            print(f"  - [{failure['signature']}] {failure['reason']}")
        return False

    print("✅ PLAN STABILITY GATE PASSED")
    return True

def main():
    parser = argparse.ArgumentParser(description="Enforce Plan Stability Gate")
    parser.add_argument("--heatmap", default="artifacts/plan-stability/heatmap.json", help="Path to heatmap JSON")
    parser.add_argument("--baseline", default="docs/ga/baselines/plan_baseline.json", help="Path to baseline JSON")
    parser.add_argument("--threshold", type=float, default=0.95, help="Stability threshold (0.0-1.0)")

    args = parser.parse_args()

    heatmap = load_heatmap(args.heatmap)
    baseline = load_baseline(args.baseline)

    success = check_gate(heatmap, baseline, args.threshold)

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
