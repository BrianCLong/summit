"""Postgres-specific lint rules for MigrateVet."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from .models import FileContext, Issue, Statement


@dataclass(frozen=True)
class Rule:
    code: str
    message: str
    hint: str


FULL_TABLE_REWRITE = Rule(
    code="MIGRATEVET001",
    message="ALTER COLUMN TYPE rewrites the entire table.",
    hint="Perform the rewrite in a batched migration or use a USING clause with a shadow table.",
)

DROP_COLUMN_GUARD = Rule(
    code="MIGRATEVET002",
    message="DROP COLUMN without IF EXISTS can fail on repeated deploys.",
    hint="Add IF EXISTS to the DROP COLUMN clause to make it idempotent.",
)

ALTER_TYPE_GUARD = Rule(
    code="MIGRATEVET003",
    message="ALTER TYPE operations require special handling to avoid blocking.",
    hint="Prefer ADD VALUE IF NOT EXISTS or create a new type and migrate data incrementally.",
)

INDEX_CONCURRENTLY = Rule(
    code="MIGRATEVET004",
    message="CREATE INDEX without CONCURRENTLY can lock writes for long periods.",
    hint="Use CREATE INDEX CONCURRENTLY (or drop/recreate concurrently) to avoid blocking writes.",
)


def evaluate(statements: Iterable[Statement], context: FileContext) -> List[Issue]:
    """Run postgres rules for the given statements."""
    issues: List[Issue] = []
    for stmt in statements:
        issues.extend(_check_statement(stmt, context))
    return issues


def _check_statement(stmt: Statement, context: FileContext) -> List[Issue]:
    upper = stmt.upper
    stripped_upper = upper.strip()
    issues: List[Issue] = []

    if "ALTER TABLE" in upper and "ALTER COLUMN" in upper:
        if " TYPE" in upper or " SET DATA TYPE" in upper:
            idx = upper.find("ALTER COLUMN")
            issues.append(_make_issue(context, stmt, idx if idx != -1 else 0, FULL_TABLE_REWRITE))

    if "ALTER TABLE" in upper and "DROP COLUMN" in upper:
        drop_idx = upper.find("DROP COLUMN")
        if drop_idx != -1:
            guard_segment = upper[drop_idx : drop_idx + 80]
            if "DROP COLUMN IF EXISTS" not in guard_segment:
                issues.append(_make_issue(context, stmt, drop_idx, DROP_COLUMN_GUARD))

    if "ALTER TYPE" in upper:
        idx = upper.find("ALTER TYPE")
        guard_segment = upper[idx : idx + 120] if idx != -1 else upper
        if "ADD VALUE IF NOT EXISTS" in guard_segment:
            pass
        else:
            issues.append(_make_issue(context, stmt, idx if idx != -1 else 0, ALTER_TYPE_GUARD))

    # CREATE INDEX checks.
    leading = stripped_upper
    if leading.startswith("CREATE INDEX") or leading.startswith("CREATE UNIQUE INDEX"):
        if "CONCURRENTLY" not in upper:
            idx = upper.find("CREATE")
            issues.append(_make_issue(context, stmt, idx if idx != -1 else 0, INDEX_CONCURRENTLY))

    return issues


def _make_issue(context: FileContext, stmt: Statement, relative_offset: int, rule: Rule) -> Issue:
    offset = stmt.start + max(relative_offset, 0)
    line = context.line_for_offset(offset)
    return Issue(file_path=context.path, line=line, code=rule.code, message=rule.message, hint=rule.hint)
