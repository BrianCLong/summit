#!/usr/bin/env python3
"""
Security Triage Script

Fetches open security alerts from GitHub (Dependabot, Code Scanning, Secret Scanning)
and generates a summary report. Can optionally create a GitHub Issue.

Usage:
    python3 scripts/security/triage_alerts.py [--create-issue] [--repo REPO]

Dependencies:
    - gh CLI (authenticated)
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime


def run_command(cmd_list):
    try:
        # shell=False is default, explicitly using list of args
        result = subprocess.run(cmd_list, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # Check for permission errors
        if "403" in e.stderr or "404" in e.stderr:
             # Dependabot/Secret scanning require specific scopes not always available
             return "PERMISSION_DENIED"
        print(f"Error running command: {' '.join(cmd_list)}", file=sys.stderr)
        print(f"Stderr: {e.stderr}", file=sys.stderr)
        return None

def get_alerts(repo, alert_type):
    # JSON structure varies by endpoint, but we use jq to standardize output to an array of objects
    if alert_type == "dependabot":
        endpoint = f"/repos/{repo}/dependabot/alerts"
    elif alert_type == "code-scanning":
        endpoint = f"/repos/{repo}/code-scanning/alerts"
    elif alert_type == "secret-scanning":
        endpoint = f"/repos/{repo}/secret-scanning/alerts"
    else:
        return None

    # Use jq to ensure we get a JSON array even if empty or single result
    cmd_list = ["gh", "api", endpoint, "--jq", "[.[] | select(.state == \"open\")]"]

    output = run_command(cmd_list)

    if output == "PERMISSION_DENIED":
        print(f"Warning: Permission denied accessing {alert_type} alerts. Check token scopes.", file=sys.stderr)
        return "PERMISSION_DENIED"

    if not output:
        return []

    try:
        return json.loads(output)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON for {alert_type}: {e}", file=sys.stderr)
        return []

def generate_report(dependabot, code_scanning, secret_scanning):
    report = [f"# Security Triage Report - {datetime.now().strftime('%Y-%m-%d')}\n"]

    report.append("## Summary")
    report.append("| Type | Count | Critical | High |")
    report.append("|---|---|---|---|")

    # Process Dependabot
    if dependabot == "PERMISSION_DENIED":
        report.append("| Dependabot | ⚠️ Access Denied | - | - |")
        dep_alerts = []
    else:
        dep_crit = sum(1 for a in dependabot if a.get('security_advisory', {}).get('severity') == 'critical')
        dep_high = sum(1 for a in dependabot if a.get('security_advisory', {}).get('severity') == 'high')
        report.append(f"| Dependabot | {len(dependabot)} | {dep_crit} | {dep_high} |")
        dep_alerts = dependabot

    # Process Code Scanning
    if code_scanning == "PERMISSION_DENIED":
        report.append("| Code Scanning | ⚠️ Access Denied | - | - |")
        cs_alerts = []
    else:
        cs_crit = sum(1 for a in code_scanning if a.get('rule', {}).get('security_severity_level') == 'critical')
        cs_high = sum(1 for a in code_scanning if a.get('rule', {}).get('security_severity_level') == 'high')
        report.append(f"| Code Scanning | {len(code_scanning)} | {cs_crit} | {cs_high} |")
        cs_alerts = code_scanning

    # Process Secret Scanning
    if secret_scanning == "PERMISSION_DENIED":
        report.append("| Secret Scanning | ⚠️ Access Denied | - | - |")
        ss_alerts = []
    else:
        ss_count = len(secret_scanning)
        report.append(f"| Secret Scanning | {ss_count} | {ss_count} | 0 |")
        ss_alerts = secret_scanning

    report.append("\n## Action Items (High/Critical)\n")

    if secret_scanning == "PERMISSION_DENIED" or dependabot == "PERMISSION_DENIED" or code_scanning == "PERMISSION_DENIED":
        report.append("**⚠️ Note**: Some checks were skipped due to missing permissions. Please use a PAT with `security_events` and `repo` scopes.\n")

    if ss_alerts:
        report.append("### Secret Scanning (IMMEDIATE ACTION REQUIRED)")
        for a in ss_alerts:
            report.append(f"- [ ] **Secret Found**: {a.get('secret_type')} (Alert #{a.get('number')}) - [Link]({a.get('html_url')})")

    if dep_alerts:
        # Check if we have high/crit
        has_high_crit = any(a.get('security_advisory', {}).get('severity') in ['critical', 'high'] for a in dep_alerts)
        if has_high_crit:
            report.append("\n### Dependabot (High/Critical)")
            for a in dep_alerts:
                severity = a.get('security_advisory', {}).get('severity')
                if severity in ['critical', 'high']:
                    pkg = a.get('dependency', {}).get('package', {}).get('name')
                    report.append(f"- [ ] **{severity.upper()}**: {pkg} (Alert #{a.get('number')}) - [Link]({a.get('html_url')})")

    if cs_alerts:
        has_high_crit = any(a.get('rule', {}).get('security_severity_level') in ['critical', 'high'] for a in cs_alerts)
        if has_high_crit:
            report.append("\n### Code Scanning (High/Critical)")
            for a in cs_alerts:
                severity = a.get('rule', {}).get('security_severity_level')
                if severity in ['critical', 'high']:
                    desc = a.get('rule', {}).get('description')
                    report.append(f"- [ ] **{severity.upper()}**: {desc} (Alert #{a.get('number')}) - [Link]({a.get('html_url')})")

    report.append("\n---\n*Generated by `scripts/security/triage_alerts.py`*")
    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description="Security Triage Automation")
    parser.add_argument("--create-issue", action="store_true", help="Create a GitHub Issue with the report")
    parser.add_argument("--repo", default=None, help="Repository name (e.g. owner/repo)")
    args = parser.parse_args()

    repo = args.repo
    if not repo:
        # Try to infer from git remote
        repo_cmd = ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]
        repo = run_command(repo_cmd)

    if not repo:
        print("Could not determine repository. Use --repo or run in a git repo.", file=sys.stderr)
        sys.exit(1)

    print(f"Fetching alerts for {repo}...")

    dependabot = get_alerts(repo, "dependabot")
    code_scanning = get_alerts(repo, "code-scanning")
    secret_scanning = get_alerts(repo, "secret-scanning")

    report = generate_report(dependabot, code_scanning, secret_scanning)
    print(report)

    if args.create_issue:
        has_criticals = False

        if isinstance(dependabot, list):
             has_criticals = has_criticals or any(a.get('security_advisory', {}).get('severity') in ['critical', 'high'] for a in dependabot)

        if isinstance(code_scanning, list):
             has_criticals = has_criticals or any(a.get('rule', {}).get('security_severity_level') in ['critical', 'high'] for a in code_scanning)

        if isinstance(secret_scanning, list):
             has_criticals = has_criticals or len(secret_scanning) > 0

        # Also create issue if permissions were denied, so the user knows to fix it
        has_errors = (dependabot == "PERMISSION_DENIED" or code_scanning == "PERMISSION_DENIED" or secret_scanning == "PERMISSION_DENIED")

        if has_criticals or has_errors:
            title = f"Security Batch Triage: {datetime.now().strftime('%Y-%m-%d')}"
            print(f"Creating issue: {title}")

            subprocess.run(["gh", "issue", "create", "--title", title, "--body", report, "--label", "security,needs-triage"], check=True)
        else:
            print("No High/Critical alerts found and no errors. Skipping issue creation.")

if __name__ == "__main__":
    main()
