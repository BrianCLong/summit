"""Execution for structured retrieval."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable

from .types import ExecutionResult, QueryPlan


class ExecutionError(RuntimeError):
    """Raised when execution fails."""


class DisambiguationRequired(ExecutionError):
    """Raised when expected single-result query returns multiple rows."""


class NotFound(ExecutionError):
    """Raised when expected single-result query returns no rows."""


@dataclass(frozen=True)
class StructuredExecutor:
    """Executes a validated QueryPlan against a DB-API connection."""

    connection: object

    def execute(self, plan: QueryPlan) -> ExecutionResult:
        cursor = self.connection.cursor()
        cursor.execute(plan.sql, list(plan.params))
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        cursor.close()

        if plan.expect_single:
            if len(rows) == 0:
                raise NotFound("No rows returned for expected-single query")
            if len(rows) > 1:
                raise DisambiguationRequired("Multiple rows returned for expected-single query")

        bytes_count = sum(
            len(json.dumps(row, sort_keys=True, separators=(",", ":")).encode("utf-8"))
            for row in rows
        )
        return ExecutionResult(rows=rows, row_count=len(rows), bytes=bytes_count)

    def execute_iter(self, plan: QueryPlan) -> Iterable[dict[str, object]]:
        result = self.execute(plan)
        return result.rows
