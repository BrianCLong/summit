from __future__ import annotations

from dataclasses import dataclass

@dataclass(frozen=True)
class DeliberationBudget:
    max_units: int
    used_units: int = 0

    def consume(self, units: int) -> "DeliberationBudget":
        if units < 0:
            raise ValueError("units must be non-negative")
        new_used = self.used_units + units
        if new_used > self.max_units:
            raise BudgetExceeded(f"Deliberation budget exceeded: {new_used} > {self.max_units}")
        return DeliberationBudget(max_units=self.max_units, used_units=new_used)

class BudgetExceeded(RuntimeError):
    pass

def estimate_difficulty(signals: dict) -> float:
    """
    Summit original: heuristic difficulty estimator.
    TODO: calibrate with bench data.
    """
    score = 0.0
    score += 1.0 if signals.get("multi_file") else 0.0
    score += min(3.0, float(signals.get("test_failures", 0)))
    score += 1.0 if signals.get("tool_errors") else 0.0
    return score

def allocate_budget(base: int, difficulty: float, cap: int) -> int:
    """
    Implements ITEM:CLAIM-05 behavior (adaptive thinking) in policy form.
    """
    scaled = int(base * (1.0 + difficulty))
    return max(base, min(cap, scaled))
