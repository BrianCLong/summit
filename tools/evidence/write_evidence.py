import os
import json
import time
import argparse
from datetime import datetime, timezone

def main():
    parser = argparse.ArgumentParser(description="Write evidence artifacts")
    parser.add_argument("--id", required=True, help="Evidence ID")
    parser.add_argument("--dir", required=True, help="Directory to write evidence to")
    parser.add_argument("--report", help="JSON string for report.json")
    parser.add_argument("--metrics", help="JSON string for metrics.json")

    args = parser.parse_args()

    # Check if EVIDENCE_WRITE is disabled
    if os.environ.get("EVIDENCE_WRITE") == "0":
        print("EVIDENCE_WRITE is 0, skipping.")
        return

    os.makedirs(args.dir, exist_ok=True)

    # Write report.json
    if args.report:
        with open(os.path.join(args.dir, "report.json"), "w") as f:
            f.write(args.report)

    # Write metrics.json
    if args.metrics:
        with open(os.path.join(args.dir, "metrics.json"), "w") as f:
            f.write(args.metrics)

    # Write stamp.json (ONLY here timestamps are allowed)
    stamp = {
        "evidence_id": args.id,
        "tool_versions": {}, # Placeholder
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    with open(os.path.join(args.dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

    # Update index.json
    index_path = "evidence/index.json"
    index_data = {"items": []}
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            try:
                index_data = json.load(f)
            except json.JSONDecodeError:
                pass

    # Append new item
    # Check for duplicates? Plan doesn't say. Assuming append log.
    index_data["items"].append({
        "evidence_id": args.id,
        "dir": args.dir
    })

    with open(index_path, "w") as f:
        json.dump(index_data, f, indent=2)

if __name__ == "__main__":
    main()
