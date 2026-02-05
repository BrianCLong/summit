import os
import json
import sys
import hashlib

ARTIFACTS_DIR = "artifacts/observability"

def check_drift():
    if not os.path.exists(ARTIFACTS_DIR):
        print("No artifacts found.")
        return

    failed_stamps = 0
    total_runs = 0

    for eid in os.listdir(ARTIFACTS_DIR):
        path = os.path.join(ARTIFACTS_DIR, eid)
        if not os.path.isdir(path):
            continue

        total_runs += 1

        # Check stamp existence
        stamp_path = os.path.join(path, "stamp.json")
        trace_path = os.path.join(path, "trace.jsonl")

        if not os.path.exists(stamp_path):
            print(f"MISSING STAMP: {eid}")
            failed_stamps += 1
            continue

        # Verify stamp hash
        if os.path.exists(trace_path):
            with open(trace_path, "rb") as f:
                trace_content = f.read()
                trace_hash = hashlib.sha256(trace_content).hexdigest()

            with open(stamp_path, "r") as f:
                try:
                    stamp_data = json.load(f)
                    if stamp_data.get("trace_sha256") != trace_hash:
                        print(f"INVALID STAMP HASH: {eid}")
                        failed_stamps += 1
                        continue
                except json.JSONDecodeError:
                    print(f"CORRUPT STAMP: {eid}")
                    failed_stamps += 1
                    continue

        # Check report existence
        if not os.path.exists(os.path.join(path, "report.json")):
             print(f"MISSING REPORT: {eid}")
             pass

    print(f"Total Runs: {total_runs}")
    print(f"Failed/Invalid Stamps: {failed_stamps}")

    if failed_stamps > 0:
        sys.exit(1)

if __name__ == "__main__":
    check_drift()
