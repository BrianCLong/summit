"""Report rendering helpers."""

from __future__ import annotations

from typing import Iterable

from .scanner import Finding, ScanResult


def render_markdown(result: ScanResult) -> str:
    lines: list[str] = []
    lines.append("# SecretSentry Report")
    lines.append("")
    lines.append(f"*Scanned files*: {result.scanned_files}")
    lines.append(f"*Findings*: {len(result.findings)}")
    lines.append("")
    if not result.findings:
        lines.append("✅ No secrets detected.")
        return "\n".join(lines)

    lines.append("| Severity | Rule | File | Line | Redacted Match |")
    lines.append("| --- | --- | --- | --- | --- |")
    for finding in result.findings:
        lines.append(
            "| {severity} | {rule} | {file} | {line} | {match} |".format(
                severity=finding.severity,
                rule=finding.rule,
                file=finding.file,
                line=finding.line,
                match=finding.redacted,
            )
        )
    return "\n".join(lines)


def redact_findings(findings: Iterable[Finding]) -> list[dict[str, str | int]]:
    payload: list[dict[str, str | int]] = []
    for finding in findings:
        payload.append(
            {
                "rule": finding.rule,
                "description": finding.description,
                "severity": finding.severity,
                "file": finding.file,
                "line": finding.line,
                "redacted": finding.redacted,
            }
        )
    return payload
