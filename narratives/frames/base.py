from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class FrameLabel:
    frame: str
    stance: Optional[str]
    confidence: float
    method: str


def extract_frame(event: Dict[str, Any]) -> FrameLabel:
    """Contract: no raw text persistence; event may contain hashed references only."""
    raise NotImplementedError
