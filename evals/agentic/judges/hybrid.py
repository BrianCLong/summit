from typing import List, Tuple
from .llm import llm_judge
from .human import human_panel
from ..schemas import StepResult

def hybrid_judge(steps: List[StepResult], rubric) -> Tuple[bool, float, str]:
    ok, score, judge_id = llm_judge(steps, rubric)
    # Confidence gating (e.g., if borderline or contains policy-sensitive content -> human)
    if 0.6 <= score <= 0.8:
        return human_panel(steps, rubric)
    return ok, score, f"hybrid:{judge_id}"
