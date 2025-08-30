#!/usr/bin/env python3
import json
import os
import datetime
from collections import defaultdict
import argparse

def record_override(reason: str, downshift: int):
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "overrides.jsonl")
    
    timestamp = datetime.datetime.now().isoformat()
    override_event = {
        "timestamp": timestamp,
        "reason": reason,
        "downshift": downshift
    }
    
    with open(log_file, "a") as f:
        f.write(json.dumps(override_event) + "\n")
    print(f"Recorded override event to {log_file}")

def suggest_policy_tuning(log_file: str):
    if not os.path.exists(log_file):
        print(f"Error: Log file not found at {log_file}")
        return
    
    override_counts = defaultdict(int)
    total_overrides = 0
    
    with open(log_file, "r") as f:
        for line in f:
            try:
                event = json.loads(line)
                if "downshift" in event:
                    override_counts[event["downshift"]] += 1
                    total_overrides += 1
            except json.JSONDecodeError:
                continue
    
    recommendations = {
        "summary": f"Analyzed {total_overrides} override events.",
        "downshift_distribution": dict(override_counts),
        "recommendations": []
    }
    
    if total_overrides > 0:
        if override_counts[1] / total_overrides > 0.5:
            recommendations["recommendations"].append("Consider slightly increasing default autonomy for common tasks (downshift 1 is frequent).")
        if override_counts[2] / total_overrides > 0.3:
            recommendations["recommendations"].append("Review policies for tasks requiring downshift 2; they might be too aggressive.")
        if override_counts[3] / total_overrides > 0.1:
            recommendations["recommendations"].append("Investigate critical tasks causing downshift 3; consider stricter initial policies.")
    else:
        recommendations["recommendations"].append("No override events recorded yet. Continue monitoring.")
        
    print(json.dumps(recommendations, indent=2))

def main():
    parser = argparse.ArgumentParser(description="Manage autonomy override events and suggest policy tuning.")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Override command
    override_parser = subparsers.add_parser("override", help="Record an autonomy override event.")
    override_parser.add_argument("--reason", required=True, help="Reason for the override.")
    override_parser.add_argument("--downshift", type=int, choices=[1, 2, 3], required=True, help="Level of autonomy downshift (1=minor, 2=moderate, 3=critical).")

    # Suggest command
    suggest_parser = subparsers.add_parser("suggest", help="Suggest policy tuning based on override logs.")
    suggest_parser.add_argument("--from", dest="log_file", default="logs/overrides.jsonl", help="Path to the override log file (default: logs/overrides.jsonl).")
    suggest_parser.add_argument("--json", action="store_true", help="Output recommendations as JSON.")

    args = parser.parse_args()

    if args.command == "override":
        record_override(args.reason, args.downshift)
    elif args.command == "suggest":
        suggest_policy_tuning(args.log_file)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
