#!/usr/bin/env python3
import json
import subprocess
import os
import re
from collections import defaultdict
import datetime
import sys

def get_git_branches():
    try:
        result = subprocess.run(["git", "branch", "-r"], capture_output=True, text=True, check=True)
        return [line.strip().replace('origin/', '') for line in result.stdout.split('\n') if line.strip() and not line.strip().startswith('->')]
    except subprocess.CalledProcessError:
        return []

def analyze():
    branches = get_git_branches()

    # Active Sessions
    active_sessions = []
    monitored_keywords = ['monitoring', 'benchmark', 'adapters', 'leaderboard', 'research']

    for branch in branches:
        if 'jules' in branch.lower() or any(kw in branch.lower() for kw in monitored_keywords):
            active_sessions.append({"branch": branch, "status": "active"})

    # Duplicate PRs/Scope drift check
    duplicates = []

    topic_branches = defaultdict(list)
    for branch in branches:
        for kw in monitored_keywords:
            if kw in branch.lower():
                topic_branches[kw].append(branch)

    for topic, blist in topic_branches.items():
        if len(blist) > 1:
            duplicates.append({
                "topic": topic,
                "branches": blist,
                "issue": "duplicate_pr_or_scope_drift"
            })

    # Check for deterministic artifact violations
    violations = []

    # Find all evidence and artifact JSON files safely
    dirs_to_check = []
    for d in ['evidence', 'artifacts', 'schemas']:
        if os.path.isdir(d):
            dirs_to_check.append(d)

    if dirs_to_check:
        find_cmd = f"find {' '.join(dirs_to_check)} -name '*.json' 2>/dev/null"
        try:
            result = subprocess.run(find_cmd, shell=True, capture_output=True, text=True, check=True)
            json_files = [f for f in result.stdout.split('\n') if f]
        except subprocess.CalledProcessError:
            json_files = []
    else:
        json_files = []

    # Common non-deterministic timestamp patterns
    timestamp_patterns = [
        re.compile(r'"(?:timestamp|time|date|created_at|updated_at)"\s*:\s*"[^"]*"'),
        re.compile(r'"(?:timestamp|time|date)"\s*:\s*\d{10,}'),
    ]

    for file in json_files:
        if 'stamp.json' in file or 'schema.json' in file or 'metrics.json' in file or file.startswith('schemas/') or 'jules-orchestration-report.json' in file:
            continue

        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()

            for pattern in timestamp_patterns:
                match = pattern.search(content)
                if match:
                    violations.append({
                        "file": file,
                        "rule": "no_wall_clock_non_determinism",
                        "issue": f"Contains non-deterministic timestamp field in non-stamp artifact: {match.group(0)}"
                    })
                    break
        except Exception:
            pass

    # Generate report
    report = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().split('+')[0] + "Z",
        "summary": {
            "total_active_sessions": len(active_sessions),
            "duplicate_prs_detected": len(duplicates),
            "deterministic_violations": len(violations)
        },
        "active_sessions": active_sessions,
        "scope_drift_and_duplicates": duplicates,
        "deterministic_artifact_violations": violations
    }

    os.makedirs("artifacts", exist_ok=True)
    report_path = "artifacts/jules-orchestration-report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Orchestration supervisor report generated at {report_path}")

if __name__ == "__main__":
    analyze()
