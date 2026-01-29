from dataclasses import dataclass, field
from typing import Literal, Dict, List, Any

StepKind = Literal["classify", "route", "extract", "validate", "transform"]

@dataclass(frozen=True)
class Step:
    id: str
    kind: StepKind
    config: Dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class WorkflowIR:
    steps: List[Step]
    edges: List[tuple[str, str]]  # (from, to)
    meta: Dict[str, Any] = field(default_factory=dict)
