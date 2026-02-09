#!/usr/bin/env python3
import os
import sys
import json
import logging
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests

# Add repo root to sys.path to import summit modules
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(REPO_ROOT))

try:
    from summit.evidence import writer
except ImportError:
    # Fallback for local testing if package structure is different
    sys.path.append(str(REPO_ROOT / "summit"))
    from evidence import writer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

GITHUB_API_URL = "https://api.github.com"

def get_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

def fetch_workflow_runs(owner: str, repo: str, token: str, days: int = 7) -> List[Dict[str, Any]]:
    """Fetch workflow runs for the last N days."""
    url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/actions/runs"
    headers = get_headers(token)

    # calculate date filter
    since_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    params = {
        "per_page": 100,
        "created": f">{since_date}",
        "exclude_pull_requests": "false" # Include PR runs for data quality metrics
    }

    runs = []
    page = 1

    while True:
        logger.info(f"Fetching runs page {page}...")
        try:
            resp = requests.get(url, headers=headers, params={**params, "page": page})
            resp.raise_for_status()
            data = resp.json()

            if not data.get("workflow_runs"):
                break

            runs.extend(data["workflow_runs"])

            if len(runs) >= data.get("total_count", 0):
                break

            page += 1
            if page > 5: # Safety limit for now
                break

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch runs: {e}")
            break

    return runs

