#!/usr/bin/env python3
"""
Export GitHub branch protection and rulesets to JSON for audit artifacts.
Requires GH_TOKEN with repo admin:read permissions.
"""

import json
import os
from pathlib import Path

import requests

REPO = os.environ.get("GITHUB_REPOSITORY")
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
API_ROOT = os.environ.get("GITHUB_API_URL", "https://api.github.com")
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "artifacts"))

if not REPO:
    raise SystemExit("GITHUB_REPOSITORY not set")
if not TOKEN:
    raise SystemExit("GH_TOKEN or GITHUB_TOKEN is required")

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

owner, repo = REPO.split("/")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def fetch(url: str):
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()


branch_protection_url = f"{API_ROOT}/repos/{owner}/{repo}/branches/main/protection"
release_rules_url = f"{API_ROOT}/repos/{owner}/{repo}/rulesets"

artifacts = {}

try:
    artifacts["main_branch_protection"] = fetch(branch_protection_url)
except Exception as exc:
    artifacts["main_branch_protection_error"] = str(exc)

try:
    artifacts["rulesets"] = fetch(release_rules_url)
except Exception as exc:
    artifacts["rulesets_error"] = str(exc)

output_file = OUTPUT_DIR / "branch-protection.json"
output_file.write_text(json.dumps(artifacts, indent=2))
print(f"Exported audit artifacts to {output_file}")
