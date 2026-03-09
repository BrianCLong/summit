#!/usr/bin/env python3
import json
import subprocess
import sys
import os

STATUS_FILE = "docs/comet-v2-status.json"

def load_status():
    if not os.path.exists(STATUS_FILE):
        print(f"Error: {STATUS_FILE} not found.")
        sys.exit(1)
    with open(STATUS_FILE, "r") as f:
        return json.load(f)

def check_pr_status(pr_url):
    try:
        # Check if gh is installed
        subprocess.run(["gh", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except FileNotFoundError:
        print("Warning: 'gh' CLI not found. Skipping PR validation.")
        return "unknown", "unknown"

    try:
        # Fetch PR details
        result = subprocess.run(
            ["gh", "pr", "view", pr_url, "--json", "state,statusCheckRollup"],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        state = data.get("state", "unknown")

        # Parse CI status
        ci_status = "unknown"
        rollup = data.get("statusCheckRollup")
        if rollup:
            ci_status = rollup.get("state", "unknown")

        return state, ci_status
    except subprocess.CalledProcessError:
        return "not_found", "unknown"
    except json.JSONDecodeError:
        return "error", "error"

def main():
    data = load_status()
    print(f"Checking status for: {data.get('initiative', 'Unknown Initiative')}")
    print("-" * 60)
    print(f"{'Item':<30} | {'Status':<15} | {'PR State':<10} | {'CI':<10}")
    print("-" * 60)

    issues_found = []

    for item in data.get("items", []):
        name = item.get("name", "Unnamed")
        status = item.get("status", "unknown")
        pr_link = item.get("pr_link")

        pr_state = "N/A"
        ci_status = "N/A"

        if pr_link and "github.com" in pr_link:
            pr_state, ci_status = check_pr_status(pr_link)

        print(f"{name[:30]:<30} | {status:<15} | {pr_state:<10} | {ci_status:<10}")

        if ci_status == "FAILURE":
            issues_found.append(f"- {name}: CI Failed ({pr_link})")
        if status == "in_progress" and pr_state == "MERGED":
            issues_found.append(f"- {name}: Marked in_progress but PR is MERGED")
        if status == "not_started" and pr_state == "OPEN":
             issues_found.append(f"- {name}: Marked not_started but PR is OPEN")

    if issues_found:
        print("\nIssues Found:")
        for issue in issues_found:
            print(issue)
        sys.exit(1)
    else:
        print("\nAll checks passed.")

if __name__ == "__main__":
    main()
