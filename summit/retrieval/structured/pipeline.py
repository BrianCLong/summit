"""Structured retrieval pipeline orchestration."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from summit.evidence.structured.writer import StructuredEvidenceWriter

from .config import StructuredRagConfig
from .executor import StructuredExecutor
from .planner import StructuredPlanner
from .policy import StructuredPolicy
from .schema_introspect import SchemaIntrospector
from .types import ExecutionResult, PolicyDecision, QueryPlan, StructuredQueryRequest


class PolicyViolation(RuntimeError):
    """Raised when a query plan fails policy validation."""


@dataclass(frozen=True)
class StructuredRetrievalPipeline:
    config: StructuredRagConfig
    connection: object

    def run(self, request: StructuredQueryRequest) -> tuple[ExecutionResult, QueryPlan, str]:
        run_id = uuid.uuid4().hex
        schema = SchemaIntrospector(self.connection).introspect()

        planner = StructuredPlanner(self.config)
        policy = StructuredPolicy(self.config)
        executor = StructuredExecutor(self.connection)

        plan_start = time.perf_counter()
        plan = planner.compile(request, schema)
        planner_ms = int((time.perf_counter() - plan_start) * 1000)

        policy_decision = policy.validate(plan)
        if not policy_decision.allowed:
            self._write_evidence(
                run_id=run_id,
                plan=plan,
                result=None,
                policy=policy_decision,
                planner_ms=planner_ms,
                db_ms=0,
            )
            raise PolicyViolation("; ".join(policy_decision.reasons))

        exec_start = time.perf_counter()
        result = executor.execute(plan)
        db_ms = int((time.perf_counter() - exec_start) * 1000)

        if result.bytes > self.config.budgets.max_bytes:
            violation = PolicyDecision(
                allowed=False,
                reasons=["Result exceeds max_bytes budget"],
            )
            self._write_evidence(
                run_id=run_id,
                plan=plan,
                result=result,
                policy=violation,
                planner_ms=planner_ms,
                db_ms=db_ms,
            )
            raise PolicyViolation("Result exceeds max_bytes budget")

        self._write_evidence(
            run_id=run_id,
            plan=plan,
            result=result,
            policy=policy_decision,
            planner_ms=planner_ms,
            db_ms=db_ms,
        )
        return result, plan, run_id

    def _write_evidence(
        self,
        *,
        run_id: str,
        plan: QueryPlan,
        result: ExecutionResult | None,
        policy: PolicyDecision,
        planner_ms: int,
        db_ms: int,
    ) -> None:
        root = Path(self.config.evidence_root) / run_id
        writer = StructuredEvidenceWriter(root=root)
        rows = result.rows if result else []
        row_count = result.row_count if result else 0
        bytes_count = result.bytes if result else 0
        writer.write(
            run_id=run_id,
            item_slug=self.config.item_slug,
            query_plan={
                "table": plan.table,
                "select": list(plan.select),
                "filters": dict(plan.filters),
                "aggregations": dict(plan.aggregations),
                "group_by": list(plan.group_by),
                "limit": plan.limit,
                "order_by": list(plan.order_by),
                "sql": plan.sql,
                "params": list(plan.params),
            },
            metrics={
                "planner_ms": planner_ms,
                "db_ms": db_ms,
                "rows": row_count,
                "bytes": bytes_count,
            },
            evidence={
                "rows": rows,
                "row_count": row_count,
                "bytes": bytes_count,
                "policy": {"allowed": policy.allowed, "reasons": policy.reasons},
            },
        )
