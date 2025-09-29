#!/usr/bin/env python3
"""
Create roadmap GitHub issues programmatically.

Features
- Dry-run mode (no API calls)
- Duplicate title checks (idempotent)
- Optional common labels, assignee, milestone
- Optional title prefix (e.g., "Roadmap: ")
- Supports GitHub Enterprise via GITHUB_API_URL

Environment variables
- GITHUB_TOKEN (required)
- REPO_OWNER (required)
- REPO_NAME (required)
- GITHUB_API_URL (optional, defaults to https://api.github.com)

Usage
  python scripts/create_roadmap_issues.py --dry-run
  python scripts/create_roadmap_issues.py --label Roadmap --prefix "Roadmap: "

Note: Token needs "repo" scope to create issues.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests


def getenv_required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Error: Set {name} as an environment variable.")
    return value


def build_default_issues() -> list[dict[str, str]]:
    return [
        # Phase 1
        {
            "title": "Entity CRUD APIs",
            "body": "Finalize GraphQL and REST endpoints for entity CRUD.",
        },
        {
            "title": "Graph Visualization Finalization",
            "body": "Ensure Cytoscape.js graph is interactive and stable.",
        },
        {
            "title": "Real-Time Collaboration",
            "body": "Integrate WebSocket (Socket.IO) for real-time graph syncing.",
        },
        {
            "title": "Initial NLP Tagging",
            "body": "Add LLM-based NLP tagging to parse documents (e.g., PDF, TXT).",
        },
        {
            "title": "Docker Dev Orchestration",
            "body": "Merge Docker Compose configs into unified setup with `.env`.",
        },
        # Phase 2
        {"title": "Export Graph Data", "body": "Enable graph export to CSV, JSON, and PDF."},
        {
            "title": "Activity Logs & Audit Trail",
            "body": "Track edits, views, and tagging changes in logs.",
        },
        {
            "title": "RBAC with JWT",
            "body": "Implement role-based access control (admin/editor/viewer) via JWT.",
        },
        {
            "title": "CI/CD Setup",
            "body": "Configure GitHub Actions for linting, testing, and deployment.",
        },
        {
            "title": "Monitoring Setup",
            "body": "Add Prometheus + Grafana for backend and Neo4j metrics.",
        },
        # Phase 3
        {
            "title": "GNN Link Prediction",
            "body": "Prototype GNN for predictive entity relation suggestions.",
        },
        {
            "title": "Insight Generation via LLM",
            "body": "Generate natural-language insights from graph data.",
        },
        {
            "title": "Collaborative Annotations",
            "body": "Add ability to share comments/annotations on graph nodes/edges.",
        },
        {
            "title": "Graph Timeline Playback",
            "body": "Allow playback view of investigation history.",
        },
        {
            "title": "Active Learning Loop",
            "body": "Capture user feedback on AI suggestions for model improvement.",
        },
    ]


def build_issues() -> list[dict[str, str]]:
    issues: list[dict[str, str]] = []
    telemetry_path = Path("analytics/roadmap_signals.json")
    if telemetry_path.exists():
        try:
            telemetry = json.loads(telemetry_path.read_text())
            for item in telemetry.get("top_needs", []):
                issues.append(
                    {
                        "title": item.get("title", "").strip(),
                        "body": item.get("detail", ""),
                    }
                )
        except json.JSONDecodeError:
            print("Warning: invalid telemetry file; falling back to defaults")

    threat_feed: dict[str, str] = {}
    threat_url = os.getenv("THREAT_FEED_URL")
    if threat_url:
        try:
            resp = requests.get(threat_url, timeout=5)
            if resp.ok:
                threat_feed = resp.json()
        except Exception as e:  # pragma: no cover - network failures
            print(f"Warning: threat feed unavailable: {e}")
    else:
        threat_path = Path("analytics/threat_feed.json")
        if threat_path.exists():
            try:
                threat_feed = json.loads(threat_path.read_text())
            except json.JSONDecodeError:
                pass

    if threat_feed.get("level") == "high":
        issues.append(
            {
                "title": "Elevated Threat Response",
                "body": "Increase monitoring and patch vulnerable services.",
            }
        )

    if not issues:
        issues = build_default_issues()

    return issues


def get_existing_issue_titles(api_url: str, headers: dict[str, str]) -> set[str]:
    titles: set[str] = set()
    # Fetch both open and closed to avoid duplicates in any state
    params = {"state": "all", "per_page": 100, "page": 1}
    while True:
        resp = requests.get(api_url, headers=headers, params=params)
        if resp.status_code != 200:
            raise SystemExit(f"Failed to list issues: {resp.status_code} {resp.text}")
        data = resp.json() or []
        if not data:
            break
        for issue in data:
            # Skip pull requests; they show up in the issues API
            if "pull_request" in issue:
                continue
            title = issue.get("title")
            if title:
                titles.add(title.strip())
        # Paging: stop if less than requested
        if len(data) < params["per_page"]:
            break
        params["page"] += 1
    return titles


def ensure_labels(
    repo_base_url: str, headers: dict[str, str], labels: list[str], dry_run: bool
) -> None:
    if not labels:
        return
    if dry_run:
        return
    # Try to create labels if they do not exist
    # If they already exist, GitHub returns 422; we can ignore
    for label in labels:
        payload = {"name": label}
        r = requests.post(f"{repo_base_url}/labels", headers=headers, json=payload)
        if r.status_code in (201, 422):
            continue
        # Non-fatal; print and continue
        print(f"Warning: unable to ensure label '{label}': {r.status_code} {r.text}")


def create_issue(
    issues_url: str,
    headers: dict[str, str],
    title: str,
    body: str,
    labels: list[str] | None = None,
    assignees: list[str] | None = None,
    milestone: int | None = None,
    dry_run: bool = False,
) -> bool:
    payload: dict[str, object] = {"title": title, "body": body}
    if labels:
        payload["labels"] = labels
    if assignees:
        payload["assignees"] = assignees
    if milestone is not None:
        payload["milestone"] = milestone

    if dry_run:
        print(f"[DRY-RUN] Would create: {title}")
        return True

    resp = requests.post(issues_url, headers=headers, json=payload)
    if resp.status_code == 201:
        print(f"Created issue: {title}")
        return True
    print(f"Failed to create '{title}': {resp.status_code}\n{resp.text}")
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Create roadmap GitHub issues")
    parser.add_argument("--dry-run", action="store_true", help="Print actions, do not call API")
    parser.add_argument("--label", action="append", default=[], help="Label to add (repeatable)")
    parser.add_argument(
        "--assignee", action="append", default=[], help="Assignee username (repeatable)"
    )
    parser.add_argument("--milestone", type=int, default=None, help="Milestone number to assign")
    parser.add_argument(
        "--prefix",
        type=str,
        default="",
        help="Prefix to add to each issue title (e.g., 'Roadmap: ')",
    )
    args = parser.parse_args()

    token = getenv_required("GITHUB_TOKEN")
    owner = getenv_required("REPO_OWNER")
    repo = getenv_required("REPO_NAME")
    api_root = os.getenv("GITHUB_API_URL", "https://api.github.com").rstrip("/")

    repo_base_url = f"{api_root}/repos/{owner}/{repo}"
    issues_url = f"{repo_base_url}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "create-roadmap-issues-script",
    }

    try:
        existing_titles = (
            get_existing_issue_titles(issues_url, headers) if not args.dry_run else set()
        )
    except SystemExit as e:
        print(e)
        sys.exit(1)

    # Optionally ensure labels exist when not dry-run
    ensure_labels(repo_base_url, headers, args.label, args.dry_run)

    issues = build_issues()
    created = 0
    skipped = 0

    for issue in issues:
        base_title = issue["title"].strip()
        title = f"{args.prefix}{base_title}" if args.prefix else base_title
        if not args.dry_run and title in existing_titles:
            print(f"Skipping duplicate (exists): {title}")
            skipped += 1
            continue
        ok = create_issue(
            issues_url,
            headers,
            title,
            issue.get("body", ""),
            labels=args.label or None,
            assignees=args.assignee or None,
            milestone=args.milestone,
            dry_run=args.dry_run,
        )
        if ok:
            created += 1

    print(f"Done. Created: {created} | Skipped: {skipped}")


if __name__ == "__main__":
    main()
