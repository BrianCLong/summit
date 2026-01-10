#!/usr/bin/env python3
"""Audit open issues to assign severity, owners, and SLA targets."""

from __future__ import annotations

import json
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

SEVERITY_KEYWORDS = {
    "sev1_data_loss": re.compile(r"data loss|corrupt|corruption", re.IGNORECASE),
    "sev1_crash_start": re.compile(r"crash[\w\s]*(start|startup|boot)", re.IGNORECASE),
    "sev2_crash": re.compile(r"crash|panic|segfault", re.IGNORECASE),
    "sev2_inconsistency": re.compile(r"data inconsisten|data drift|500\\b", re.IGNORECASE),
}

AREA_OWNER_MAP = {
    "area:backend": ["@intelgraph-core", "@intelgraph-ci"],
    "area:frontend": ["@intelgraph-core"],
    "area:devops/ci": ["@intelgraph-core"],
    "area:security": ["@intelgraph-core"],
}

BUG_LABEL_PATTERN = re.compile(r"bug", re.IGNORECASE)


@dataclass
class IssueAssessment:
    number: int
    title: str
    html_url: str
    labels: list[str]
    severity: str | None
    sla_label: str | None
    owners: list[str]
    runbook: str | None
    blockers: list[str] = field(default_factory=list)


def load_issues(path: Path) -> list[dict]:
    data = json.loads(path.read_text())
    if not isinstance(data, list):
        raise ValueError("Expected JSON array of issues")
    return data


def is_bug_issue(issue: dict) -> bool:
    return any(BUG_LABEL_PATTERN.search(label.get("name", "")) for label in issue.get("labels", []))


def infer_severity(text: str) -> str | None:
    if SEVERITY_KEYWORDS["sev1_data_loss"].search(text):
        return "SEV-1"
    if SEVERITY_KEYWORDS["sev1_crash_start"].search(text):
        return "SEV-1"
    if SEVERITY_KEYWORDS["sev2_crash"].search(text):
        return "SEV-2"
    if SEVERITY_KEYWORDS["sev2_inconsistency"].search(text):
        return "SEV-2"
    return None


def sla_for_severity(severity: str | None) -> str | None:
    if severity == "SEV-1":
        return "SLA-24h"
    if severity == "SEV-2":
        return "SLA-72h"
    return None


def owners_for_issue(labels: Iterable[str]) -> list[str]:
    for label in labels:
        owners = AREA_OWNER_MAP.get(label.lower())
        if owners:
            return owners
    return ["@intelgraph-core"]


def runbook_for_issue(severity: str | None) -> str | None:
    if severity == "SEV-1":
        return "RUNBOOKS/INCIDENT_RESPONSE_PLAYBOOK.md"
    return None


def assess_issue(issue: dict) -> IssueAssessment:
    labels = [label.get("name", "") for label in issue.get("labels", [])]
    text = f"{issue.get('title', '')}\n{issue.get('body', '')}"
    severity = infer_severity(text)
    sla_label = sla_for_severity(severity)
    owners = owners_for_issue(labels)
    runbook = runbook_for_issue(severity)
    blockers = []
    if severity and severity not in labels:
        blockers.append(f"Add {severity} label")
    if sla_label and sla_label not in labels:
        blockers.append(f"Add {sla_label} label")
    incident_labels = [
        label for label in labels if "incident" in label.lower() or "postmortem" in label.lower()
    ]
    if severity and not incident_labels:
        blockers.append("Confirm and tag incident/postmortem linkage")
    if runbook:
        blockers.append("Page/escalate listed owners per runbook")
    if not blockers:
        blockers.append("Review for severity assignment (no crash/data-loss keywords detected)")
    return IssueAssessment(
        number=issue["number"],
        title=issue.get("title", ""),
        html_url=issue.get("html_url", ""),
        labels=labels,
        severity=severity,
        sla_label=sla_label,
        owners=owners,
        runbook=runbook,
        blockers=blockers,
    )


def summarize(assessments: list[IssueAssessment]) -> str:
    now = datetime.now(UTC)
    sev_counts = {"SEV-1": 0, "SEV-2": 0}
    for assessment in assessments:
        if assessment.severity in sev_counts:
            sev_counts[assessment.severity] += 1

    lines = ["# High-Impact Issue Audit", "", "## Summary", ""]
    lines.append(f"- SEV-1: {sev_counts['SEV-1']}")
    lines.append(f"- SEV-2: {sev_counts['SEV-2']}")
    lines.append("")

    lines.append("## Label and Ownership Actions")
    lines.append("- Create labels `SEV-1`, `SEV-2`, `SLA-24h`, and `SLA-72h` if they do not exist.")
    lines.append("")

    lines.append("## Issues")
    if not assessments:
        lines.append("No open issues labeled bug matched the audit criteria.")
    else:
        for assessment in assessments:
            lines.append(f"- **#{assessment.number} — {assessment.title}** ({assessment.html_url})")
            lines.append(f"  - Labels: {', '.join(assessment.labels) or 'none'}")
            sev_text = assessment.severity or "Unassigned"
            lines.append(f"  - Severity: {sev_text}")
            sla_text = assessment.sla_label or "N/A"
            lines.append(f"  - SLA: {sla_text}")
            lines.append(f"  - Owners: {', '.join(assessment.owners)}")
            if assessment.runbook:
                lines.append(f"  - Runbook: {assessment.runbook}")
                deadline = now + (
                    timedelta(hours=24) if assessment.severity == "SEV-1" else timedelta(hours=72)
                )
                lines.append(f"  - Page/escalate by: {deadline.isoformat()}")
            blockers = assessment.blockers or ["No outstanding actions detected."]
            lines.append(f"  - Blockers: {'; '.join(blockers)}")
            lines.append("")

    return "\n".join(lines)


def main() -> None:
    issues_path = Path("tmp/issues_open.json")
    issues = load_issues(issues_path)
    bug_issues = [issue for issue in issues if is_bug_issue(issue)]
    assessments = [assess_issue(issue) for issue in bug_issues]
    report = summarize(assessments)
    output_path = Path("ops/issue-audit/high-impact.md")
    output_path.write_text(report)


if __name__ == "__main__":
    main()
