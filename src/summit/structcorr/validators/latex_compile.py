from __future__ import annotations

from typing import Any


_BLOCKED_PATTERNS = ["\\write18", "\\input", "\\include", "\\openout", "\\read"]


def validate_latex_sandbox(payload: str, contract: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    contract = contract or {}
    max_chars = int(contract.get("max_chars", 10000))
    findings: list[dict[str, Any]] = []

    findings.append(
        {
            "rule": "latex.length_cap",
            "severity": "info" if len(payload) <= max_chars else "fail",
            "message": "LaTeX length within cap" if len(payload) <= max_chars else "LaTeX payload exceeds cap",
            "meta": {"max_chars": max_chars, "actual_chars": len(payload)},
        }
    )

    blocked = [pattern for pattern in _BLOCKED_PATTERNS if pattern in payload]
    findings.append(
        {
            "rule": "latex.safe_mode",
            "severity": "fail" if blocked else "info",
            "message": "Blocked LaTeX primitives detected" if blocked else "Safe mode checks passed",
            "meta": {"blocked_patterns": blocked},
        }
    )

    brace_balance = payload.count("{") == payload.count("}")
    findings.append(
        {
            "rule": "latex.syntax_brace_balance",
            "severity": "info" if brace_balance else "fail",
            "message": "Brace balance valid" if brace_balance else "Brace mismatch detected",
            "meta": {},
        }
    )

    return findings
