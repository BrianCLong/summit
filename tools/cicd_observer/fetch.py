import os
from typing import Any, Dict, List

import requests


def fetch_runs(owner: str, repo: str, token: str = None, days: int = 1) -> list[dict[Any, Any]]:
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"

    url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs"
    params = {
        "per_page": 100
    }

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    data = response.json()

    runs = data.get("workflow_runs", [])
    normalized_runs = []
    for run in runs:
        # Simple normalization
        created_at = run.get("created_at")
        updated_at = run.get("updated_at")

        # Calculate duration if possible
        duration_ms = 0
        if created_at and updated_at:
            from datetime import datetime
            fmt = "%Y-%m-%dT%H:%M:%SZ"
            try:
                start = datetime.strptime(created_at, fmt)
                end = datetime.strptime(updated_at, fmt)
                duration_ms = int((end - start).total_seconds() * 1000)
            except ValueError:
                pass

        normalized_runs.append({
            "id": run.get("id"),
            "name": run.get("name"),
            "head_sha": run.get("head_sha"),
            "status": run.get("status"),
            "conclusion": run.get("conclusion"),
            "workflow_id": run.get("workflow_id"),
            "created_at": created_at,
            "updated_at": updated_at,
            "run_attempt": run.get("run_attempt"),
            "run_started_at": run.get("run_started_at"),
            "duration_ms": duration_ms,
            "repository": f"{owner}/{repo}"
        })

    return normalized_runs

if __name__ == "__main__":
    # Example usage
    import sys
    if len(sys.argv) < 3:
        print("Usage: python fetch.py <owner> <repo>")
        sys.exit(1)

    owner = sys.argv[1]
    repo = sys.argv[2]
    token = os.environ.get("GITHUB_TOKEN")
    try:
        runs = fetch_runs(owner, repo, token)
        print(f"Fetched {len(runs)} runs")
    except Exception as e:
        print(f"Error: {e}")
