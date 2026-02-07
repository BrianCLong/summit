import json
from enum import Enum

class TaskType(str, Enum):
    DESIGN = "design"
    DECOMPOSE = "decompose"
    IMPLEMENT = "implement"
    EVALUATE = "evaluate"

class CostModel:
    def __init__(self, unit_costs=None):
        self.unit_costs = unit_costs or {
            TaskType.DESIGN: 10,
            TaskType.DECOMPOSE: 5,
            TaskType.IMPLEMENT: 20,
            TaskType.EVALUATE: 50
        }

    def get_cost(self, task_type):
        return self.unit_costs.get(task_type, 1)

class BudgetLedger:
    def __init__(self, budget_limit):
        self.budget_limit = budget_limit
        self.total_spent = 0
        self.entries = []

    def record(self, task_id, task_type, cost):
        if self.total_spent + cost > self.budget_limit:
            raise ValueError(f"Budget exceeded: {self.total_spent + cost} > {self.budget_limit}")
        self.total_spent += cost
        self.entries.append({
            "task_id": task_id,
            "task_type": task_type,
            "cost_units": cost,
            "running_total": self.total_spent
        })

    def to_dict(self):
        return {
            "budget_limit": self.budget_limit,
            "total_spent": self.total_spent,
            "entries": self.entries
        }
