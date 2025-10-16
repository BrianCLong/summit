"""CI gate helpers for SCBA."""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

from .runner import AuditFinding, SideChannelBudgetAuditor


def gate(findings: Iterable[AuditFinding], output: Path | None = None) -> int:
    """Persist findings and return an appropriate exit code."""

    data = SideChannelBudgetAuditor.summarize(findings)
    if output:
        output.write_text(data)
    failed = [finding for finding in findings if not finding.passed]
    return 1 if failed else 0
