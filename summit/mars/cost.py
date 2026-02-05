from enum import Enum
from dataclasses import dataclass

class TaskType(Enum):
    DESIGN = "design"
    DECOMPOSE = "decompose"
    IMPLEMENT = "implement"
    EVALUATE = "evaluate"
    REFLECTION = "reflect"

@dataclass
class CostModel:
    costs: dict[TaskType, float]

    @classmethod
    def default(cls):
        return cls(costs={
            TaskType.DESIGN: 1.0,
            TaskType.DECOMPOSE: 0.5,
            TaskType.IMPLEMENT: 2.0,
            TaskType.EVALUATE: 5.0,
            TaskType.REFLECTION: 1.5,
        })

    def get_cost(self, task_type: str | TaskType) -> float:
        if isinstance(task_type, str):
            task_type = TaskType(task_type)
        return self.costs.get(task_type, 0.0)
