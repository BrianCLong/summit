from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class CostLedger:
    entries: List[Dict[str, float]] = field(default_factory=list)
    limit_usd: float = 1.0

    def record(self, usd_cost: float, metadata: Dict = None):
        self.entries.append({"cost": usd_cost, "meta": metadata or {}})
        if self.total_cost > self.limit_usd:
            raise RuntimeError(f"Cost limit exceeded: {self.total_cost:.4f} > {self.limit_usd:.4f}")

    @property
    def total_cost(self) -> float:
        return sum(e["cost"] for e in self.entries)
