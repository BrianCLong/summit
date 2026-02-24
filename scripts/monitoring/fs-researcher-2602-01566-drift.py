#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any

def analyze_workspace(workspace_path: Path) -> Dict[str, Any]:
    metrics_path = workspace_path / "artifacts" / "metrics.json"
    if not metrics_path.exists():
        return {"error": f"Metrics not found in {workspace_path}"}

    with open(metrics_path, "r") as f:
        return json.load(f)

def compare_metrics(current: Dict[str, Any], reference: Dict[str, Any]) -> Dict[str, Any]:
    drift = {}
    for key in ["source_count", "kb_note_count", "section_count", "citation_count"]:
        if key in current and key in reference:
            diff = current[key] - reference[key]
            if diff != 0:
                drift[key] = diff
    return drift

def main():
    parser = argparse.ArgumentParser(description="FS-Researcher Drift Detector")
    parser.add_argument("--current", type=Path, help="Path to current workspace")
    parser.add_argument("--reference", type=Path, help="Path to reference workspace for comparison")

    args = parser.parse_args()

    if args.current:
        metrics = analyze_workspace(args.current)
        if "error" in metrics:
            print(metrics["error"], file=sys.stderr)
            sys.exit(1)

        print(f"Metrics for {args.current}:")
        print(json.dumps(metrics, indent=2))

        if args.reference:
            ref_metrics = analyze_workspace(args.reference)
            if "error" not in ref_metrics:
                drift = compare_metrics(metrics, ref_metrics)
                if drift:
                    print("\nDrift detected compared to reference:")
                    print(json.dumps(drift, indent=2))
                else:
                    print("\nNo drift detected.")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
