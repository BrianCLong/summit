import json
from dataclasses import dataclass, field, asdict
from typing import List

@dataclass
class LedgerEntry:
    timestamp_ref: str
    task_id: str
    cost: float
    description: str

@dataclass
class Budget:
    total_limit: float
    total_consumed: float = 0.0
    currency: str = "cost_units"

@dataclass
class Ledger:
    evidence_id: str
    budget: Budget
    entries: List[LedgerEntry] = field(default_factory=list)
    schema_version: str = "1.0"

    def record_cost(self, task_id: str, cost: float, description: str, timestamp_ref: str):
        if self.budget.total_consumed + cost > self.budget.total_limit:
            raise ValueError(f"Budget exceeded: limit {self.budget.total_limit}, "
                             f"attempted {self.budget.total_consumed + cost}")

        entry = LedgerEntry(
            timestamp_ref=timestamp_ref,
            task_id=task_id,
            cost=cost,
            description=description
        )
        self.entries.append(entry)
        self.budget.total_consumed += cost

    def to_dict(self):
        return asdict(self)

    def to_json(self):
        return json.dumps(self.to_dict(), indent=2, sort_keys=True)
