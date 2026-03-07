#!/usr/bin/env python3
"""Generate Golden Main GA Merge Orchestrator STEP 0 inventory outputs.

This script executes the required STEP 0 GitHub commands when runtime prerequisites
are present. If prerequisites are missing, it emits a deterministic blocked-run
report with explicit stabilize actions.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class CmdResult:
    cmd: list[str]
    code: int
    stdout: str
    stderr: str


def run(cmd: list[str]) -> CmdResult:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return CmdResult(cmd=cmd, code=proc.returncode, stdout=proc.stdout.strip(), stderr=proc.stderr.strip())


def format_cmd(cmd: list[str]) -> str:
    return " ".join(cmd)


def summarize_checks(rollup: list[dict[str, Any]] | None) -> str:
    if not rollup:
        return "No checks reported"
    total = len(rollup)
    success = sum(1 for c in rollup if c.get("conclusion") == "SUCCESS")
    failed = sum(1 for c in rollup if c.get("conclusion") in {"FAILURE", "TIMED_OUT", "CANCELLED"})
    pending = total - success - failed
    return f"{success}✅/{failed}❌/{pending}⏳ ({total} total)"


def bucket(files: list[dict[str, Any]] | None, labels: list[dict[str, Any]] | None, title: str) -> str:
    names = {l.get("name", "").lower() for l in (labels or [])}
    paths = [f.get("path", "") for f in (files or [])]
    lower_title = title.lower()
    if any(x in names for x in ["ci", "infra", "build", "devops"]) or any(
        p.startswith((".github/", "infra/", "k8s/", "helm/", "terraform/")) for p in paths
    ):
        return "CI/Infra"
    if any(x in names for x in ["schema", "db", "migration", "validation"]) or any(
        "migration" in p.lower() or "schema" in p.lower() for p in paths
    ):
        return "Schema/Validation"
    if any(x in names for x in ["frontend", "ui", "web"]) or any(p.startswith(("apps/web/", "client/")) for p in paths):
        return "Frontend"
    if any(x in names for x in ["docs", "documentation"]) or all(p.startswith("docs/") for p in paths if p):
        return "Docs/Non-prod"
    if any(x in lower_title for x in ["doc", "readme", "changelog"]):
        return "Docs/Non-prod"
    return "Backend"


def risk_score(changed_files: int, additions: int, deletions: int, files: list[dict[str, Any]] | None) -> str:
    paths = [f.get("path", "").lower() for f in (files or [])]
    schema_touch = any("migration" in p or "schema" in p for p in paths)
    lock_touch = any(p.endswith(("pnpm-lock.yaml", "package-lock.json", "yarn.lock", "cargo.lock")) for p in paths)
    blast = changed_files >= 25 or (additions + deletions) >= 2000
    if schema_touch or lock_touch or blast:
        return "High"
    if changed_files >= 10 or (additions + deletions) >= 500:
        return "Med"
    return "Low"


def determine_merge_method(pr: dict[str, Any]) -> str:
    return "squash"


def blocked_report(results: list[CmdResult], output: Path) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    lines = [
        "# Golden Main GA Merge Orchestrator — STEP 0 Report",
        "",
        f"Generated: `{ts}`",
        "",
        "## STEP 0 Command Evidence",
        "",
    ]
    for idx, r in enumerate(results, start=1):
        lines.append(f"{idx}. `{format_cmd(r.cmd)}`")
        lines.append(f"   - Exit: `{r.code}`")
        if r.stdout:
            lines.append(f"   - STDOUT: `{r.stdout[:240]}`")
        if r.stderr:
            lines.append(f"   - STDERR: `{r.stderr[:240]}`")
    lines.extend(
        [
            "",
            "## OUTPUT A — PR INVENTORY",
            "",
            "| # | Title | Draft | Mergeable | Checks(summary) | ReviewDecision | Files | +/- | Labels | Updated | Bucket | Risk |",
            "|---|---|---|---|---|---|---:|---:|---|---|---|---|",
            "| N/A | Blocked: runtime prerequisites missing for GitHub inventory commands. | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | CI/Infra | High |",
            "",
            "## OUTPUT B — MERGE TRAIN (top 15, ordered)",
            "",
            "1. `Stabilize: GitHub PR orchestration runtime access` → CI/Infra → unblock `gh`, auth, and origin visibility → expected conflicts: none → required checks: tooling/bootstrap gate → merge method: squash.",
            "",
            "## OUTPUT C — CYCLE REPORT",
            "",
            "- Merged: none.",
            "- Blocked: runtime does not satisfy orchestration prerequisites.",
            "- Golden status: Yellow (intentionally constrained pending runtime bootstrap).",
        ]
    )
    output.write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate STEP 0 PR inventory/merge train report.")
    parser.add_argument("--output", default="docs/roadmap/GA_MERGE_ORCHESTRATOR_LIVE_REPORT.md")
    args = parser.parse_args()
    output = Path(args.output)

    prechecks = [
        run(["bash", "-lc", "command -v gh"]),
        run(["git", "remote", "get-url", "origin"]),
    ]

    if shutil.which("gh"):
        prechecks.append(run(["gh", "auth", "status"]))

    blocked = any(r.code != 0 for r in prechecks)
    if blocked:
        blocked_report(prechecks, output)
        print(f"Blocked report written to {output}")
        return 0

    repo = run(["gh", "repo", "view", "--json", "nameWithOwner,defaultBranchRef"])
    pr_list = run(
        [
            "gh",
            "pr",
            "list",
            "--state",
            "open",
            "--limit",
            "200",
            "--json",
            "number,title,headRefName,baseRefName,updatedAt,isDraft,mergeable,labels,author,additions,deletions,changedFiles",
        ]
    )
    checks = run([
        "gh",
        "api",
        "repos/:owner/:repo/branches/main/protection",
        "--jq",
        ".required_status_checks.contexts",
    ])

    if any(r.code != 0 for r in [repo, pr_list, checks]):
        blocked_report(prechecks + [repo, pr_list, checks], output)
        print(f"Blocked report written to {output}")
        return 0

    repo_json = json.loads(repo.stdout)
    prs = json.loads(pr_list.stdout)

    top30 = sorted(prs, key=lambda p: p.get("updatedAt", ""), reverse=True)[:30]
    detailed: dict[int, dict[str, Any]] = {}
    for pr in top30:
        num = pr["number"]
        detail = run(
            [
                "gh",
                "pr",
                "view",
                str(num),
                "--json",
                "number,title,url,statusCheckRollup,reviewDecision,files,commits,labels,baseRefName,headRefName",
            ]
        )
        if detail.code == 0:
            detailed[num] = json.loads(detail.stdout)

    rows = []
    for pr in sorted(prs, key=lambda p: p.get("updatedAt", ""), reverse=True):
        d = detailed.get(pr["number"], {})
        pr_files = d.get("files", [])
        b = bucket(pr_files, pr.get("labels"), pr.get("title", ""))
        risk = risk_score(pr.get("changedFiles", 0), pr.get("additions", 0), pr.get("deletions", 0), pr_files)
        lbl = ",".join(l.get("name", "") for l in pr.get("labels", [])) or "-"
        checks_summary = summarize_checks(d.get("statusCheckRollup"))
        rows.append(
            {
                "n": pr["number"],
                "title": pr.get("title", "").replace("|", "\\|"),
                "draft": "Yes" if pr.get("isDraft") else "No",
                "mergeable": pr.get("mergeable", "UNKNOWN"),
                "checks": checks_summary,
                "review": d.get("reviewDecision") or "-",
                "files": pr.get("changedFiles", 0),
                "pm": f"+{pr.get('additions', 0)}/-{pr.get('deletions', 0)}",
                "labels": lbl.replace("|", "\\|"),
                "updated": pr.get("updatedAt", "-"),
                "bucket": b,
                "risk": risk,
                "expected_conflicts": "Schema/migration drift" if b == "Schema/Validation" else "Low",
                "required_checks": "; ".join(json.loads(checks.stdout)) if checks.stdout.startswith("[") else "main protection checks",
                "method": determine_merge_method(pr),
            }
        )

    top15 = rows[:15]

    out = [
        "# Golden Main GA Merge Orchestrator — STEP 0 Live Report",
        "",
        f"Repository: `{repo_json.get('nameWithOwner', 'unknown')}`",
        f"Default branch: `{repo_json.get('defaultBranchRef', {}).get('name', 'unknown')}`",
        "",
        "## OUTPUT A — PR INVENTORY",
        "",
        "| # | Title | Draft | Mergeable | Checks(summary) | ReviewDecision | Files | +/- | Labels | Updated | Bucket | Risk |",
        "|---|---|---|---|---|---|---:|---:|---|---|---|---|",
    ]
    for r in rows:
        out.append(
            f"| {r['n']} | {r['title']} | {r['draft']} | {r['mergeable']} | {r['checks']} | {r['review']} | {r['files']} | {r['pm']} | {r['labels']} | {r['updated']} | {r['bucket']} | {r['risk']} |"
        )

    out.extend(["", "## OUTPUT B — MERGE TRAIN (top 15, ordered)", ""])
    for r in top15:
        out.append(
            f"- PR#{r['n']} → {r['bucket']} → why next: high recency + bucket sequencing → expected conflicts: {r['expected_conflicts']} → required checks: {r['required_checks']} → merge method: {r['method']}"
        )

    out.extend(["", "## OUTPUT C — CYCLE REPORT", "", "- Pending execution: run merge loop starting from PR#1 in merge train."])
    output.write_text("\n".join(out) + "\n")
    print(f"Live report written to {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
