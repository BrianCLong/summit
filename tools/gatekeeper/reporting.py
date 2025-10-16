"""Reporting utilities for Gatekeeper lint results."""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Sequence
import defusedxml.ElementTree as ET

from .lint import LintIssue


class ConsoleReporter:
    """Render lint issues as a human-friendly console report."""

    def render(self, issues: Sequence[LintIssue], *, checked_files: int, junit_path: Path) -> None:
        if not issues:
            print("Gatekeeper: no issues detected across", checked_files, "policy files.")
            print(f"JUnit report written to {junit_path}")
            return

        print("Gatekeeper lint results:")
        for issue in sorted(issues, key=lambda i: i.sort_key()):
            location = f"{issue.file}:{issue.line}" if issue.line else issue.file
            print(f"  {issue.severity.upper():<7} {location} [{issue.rule}] {issue.message}")

        counts = Counter(issue.severity for issue in issues)
        total = len(issues)
        summary_parts = [f"{total} issues"] + [f"{count} {severity}" for severity, count in counts.items()]
        print("Summary:", ", ".join(summary_parts))
        print(f"JUnit report written to {junit_path}")


class JunitReporter:
    """Persist lint issues in JUnit XML format for CI consumption."""

    def write(self, issues: Sequence[LintIssue], *, output: Path) -> None:
        testsuite = ET.Element("testsuite", name="gatekeeper", tests=str(len(issues) or 1))

        if issues:
            testsuite.set("failures", str(len(issues)))
            for issue in issues:
                testcase = ET.SubElement(
                    testsuite,
                    "testcase",
                    classname=issue.file,
                    name=issue.rule,
                )
                failure = ET.SubElement(
                    testcase,
                    "failure",
                    message=issue.message,
                    type=issue.severity,
                )
                failure.text = issue.message
        else:
            ET.SubElement(
                testsuite,
                "testcase",
                classname="gatekeeper",
                name="lint",
            )

        tree = ET.ElementTree(testsuite)
        output.parent.mkdir(parents=True, exist_ok=True)
        tree.write(output, encoding="utf-8", xml_declaration=True)


__all__ = ["ConsoleReporter", "JunitReporter"]
