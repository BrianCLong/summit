#!/usr/bin/env python3
import json
import os
import sys

INDEX_PATH = "evidence/index.json"

def main():
    if len(sys.argv) < 5:
        print("Usage: update_evidence_index.py <EVID> <TITLE> <CATEGORY> <REPORT_PATH> [METRICS_PATH] [STAMP_PATH]")
        sys.exit(1)

    evid = sys.argv[1]
    title = sys.argv[2]
    category = sys.argv[3]
    report = sys.argv[4]
    metrics = sys.argv[5] if len(sys.argv) > 5 else report.replace("report", "metrics")
    stamp = sys.argv[6] if len(sys.argv) > 6 else report.replace("report", "stamp")

    if not os.path.exists(INDEX_PATH):
        index = {"version": "1.0", "map": {}}
    else:
        with open(INDEX_PATH, "r") as f:
            index = json.load(f)

    # Use 'map' to align with moltbook-relay-index.schema.json and main index schema
    if "map" not in index:
        index["map"] = {}

    index["map"][evid] = {
        "title": title,
        "category": category,
        "report": report,
        "metrics": metrics,
        "stamp": stamp
    }

    with open(INDEX_PATH, "w") as f:
        json.dump(index, f, indent=2)

    print(f"Updated {INDEX_PATH} with {evid}")

if __name__ == "__main__":
    main()
