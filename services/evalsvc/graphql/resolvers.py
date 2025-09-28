from typing import List, Optional, Dict, Any
from services.evalsvc.db import get_records, engine, eval_runs
from evals.agentic.schemas import EvalRecord
import time
from sqlalchemy import select, func, and_, text

# Placeholder for a GraphQL library integration (e.g., Graphene, Strawberry)
# This file would typically define the actual resolver functions for the GraphQL schema.

def can_view_steps(info) -> bool:
    # Access roles from the request context
    request = info.context["request"]
    return "agentic-admin" in getattr(request.state, "roles", set())

def resolve_eval_runs(obj, info, workflow: Optional[str] = None, limit: int = 50) -> List[EvalRecord]:
    # This is a simplified resolver. In a real GraphQL setup, you'd use the ORM
    # to filter by workflow and handle pagination more robustly.
    all_records = get_records(limit=limit)
    if workflow:
        all_records = [rec for rec in all_records if rec.workflow == workflow]
    
    if not can_view_steps(info):
        # If user cannot view steps, strip them from the records
        for rec in all_records:
            rec.steps = [] # Clear the steps list

    return all_records

def resolve_summary(obj, info, workflow: str, since_ms: int) -> Dict[str, Any]:
    print(f"Calculating summary for workflow: {workflow} since: {since_ms}")

    with engine.connect() as connection:
        summary_query = select(
            eval_runs.c.workflow,
            func.avg(func.case([(eval_runs.c.e2e_ok == True, 1.0)], else_=0.0)).label('pass_rate'),
            func.percentile_cont(0.95).within_group(eval_runs.c.latency_ms).label('p95_latency'),
            func.avg(eval_runs.c.cost_usd).label('avg_cost')
        ).where(
            and_(
                eval_runs.c.workflow == workflow,
                eval_runs.c.created_at >= since_ms
            )
        ).group_by(eval_runs.c.workflow)

        summary_result = connection.execute(summary_query).fetchone()

        pass_rate = summary_result.pass_rate if summary_result else 0.0
        p95_latency_ms = summary_result.p95_latency if summary_result else 0
        avg_cost_usd = summary_result.avg_cost if summary_result else 0.0

        pareto_query = select(
            eval_runs.c.first_failure_at,
            func.count().label('n')
        ).where(
            and_(
                eval_runs.c.workflow == workflow,
                eval_runs.c.created_at >= since_ms,
                eval_runs.c.first_failure_at.isnot(None)
            )
        ).group_by(eval_runs.c.first_failure_at)
        .order_by(text('n DESC'))
        .limit(10)

        pareto_result = connection.execute(pareto_query).fetchall()
        top_first_failures_list = [f"{item.first_failure_at} ({item.n} times)" for item in pareto_result]

    return {
        "workflow": workflow,
        "since_ms": since_ms,
        "pass_rate": round(pass_rate, 4),
        "p95_latency_ms": int(p95_latency_ms) if p95_latency_ms else 0,
        "avg_cost_usd": round(avg_cost_usd, 4),
        "top_first_failures": top_first_failures_list
    }