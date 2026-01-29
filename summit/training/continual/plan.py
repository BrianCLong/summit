from dataclasses import dataclass
from typing import List

@dataclass
class ContinualUpdatePlan:
    base_model: str
    adapter_modules: List[str]
    learning_rate: float
    # ...
