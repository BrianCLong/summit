from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class TrainingObjective:
    name: str
    dataset_id: str
    priority: int
    risk_class: str
    intended_effects: List[str]
    known_tradeoffs: List[str]

# In-memory registry for now, could be loaded from JSON config
_OBJECTIVES: Dict[str, TrainingObjective] = {}

def register_objective(obj: TrainingObjective) -> None:
    _OBJECTIVES[obj.name] = obj

def get_objective(name: str) -> Optional[TrainingObjective]:
    return _OBJECTIVES.get(name)

def get_all_objectives() -> List[TrainingObjective]:
    return list(_OBJECTIVES.values())
