"""Structured query planner."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .config import StructuredRagConfig
from .types import QueryPlan, Schema, StructuredQueryRequest


class PlanError(ValueError):
    """Raised when a query plan cannot be compiled safely."""


@dataclass(frozen=True)
class StructuredPlanner:
    """Compiles a constrained QueryPlan.

    Enforces allowlists, mandatory limit, and deterministic ordering.
    """

    config: StructuredRagConfig

    def compile(self, request: StructuredQueryRequest, schema: Schema) -> QueryPlan:
        if not self.config.allowlist.is_table_allowed(request.table):
            raise PlanError(f"Table not allowed: {request.table}")

        table = schema.table(request.table)
        allowed_columns = set(self.config.allowlist.allowed_columns(request.table))
        if not allowed_columns:
            raise PlanError(f"No allowed columns configured for {request.table}")

        select_cols = self._validate_columns(request.select, allowed_columns)
        group_by_cols = self._validate_columns(request.group_by, allowed_columns)
        order_by_cols = self._deterministic_order_by(request, table, allowed_columns)

        filters, params = self._compile_filters(request.filters, allowed_columns)

        if request.aggregations and select_cols:
            missing_group = [col for col in select_cols if col not in group_by_cols]
            if missing_group:
                raise PlanError(
                    "Non-aggregated columns must appear in group_by when aggregations are used"
                )

        sql_select = self._compile_select(select_cols, request.aggregations, allowed_columns)
        sql = f"SELECT {sql_select} FROM {request.table}"
        if filters:
            sql += f" WHERE {filters}"
        if request.aggregations and group_by_cols:
            sql += f" GROUP BY {', '.join(group_by_cols)}"
        if order_by_cols:
            sql += f" ORDER BY {', '.join(order_by_cols)}"
        sql += " LIMIT ?"
        params.append(request.limit)

        return QueryPlan(
            table=request.table,
            select=select_cols,
            filters=request.filters,
            aggregations=request.aggregations,
            group_by=group_by_cols,
            limit=request.limit,
            order_by=order_by_cols,
            sql=sql,
            params=params,
            expect_single=request.expect_single,
        )

    def _validate_columns(self, columns: Sequence[str], allowed: set[str]) -> list[str]:
        invalid = [col for col in columns if col not in allowed]
        if invalid:
            raise PlanError(f"Columns not allowed: {', '.join(invalid)}")
        return list(columns)

    def _deterministic_order_by(
        self,
        request: StructuredQueryRequest,
        table: object,
        allowed: set[str],
    ) -> list[str]:
        if request.order_by:
            return self._validate_columns(request.order_by, allowed)
        if getattr(table, "primary_key", None):
            pk = [col for col in table.primary_key if col in allowed]
            if pk:
                return pk
        return [next(iter(allowed))]

    def _compile_filters(self, filters: dict[str, object], allowed: set[str]) -> tuple[str, list[object]]:
        clauses: list[str] = []
        params: list[object] = []
        for column, value in filters.items():
            if column not in allowed:
                raise PlanError(f"Filter column not allowed: {column}")
            operator = "="
            param = value
            if isinstance(value, tuple) and len(value) == 2:
                operator, param = value
                if operator not in {"=", ">=", "<=", ">", "<"}:
                    raise PlanError(f"Filter operator not allowed: {operator}")
            clauses.append(f"{column} {operator} ?")
            params.append(param)
        return " AND ".join(clauses), params

    def _compile_select(
        self,
        select_cols: Sequence[str],
        aggregations: dict[str, tuple[str, str]],
        allowed: set[str],
    ) -> str:
        columns = list(select_cols)
        for alias, (func, column) in aggregations.items():
            if column not in allowed:
                raise PlanError(f"Aggregation column not allowed: {column}")
            func_upper = func.upper()
            if func_upper not in {"SUM", "COUNT", "AVG", "MIN", "MAX"}:
                raise PlanError(f"Aggregation function not allowed: {func}")
            columns.append(f"{func_upper}({column}) AS {alias}")
        if not columns:
            raise PlanError("No columns selected")
        return ", ".join(columns)