def calculate_metrics(runs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate CI/CD observability metrics."""
    metrics = {
        "total_runs": len(runs),
        "success_count": 0,
        "failure_count": 0,
        "cancelled_count": 0,
        "total_duration_seconds": 0.0,
        "avg_duration_seconds": 0.0,
        "workflow_stats": {},
        # DORA approximations
        "deployment_frequency": 0, # approx via release workflows
        "change_failure_rate": 0.0
    }

    workflow_groups = {}

    for run in runs:
        conclusion = run.get("conclusion")
        status = run.get("status")
        name = run.get("name", "unknown")

        # Duration
        created_at = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
        updated_at = datetime.fromisoformat(run["updated_at"].replace("Z", "+00:00"))
        duration = (updated_at - created_at).total_seconds()

        # Stats
        if conclusion == "success":
            metrics["success_count"] += 1
        elif conclusion == "failure":
            metrics["failure_count"] += 1
        elif conclusion == "cancelled":
            metrics["cancelled_count"] += 1

        metrics["total_duration_seconds"] += duration

        # Group by workflow
        if name not in workflow_groups:
            workflow_groups[name] = {"count": 0, "success": 0, "failure": 0, "durations": []}

        group = workflow_groups[name]
        group["count"] += 1
        if conclusion == "success":
            group["success"] += 1
        elif conclusion == "failure":
            group["failure"] += 1
        group["durations"].append(duration)

        # Deployment frequency approximation
        if "release" in name.lower() or "deploy" in name.lower():
            if conclusion == "success":
                metrics["deployment_frequency"] += 1

    # Final calculations
    if metrics["total_runs"] > 0:
        metrics["avg_duration_seconds"] = metrics["total_duration_seconds"] / metrics["total_runs"]
        metrics["change_failure_rate"] = metrics["failure_count"] / metrics["total_runs"]

    # Per-workflow stats
    for name, group in workflow_groups.items():
        avg_dur = sum(group["durations"]) / group["count"] if group["count"] > 0 else 0
        success_rate = group["success"] / group["count"] if group["count"] > 0 else 0
        metrics["workflow_stats"][name] = {
            "count": group["count"],
            "success_rate": success_rate,
            "avg_duration_seconds": avg_dur
        }

    return metrics

def generate_evidence(metrics: Dict[str, Any], runs: List[Dict[str, Any]], dry_run: bool = False):
    """Generate Evidence Bundle."""
    run_id = os.environ.get("GITHUB_RUN_ID", "local-dev")
    evidence_id = f"EVD-CICD-OBSERVABILITY-{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    # Prepare output paths
    evidence_dir = REPO_ROOT / "evidence" / evidence_id
    if not dry_run:
        evidence_dir.mkdir(parents=True, exist_ok=True)
        paths = writer.init_evidence_bundle(evidence_dir, run_id=run_id)
    else:
        logger.info(f"Dry run: Would create evidence in {evidence_dir}")
        paths = writer.default_paths(evidence_dir)

    # Report Data
    report_data = {
        "evidence_id": evidence_id,
        "summary": "CI/CD Observability Report",
        "run_id": run_id,
        "artifacts": [],
        "environment": {
            "github_server_url": os.environ.get("GITHUB_SERVER_URL", "https://github.com"),
            "github_repository": os.environ.get("GITHUB_REPOSITORY", "unknown/repo")
        },
        "results": [
            {
                "check_id": "dora_metrics",
                "status": "info",
                "details": {
                    "deployment_frequency": metrics["deployment_frequency"],
                    "change_failure_rate": metrics["change_failure_rate"]
                }
            },
            {
                "check_id": "workflow_health",
                "status": "info",
                "details": metrics["workflow_stats"]
            }
        ]
    }

    # Metrics Data (OpenTelemetry mapped where possible)
    # Flattens complex structure for metrics.json
    flat_metrics = {
        "cicd.pipeline.runs.total": metrics["total_runs"],
        "cicd.pipeline.runs.success": metrics["success_count"],
        "cicd.pipeline.runs.failure": metrics["failure_count"],
        "cicd.pipeline.runs.duration.avg": metrics["avg_duration_seconds"],
        "dora.deployment_frequency": metrics["deployment_frequency"],
        "dora.change_failure_rate": metrics["change_failure_rate"]
    }

    # Add per-workflow metrics
    for name, stats in metrics["workflow_stats"].items():
        safe_name = name.replace(" ", "_").lower()
        flat_metrics[f"cicd.pipeline.workflow.{safe_name}.success_rate"] = stats["success_rate"]
        flat_metrics[f"cicd.pipeline.workflow.{safe_name}.duration.avg"] = stats["avg_duration_seconds"]

    metrics_data = {
        "evidence_id": evidence_id,
        "metrics": flat_metrics,
        "run_id": run_id
    }

    if not dry_run:
        writer.write_json(paths.report, report_data)
        writer.write_json(paths.metrics, metrics_data)
        # stamp.json is handled by init_evidence_bundle

        logger.info(f"Evidence generated at {evidence_dir}")
        print(f"::notice::Generated CI/CD Observability Evidence: {evidence_id}")
    else:
        logger.info("Dry run: Report Data preview:")
        print(json.dumps(report_data, indent=2))
        logger.info("Dry run: Metrics Data preview:")
        print(json.dumps(metrics_data, indent=2))

def main():
    parser = argparse.ArgumentParser(description="CI/CD Observability Script")
    parser.add_argument("--dry-run", action="store_true", help="Do not write evidence files")
    parser.add_argument("--days", type=int, default=7, help="Lookback window in days")
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY") # e.g. owner/repo

    if not token or not repo:
        if args.dry_run:
            logger.warning("GITHUB_TOKEN or GITHUB_REPOSITORY missing. Using mock data for dry run.")
            runs = []
            # Mock data
            runs.append({
                "name": "CI",
                "conclusion": "success",
                "created_at": "2023-10-26T10:00:00Z",
                "updated_at": "2023-10-26T10:05:00Z"
            })
            runs.append({
                "name": "Release Ops",
                "conclusion": "failure",
                "created_at": "2023-10-26T11:00:00Z",
                "updated_at": "2023-10-26T11:02:00Z"
            })
            owner, repo_name = "mock_owner", "mock_repo"
        else:
            logger.error("GITHUB_TOKEN and GITHUB_REPOSITORY environment variables are required.")
            sys.exit(1)
    else:
        owner, repo_name = repo.split("/")
        runs = fetch_workflow_runs(owner, repo_name, token, args.days)

    logger.info(f"Fetched {len(runs)} workflow runs.")

    metrics = calculate_metrics(runs)
    generate_evidence(metrics, runs, args.dry_run)

if __name__ == "__main__":
    main()
