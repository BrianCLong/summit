import argparse
import json
import os
import subprocess
from datetime import datetime


def get_sha_week_ago():
    try:
        # Get SHA from 7 days ago
        cmd = ["git", "rev-list", "-n", "1", "--before=1 week ago", "HEAD"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        sha = result.stdout.strip()
        if not sha:
            # Fallback to initial commit if repo is younger than a week
            cmd = ["git", "rev-list", "--max-parents=0", "HEAD"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            sha = result.stdout.strip()
        return sha
    except subprocess.CalledProcessError:
        return "HEAD~10" # Fallback

def run_gate(base_sha):
    print(f"Running Solid Gate diffing against {base_sha}...")
    cmd = ["python", "-m", "tools.solid_gate", "--diff-base", base_sha]
    subprocess.run(cmd, check=False) # Don't fail script if gate finds issues

def analyze_report():
    report_path = "artifacts/solid-gate/report.json"
    if not os.path.exists(report_path):
        print("No report found.")
        return

    with open(report_path) as f:
        data = json.load(f)

    findings = data.get("findings", [])
    print(f"Findings in last week's code changes: {len(findings)}")

    by_rule = {}
    for f in findings:
        rid = f["rule_id"]
        by_rule[rid] = by_rule.get(rid, 0) + 1

    print("Counts by Rule:")
    for rule, count in by_rule.items():
        print(f"  {rule}: {count}")

    # Generate drift trend artifact
    trend = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_findings": len(findings),
        "by_rule": by_rule
    }

    os.makedirs("artifacts/solid-gate-drift", exist_ok=True)
    with open("artifacts/solid-gate-drift/trend.json", "w") as f:
        json.dump(trend, f, indent=2)
    print("Drift trend saved to artifacts/solid-gate-drift/trend.json")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", help="Override base SHA")
    args = parser.parse_args()

    base = args.base or get_sha_week_ago()
    run_gate(base)
    analyze_report()

if __name__ == "__main__":
    main()
