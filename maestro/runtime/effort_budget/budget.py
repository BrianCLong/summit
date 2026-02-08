from typing import Optional, Dict, Any
from pydantic import BaseModel

class EffortBudget(BaseModel):
    max_tokens: Optional[int] = None
    max_steps: int = 25
    max_time_ms: int = 300000
    max_cost_usd: Optional[float] = None
    effort_level: str = "medium"

class BudgetTracker:
    def __init__(self, budget: EffortBudget):
        self.budget = budget
        self.used_tokens = 0
        self.used_steps = 0
        self.used_time_ms = 0
        self.used_cost_usd = 0.0

    def record_usage(self, tokens: int = 0, time_ms: int = 0, cost_usd: float = 0.0):
        self.used_steps += 1
        self.used_tokens += tokens
        self.used_time_ms += time_ms
        self.used_cost_usd += cost_usd

    def check_budget(self) -> bool:
        if self.used_steps >= self.budget.max_steps:
            return False
        if self.budget.max_tokens and self.used_tokens >= self.budget.max_tokens:
            return False
        if self.used_time_ms >= self.budget.max_time_ms:
            return False
        if self.budget.max_cost_usd and self.used_cost_usd >= self.budget.max_cost_usd:
            return False
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "used_steps": self.used_steps,
            "used_tokens": self.used_tokens,
            "is_exhausted": not self.check_budget()
        }
