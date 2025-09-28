from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class StepResult(BaseModel):
    step_id: str
    tool: str
    ok: bool
    input: Dict[str, Any]
    output: Dict[str, Any]
    error: Optional[str] = None
    started_at_ms: int
    ended_at_ms: int
    cost_usd: float = 0.0
    retries: int = 0
    meta: Dict[str, Any] = Field(default_factory=dict)  # tokens, model, etc.

class EvalRecord(BaseModel):
    run_id: str
    workflow: str
    input_id: str
    e2e_ok: bool
    first_failure_at: Optional[str]
    steps: List[StepResult]
    judge_id: str
    score: float
    rubric_id: str
    latency_ms: int
    cost_usd: float
    created_at: int
    coverage: Dict[str, float] = Field(default_factory=dict) # Added coverage field