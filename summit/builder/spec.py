from dataclasses import dataclass, field
from typing import Dict, Any, List

@dataclass(frozen=True)
class BuilderSpec:
    intent: str
    target_schema: Dict[str, Any] = field(default_factory=dict)
    document_types: List[str] = field(default_factory=list)
    constraints: Dict[str, Any] = field(default_factory=dict)
