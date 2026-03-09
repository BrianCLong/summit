#!/usr/bin/env python3
import argparse
import sys
import json
import os

# Ensure we can import from summit
sys.path.insert(0, os.getcwd())

from summit.evals.systems_quality.runner import SystemsQualityEvaluator

def main():
    parser = argparse.ArgumentParser(description="Run Systems Quality Evaluation")
    parser.add_argument("--repo-path", required=True, help="Path to the repository")
    parser.add_argument("--commit-range", required=True, help="Commit range to analyze (e.g., HEAD~1..HEAD)")
    parser.add_argument("--agent-id", required=True, help="ID of the agent being evaluated")
    parser.add_argument("--test-results", help="Path to JSON file containing test results (key: failed, passed)")
    parser.add_argument("--output-dir", default="artifacts/systems_quality", help="Directory to save report")
    parser.add_argument("--threshold-defect-density", type=float, default=0.5, help="Max defect density allowed")
    parser.add_argument("--threshold-rework-rate", type=float, default=0.5, help="Max rework rate allowed")

    args = parser.parse_args()

    test_data = {}
    if args.test_results:
        try:
            with open(args.test_results, 'r') as f:
                test_data = json.load(f)
        except Exception as e:
            print(f"Error loading test results: {e}")
            sys.exit(1)

    runner = SystemsQualityEvaluator()
    try:
        report = runner.run(
            repo_path=args.repo_path,
            commit_range=args.commit_range,
            agent_id=args.agent_id,
            test_results=test_data
        )

        report_path = runner.save_report(report, args.output_dir)
        print(f"Report saved to {report_path}")
        print(f"Metrics: {report.metrics.model_dump_json(indent=2)}")

        # Check thresholds
        failed = False
        if report.metrics.defect_density > args.threshold_defect_density:
            print(f"FAILURE: Defect density {report.metrics.defect_density} > {args.threshold_defect_density}")
            failed = True

        if report.metrics.rework_rate > args.threshold_rework_rate:
            print(f"FAILURE: Rework rate {report.metrics.rework_rate} > {args.threshold_rework_rate}")
            failed = True

        if failed:
            sys.exit(1)

        print("SUCCESS: Quality gates passed")
        sys.exit(0)
    except Exception as e:
        print(f"Execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
