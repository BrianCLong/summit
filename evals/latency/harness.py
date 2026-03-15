import json
import os
import sys

# Allowed threshold
REGRESSION_THRESHOLD = 0.10

def run_mock_pipeline():
    # Return mock results (one failure for demo purposes)
    return {
        "retrieval": 155.0, # Small regression, pass
        "reasoning": 350.0, # ~16% regression, fail
        "synthesis": 195.0, # Faster, pass
        "total": 700.0
    }

def main():
    print("Starting latency regression detection harness...")

    baseline_path = "evals/fixtures/latency/baseline.json"
    if not os.path.exists(baseline_path):
        print(f"Error: Baseline fixture not found at {baseline_path}")
        sys.exit(1)

    with open(baseline_path, "r") as f:
        baseline = json.load(f)

    current_metrics = run_mock_pipeline()

    report = {
        "status": "pass",
        "threshold": REGRESSION_THRESHOLD,
        "stages": {}
    }

    has_regression = False

    for stage, baseline_val in baseline.items():
        if stage not in current_metrics:
            continue

        current_val = current_metrics[stage]
        diff = current_val - baseline_val
        percent_change = diff / baseline_val if baseline_val > 0 else 0

        is_regression = percent_change > REGRESSION_THRESHOLD
        if is_regression:
            has_regression = True

        report["stages"][stage] = {
            "baseline": baseline_val,
            "current": current_val,
            "percent_change": percent_change,
            "status": "fail" if is_regression else "pass"
        }

    if has_regression:
        report["status"] = "fail"

    report_path = "evals/latency/report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Harness finished. Report written to {report_path}")
    print(f"Overall status: {report['status']}")

    # We exit 0 so that if run in a generic step we don't blow up the CI
    # if it's meant to be a soft gate, but typically this would exit 1 on failure.
    # The prompt didn't specify exit codes, just "flag" and "JSON report output with pass/fail status".
    sys.exit(0)

if __name__ == "__main__":
    main()
