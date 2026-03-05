from __future__ import annotations

import sqlite3
from typing import Any

_DANGEROUS = {"drop", "alter", "truncate"}


def _split_statements(payload: str) -> list[str]:
    return [chunk.strip() for chunk in payload.split(";") if chunk.strip()]


def validate_sql_structure(payload: str, contract: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    contract = contract or {}
    statements = _split_statements(payload)
    findings: list[dict[str, Any]] = []

    if not statements:
        return [
            {
                "rule": "sql.parseable",
                "severity": "fail",
                "message": "No SQL statements found",
                "meta": {},
            }
        ]

    allow_multi = bool(contract.get("allow_multi_statement", False))
    findings.append(
        {
            "rule": "sql.single_statement",
            "severity": "info" if allow_multi or len(statements) == 1 else "fail",
            "message": "Statement count allowed" if allow_multi or len(statements) == 1 else "Multiple statements blocked",
            "meta": {"statement_count": len(statements)},
        }
    )

    allow_dangerous = bool(contract.get("allow_dangerous", False))
    blocked = [stmt.split()[0].lower() for stmt in statements if stmt and stmt.split()[0].lower() in _DANGEROUS]
    findings.append(
        {
            "rule": "sql.dangerous_statement",
            "severity": "info" if allow_dangerous or not blocked else "fail",
            "message": "Dangerous statement policy satisfied" if allow_dangerous or not blocked else "Dangerous statements blocked",
            "meta": {"blocked": sorted(blocked)},
        }
    )

    con = sqlite3.connect(":memory:")
    try:
        for statement in statements:
            try:
                con.execute(f"EXPLAIN {statement}")
            except sqlite3.Error as error:
                findings.append(
                    {
                        "rule": "sql.parseable",
                        "severity": "fail",
                        "message": f"SQL parse failure: {error}",
                        "meta": {},
                    }
                )
                break
        else:
            findings.append(
                {
                    "rule": "sql.parseable",
                    "severity": "info",
                    "message": "SQL statements parsed successfully",
                    "meta": {"statement_count": len(statements)},
                }
            )
    finally:
        con.close()

    return findings
