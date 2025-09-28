from typing import List, Dict
from .schemas import StepResult

def coverage(steps: List[StepResult]) -> Dict[str, float]:
    # Simple MVP:
    tools = set(s.tool for s in steps)
    unique_steps = set(s.step_id for s in steps)
    retry_rate = sum(1 for s in steps if s.retries > 0) / max(1,len(steps))
    backtrack_depth = max(s.meta.get("backtrack_depth",0) for s in steps) if steps else 0
    return {
        "tools_used": len(tools),
        "unique_steps": len(unique_steps),
        "retry_rate": retry_rate,
        "max_backtrack_depth": float(backtrack_depth),
    }
