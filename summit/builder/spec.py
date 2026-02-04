from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass(frozen=True)
class BuilderSpec:
    intent: str
    target_schema: dict[str, Any] = field(default_factory=dict)
    document_types: list[str] = field(default_factory=list)
    constraints: dict[str, Any] = field(default_factory=dict)
