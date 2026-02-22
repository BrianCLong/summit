#!/usr/bin/env python3
"""
CI Cost Guard Script
Enforces budget limits defined in .github/ci-cost-policy.yml
Calculates billable minutes using GitHub API.
"""

import os
import sys
import yaml
import json
import subprocess
from datetime import datetime, timezone
import time

POLICY_FILE = ".github/ci-cost-policy.yml"
MAX_RUNS_TO_ANALYZE = 100 # Limit to avoid API rate limiting (1000/hr usually)

def load_policy():
    if not os.path.exists(POLICY_FILE):
        print(f"Policy file not found: {POLICY_FILE}")
        sys.exit(1)
    with open(POLICY_FILE, "r") as f:
        return yaml.safe_load(f)

def run_gh_command(args):
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {' '.join(args)}")
        print(e.stderr)
        # Don't exit immediately, let caller handle
        raise e

def get_runs(period_start, repo):
    """
    Fetches workflow runs since period_start.
    Handles pagination explicitly.
    """
    date_filter = f">={period_start.strftime('%Y-%m-%d')}"
    print(f"Fetching runs created {date_filter}...")

    page = 1
    per_page = 100
    runs = []

    while True:
        try:
            # We fetch minimal fields to list runs
            output = run_gh_command([
                "api",
                f"/repos/{repo}/actions/runs?created={date_filter}&per_page={per_page}&page={page}",
                "--jq", ".workflow_runs[] | {id: .id, status: .status, created_at: .created_at}"
            ])

            if not output:
                break

            batch = [json.loads(line) for line in output.splitlines()]
            if not batch:
                break

            runs.extend(batch)
            print(f"Fetched {len(batch)} runs (Total: {len(runs)})")

            if len(batch) < per_page:
                break

            page += 1

            # Safety break
            if len(runs) >= MAX_RUNS_TO_ANALYZE:
                print(f"Reached analysis limit of {MAX_RUNS_TO_ANALYZE} runs.")
                break

        except Exception as e:
            print(f"Error fetching runs: {e}")
            break

    return runs

def get_run_billable_minutes(run_id, repo):
    """
    Fetches billable duration for a specific run.
    Returns a dict of minutes by OS: {'UBUNTU': 0.0, 'WINDOWS': 0.0, 'MACOS': 0.0}
    """
    try:
        output = run_gh_command([
            "api",
            f"/repos/{repo}/actions/runs/{run_id}/timing"
        ])
        data = json.loads(output)
        billable = data.get("billable_duration_ms", {})

        minutes = {
            "UBUNTU": billable.get("UBUNTU", 0) / 60000.0,
            "WINDOWS": billable.get("WINDOWS", 0) / 60000.0,
            "MACOS": billable.get("MACOS", 0) / 60000.0
        }
        return minutes
    except Exception as e:
        print(f"Failed to get timing for run {run_id}: {e}")
        return {"UBUNTU": 0.0, "WINDOWS": 0.0, "MACOS": 0.0}

def get_run_job_duration_minutes(run_id, repo):
    """
    Fetches job details and sums up duration (for self-hosted approximation).
    """
    try:
        output = run_gh_command([
            "api",
            f"/repos/{repo}/actions/runs/{run_id}/jobs"
        ])
        data = json.loads(output)
        jobs = data.get("jobs", [])

        total_minutes = 0.0
        for job in jobs:
            if job['status'] == 'completed' and job['started_at'] and job['completed_at']:
                start = datetime.fromisoformat(job['started_at'].replace('Z', '+00:00'))
                end = datetime.fromisoformat(job['completed_at'].replace('Z', '+00:00'))
                duration = (end - start).total_seconds() / 60.0
                if duration > 0:
                    total_minutes += duration

        return total_minutes
    except Exception as e:
        print(f"Failed to get jobs for run {run_id}: {e}")
        return 0.0

