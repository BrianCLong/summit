"""Schema primitives for CBM graphs."""
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass(frozen=True)
class Node:
    id: str
    type: str
    attrs: Dict[str, Any]

@dataclass(frozen=True)
class Edge:
    src: str
    dst: str
    type: str
    weight: float = 1.0
    attrs: Optional[Dict[str, Any]] = None
