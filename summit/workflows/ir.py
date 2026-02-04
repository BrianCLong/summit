from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal

StepKind = Literal["classify", "route", "extract", "validate", "transform"]

@dataclass(frozen=True)
class Step:
    id: str
    kind: StepKind
    config: dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class WorkflowIR:
    steps: list[Step]
    edges: list[tuple[str, str]]  # (from, to)
    meta: dict[str, Any] = field(default_factory=dict)
