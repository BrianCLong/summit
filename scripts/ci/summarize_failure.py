#!/usr/bin/env python3
"""Summarize a failed GitHub Actions workflow run."""

import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, List

import requests

GITHUB_API = os.environ.get("GITHUB_API", "https://api.github.com")
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")


@dataclass
class StepSummary:
    name: str
    conclusion: str
    log_url: str | None


def fetch_workflow_jobs(run_id: str) -> List[Dict[str, Any]]:
    headers = {"Accept": "application/vnd.github+json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    resp = requests.get(f"{GITHUB_API}/repos/{os.environ.get('GITHUB_REPOSITORY')}/actions/runs/{run_id}/jobs", headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data.get("jobs", [])


def collect_steps(run_id: str) -> List[StepSummary]:
    steps: List[StepSummary] = []
    for job in fetch_workflow_jobs(run_id):
        for step in job.get("steps", []):
            if step.get("conclusion") == "success":
                continue
            steps.append(
                StepSummary(
                    name=f"{job.get('name')} :: {step.get('name')}",
                    conclusion=step.get("conclusion") or "unknown",
                    log_url=job.get("html_url")
                )
            )
    return steps


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: summarize_failure.py <workflow_run_id>", file=sys.stderr)
        sys.exit(1)

    run_id = sys.argv[1]
    try:
        steps = collect_steps(run_id)
    except Exception as exc:  # pragma: no cover - best effort summarizer
        print(json.dumps({"error": str(exc)}))
        return

    summary = {
        "workflow_run_id": run_id,
        "failed_steps": [step.__dict__ for step in steps],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
