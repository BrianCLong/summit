from sqlalchemy import (Table, Column, String, Integer, Boolean, Float,
                        JSON, MetaData, create_engine, func, and_, text)
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import BaseModel
from evals.agentic.schemas import EvalRecord
from evals.agentic.pii_scrubber import scrub_obj # Import scrub_obj
import time

# NOTE: Replace with actual connection string and credentials
engine = create_engine("postgresql+psycopg2://eval:password@localhost:5432/evals_db")
md = MetaData()

eval_runs = Table("eval_runs", md,
    Column("run_id", String, primary_key=True),
    Column("workflow", String, index=True),
    Column("input_id", String),
    Column("e2e_ok", Boolean, index=True),
    Column("first_failure_at", String, nullable=True),
    Column("judge_id", String, index=True),
    Column("score", Float),
    Column("rubric_id", String),
    Column("latency_ms", Integer),
    Column("cost_usd", Float),
    Column("created_at", Integer, index=True),
    Column("steps", JSONB)  # denormalized for speed; can add child table later
)

def init():
    md.create_all(engine)

def save_record(rec: EvalRecord):
    payload = rec.dict()
    # Apply PII scrubbing before saving to DB
    payload["steps"] = [ {**s, "input": scrub_obj(s["input"]), "output": scrub_obj(s["output"])} for s in payload["steps"] ]
    with engine.begin() as cx:
        cx.execute(eval_runs.insert().values(**payload))

def get_records(limit=100) -> List[EvalRecord]:
    with engine.begin() as cx:
        rows = cx.execute(eval_runs.select().order_by(eval_runs.c.created_at.desc()).limit(limit)).fetchall()
        records = []
        for row in rows:
            record_dict = dict(row._mapping)
            # Convert 'steps' JSONB back to list of StepResult
            # This assumes that the steps in the DB are already scrubbed and conform to StepResult schema
            record_dict['steps'] = [EvalRecord.parse_obj(record_dict).steps[0].__class__(**s) for s in record_dict['steps']]
            records.append(EvalRecord(**record_dict))
        return records

def get_records_summary(workflow: str, since_ms: int) -> Dict[str, Any]:
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