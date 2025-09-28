from dataclasses import dataclass, asdict
from typing import Callable, Dict, Any, List, Optional
import time, uuid, json, os

@dataclass
class StepResult:
    step_id: str
    ok: bool
    details: Dict[str, Any]
    started_at: float
    ended_at: float

@dataclass
class Rubric:
    name: str
    description: str
    acceptance_rules: List[str]
    partial_credit_scoring: Dict[str, float]
    required_citations: bool
    required_side_effects: List[str]

@dataclass
class EvalRecord:
    run_id: str
    workflow: str
    input_id: str
    e2e_ok: bool
    first_failure_at: Optional[str]
    step_results: List[StepResult]
    judge: str
    latency_ms: int
    cost_usd: float
    rubric_name: str # Added rubric_name to EvalRecord

class AgenticEvalHarness:
    def __init__(self, run_workflow: Callable[[Dict[str, Any]], List[StepResult]],
                 success_rule: Callable[[List[StepResult]], bool],
                 judge: Callable[[List[str], Rubric], bool], # Judge now accepts Rubric
                 rubric: Rubric,
                 results_dir: str = "evals/agentic/results"):
        self.run_workflow = run_workflow
        self.success_rule = success_rule
        self.judge = judge
        self.rubric = rubric
        self.results_dir = results_dir
        os.makedirs(self.results_dir, exist_ok=True)

    def _record_to_dict(self, record: EvalRecord) -> Dict[str, Any]:
        # Custom serialization for nested dataclasses
        record_dict = asdict(record)
        record_dict["step_results"] = [asdict(sr) for sr in record.step_results]
        return record_dict

    def save_record(self, record: EvalRecord):
        file_path = os.path.join(self.results_dir, f"{record.run_id}.json")
        with open(file_path, "w") as f:
            json.dump(self._record_to_dict(record), f, indent=4)
        print(f"EvalRecord saved to {file_path}")

    def evaluate(self, wf_name: str, case: Dict[str, Any]) -> EvalRecord:
        t0 = time.time()
        steps = self.run_workflow(case)  # must emit ordered StepResult list with tool I/O
        e2e_ok = self.success_rule(steps) and self.judge(steps, self.rubric) # Pass rubric to judge
        first_fail = next((s.step_id for s in steps if not s.ok), None)
        rec = EvalRecord(
            run_id=str(uuid.uuid4()),
            workflow=wf_name,
            input_id=case["id"],
            e2e_ok=e2e_ok,
            first_failure_at=first_fail,
            step_results=steps,
            judge=self.judge.__name__,
            latency_ms=int((time.time() - t0)*1000),
            cost_usd=sum(s.details.get("cost_usd", 0.0) for s in steps),
            rubric_name=self.rubric.name # Store rubric name in record
        )
        self.save_record(rec) # Persist the record
        return rec
