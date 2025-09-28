import time, uuid, json
from typing import Callable, Dict, Any
from .schemas import StepResult, EvalRecord
from .telemetry import persist_record, compute_first_failure, cost_of
from .runners import load_runner
from .rubrics.loader import load_rubric as rubric_loader
from .judges.llm import llm_judge
from .coverage import coverage as compute_coverage # Import coverage function

class AgenticEvalHarness:
    def __init__(self, runbook: str, judge=llm_judge):
        self.runbook = runbook
        self.runner = load_runner(runbook)     # plug our existing runbook executor
        self.rubric = rubric_loader(runbook)
        self.judge = judge

    def evaluate_case(self, case: Dict[str, Any]) -> EvalRecord:
        t0 = time.time()
        step_dicts = self.runner(case)         # returns list[dict] matching StepResult
        steps = [StepResult(**s) for s in step_dicts]
        pass_ok, score, judge_id = self.judge(steps, self.rubric)
        
        # Calculate coverage
        coverage_metrics = compute_coverage(steps)

        rec = EvalRecord(
            run_id=str(uuid.uuid4()),
            workflow=self.runbook,
            input_id=case["id"],
            e2e_ok=pass_ok,
            first_failure_at=compute_first_failure(steps),
            steps=steps,
            judge_id=judge_id,
            score=score,
            rubric_id=self.rubric["id"],
            latency_ms=int((time.time()-t0)*1000),
            cost_usd=cost_of(steps),
            created_at=int(time.time()*1000),
            coverage=coverage_metrics # Store coverage metrics
        )
        persist_record(rec)
        return rec
