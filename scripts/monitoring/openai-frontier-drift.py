import sys
import os
import json
import time
import subprocess

# Add repo root to path
sys.path.append(os.getcwd())

from summit.frontier.evidence import evidence_id, write_json

def run_tests():
    """Run the MWS suite and capture metrics."""
    start = time.time()
    result = subprocess.run(
        ["python", "-m", "pytest", "summit/tests/frontier/mws/test_mws_frontier.py"],
        capture_output=True,
        text=True
    )
    duration = time.time() - start

    success = result.returncode == 0

    return {
        "success": success,
        "duration": duration,
        "stdout": result.stdout,
        "stderr": result.stderr
    }

def main():
    print("Starting Frontier Drift Detector...")

    metrics = run_tests()

    report = {
        "timestamp": time.time(),
        "metrics": metrics,
        "status": "PASS" if metrics["success"] else "FAIL"
    }

    # Write artifacts
    eid = evidence_id("DRIFT_REPORT", int(time.time()))
    report_path = f"artifacts/openai-frontier-drift/{eid}.json"
    write_json(report_path, report)

    print(f"Report written to {report_path}")

    if not metrics["success"]:
        print("Drift Detected! Tests failed.")
        sys.exit(1)

    print("No drift detected.")

if __name__ == "__main__":
    main()
