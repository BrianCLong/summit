import sys
import os
import hashlib
import json

# Add root to sys.path
sys.path.append(os.getcwd())

from summit.pipelines.ip_capture.pipeline import run_ip_capture

EXPECTED_REPORT_HASH = "458fe8c2b0a93fafec0c87b45a31636a975d984940ee2f133f62bddd519126e4" # Will print this on first run

def calculate_file_hash(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def check_drift(input_path, output_dir):
    if not os.path.exists(input_path):
        print(f"Error: Input {input_path} not found")
        sys.exit(1)

    print(f"Running drift check on {input_path}...")
    run_ip_capture(input_path, output_dir, slug="drift-check")

    report_path = os.path.join(output_dir, "report.json")
    current_hash = calculate_file_hash(report_path)

    print(f"Current Report Hash: {current_hash}")

    # If EXPECTED_REPORT_HASH is set, verify
    if EXPECTED_REPORT_HASH:
        if current_hash != EXPECTED_REPORT_HASH:
            print("DRIFT DETECTED! Hash mismatch.")
            sys.exit(1)
        else:
            print("No drift detected.")
    else:
        print("No baseline set. Please update script with the current hash.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/monitoring/forbes-ip-prompts-2026-02-09-drift.py <input_file> <output_dir>")
        sys.exit(1)

    check_drift(sys.argv[1], sys.argv[2])
