from typing import Dict, Any, List
from dataclasses import dataclass

@dataclass
class DocumentEvent:
    id: str
    content: str
    source: str
    metadata: Dict[str, Any]

@dataclass
class Narrative:
    id: str
    label: str
    claims: List[str]

@dataclass
class InfluenceNode:
    id: str
    type: str
    metadata: Dict[str, Any]
