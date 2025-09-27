from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class Entity:
  id: str
  type: str
  props: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Relationship:
  src: str
  dst: str
  kind: str
  start: Optional[str] = None  # ISO 8601 string
  end: Optional[str] = None    # ISO 8601 string
  confidence: float = 0.5
  props: Dict[str, Any] = field(default_factory=dict)