def main():
    print("Starting CI Cost Guard...")

    # Check for GITHUB_REPOSITORY
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not repo:
        print("::error::GITHUB_REPOSITORY environment variable not set.")
        sys.exit(1)

    policy = load_policy()
    budget_limit = policy['budget']['limit_usd']
    rates = policy['rates']
    thresholds = policy['thresholds']

    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    runs = get_runs(start_of_month, repo)

    total_cost = 0.0
    total_billable_minutes = 0.0 # Standard hosted billable
    total_self_hosted_minutes = 0.0
    analyzed_count = 0

    print(f"Analyzing {len(runs)} runs...")

    for run in runs:
        if run['status'] != 'completed':
            continue

        analyzed_count += 1

        # 1. Try to get Hosted Billable Minutes
        minutes = get_run_billable_minutes(run['id'], repo)

        run_cost = 0.0
        run_minutes = 0.0
        has_hosted_usage = False

        # Ubuntu / Linux
        m_linux = minutes['UBUNTU']
        if m_linux > 0:
            run_cost += m_linux * rates.get('github_hosted_linux', 0.008)
            run_minutes += m_linux
            has_hosted_usage = True

        # Windows
        m_win = minutes['WINDOWS']
        if m_win > 0:
            run_cost += m_win * rates.get('github_hosted_windows', 0.016)
            run_minutes += m_win
            has_hosted_usage = True

        # MacOS
        m_mac = minutes['MACOS']
        if m_mac > 0:
            run_cost += m_mac * rates.get('github_hosted_macos', 0.080)
            run_minutes += m_mac
            has_hosted_usage = True

        total_cost += run_cost
        total_billable_minutes += run_minutes

        # 2. If no hosted usage found, check if it's Self-Hosted
        # Note: Mixed runs (some hosted, some self-hosted) are tricky.
        # We simplify by assuming if billable > 0, we count it as hosted.
        # If billable == 0, we check jobs for self-hosted usage.

        if not has_hosted_usage:
            # Check job durations for self-hosted
            job_minutes = get_run_job_duration_minutes(run['id'], repo)
            if job_minutes > 0:
                # Apply platform fee
                sh_cost = job_minutes * rates.get('self_hosted_platform_fee', 0.002)
                total_cost += sh_cost
                total_self_hosted_minutes += job_minutes
                # print(f"Run {run['id']} classified as Self-Hosted/Other. Minutes: {job_minutes:.2f}, Cost: ${sh_cost:.4f}")

        # Simple progress output every 20 runs
        if analyzed_count % 20 == 0:
            print(f"Analyzed {analyzed_count}/{len(runs)}... Current Cost: ${total_cost:.2f}")

    usage_percent = (total_cost / budget_limit) * 100 if budget_limit > 0 else 0

    print(f"--- Cost Report ---")
    print(f"Period: {start_of_month.strftime('%Y-%m')}")
    print(f"Runs Analyzed: {analyzed_count}")
    print(f"Hosted Billable Minutes: {total_billable_minutes:.2f}")
    print(f"Self-Hosted Minutes: {total_self_hosted_minutes:.2f}")
    print(f"Estimated Cost: ${total_cost:.2f}")
    print(f"Budget Limit: ${budget_limit:.2f}")
    print(f"Usage: {usage_percent:.1f}%")

    if len(runs) >= MAX_RUNS_TO_ANALYZE:
        print(f"::warning::Analysis limited to first {MAX_RUNS_TO_ANALYZE} runs. Actual cost may be higher.")

    status = "OK"
    if usage_percent >= thresholds.get('exhausted', 100):
        status = "EXHAUSTED"
    elif usage_percent >= thresholds.get('critical', 90):
        status = "CRITICAL"
    elif usage_percent >= thresholds.get('warning', 75):
        status = "WARNING"

    print(f"Status: {status}")

    # GitHub Output
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.getenv("GITHUB_OUTPUT"), "a") as f:
            f.write(f"status={status}\n")
            f.write(f"usage_percent={usage_percent}\n")
            f.write(f"estimated_cost={total_cost}\n")

    # Step Summary
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.getenv("GITHUB_STEP_SUMMARY"), "a") as f:
            f.write(f"## 💰 CI Cost Guard Report\n")
            f.write(f"**Period:** {start_of_month.strftime('%Y-%m')}\n")
            f.write(f"**Status:** {status}\n\n")
            f.write(f"| Metric | Value |\n")
            f.write(f"|---|---|\n")
            f.write(f"| **Runs Analyzed** | {analyzed_count} |\n")
            f.write(f"| **Hosted Minutes** | {total_billable_minutes:.2f} |\n")
            f.write(f"| **Self-Hosted Mins** | {total_self_hosted_minutes:.2f} |\n")
            f.write(f"| **Est. Cost** | ${total_cost:.2f} |\n")
            f.write(f"| **Budget** | ${budget_limit:.2f} |\n")
            f.write(f"| **Usage** | {usage_percent:.1f}% |\n")

            if len(runs) >= MAX_RUNS_TO_ANALYZE:
                 f.write(f"\n> ⚠️ **Warning:** Analysis limited to {MAX_RUNS_TO_ANALYZE} runs. Cost is under-reported.\n")

    if status == "EXHAUSTED":
        print("::error::Budget exhausted! CI cost usage has exceeded the limit.")
        sys.exit(1)

if __name__ == "__main__":
    main()
