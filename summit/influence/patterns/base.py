from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class PatternMatch(BaseModel):
    pattern_id: str
    score: float
    evidence: Dict[str, Any]
    matched_elements: List[str]

class NarrativePattern(ABC, BaseModel):
    pattern_id: str
    version: str = "1.0.0"
    description: str

    @abstractmethod
    def match(self, data: Dict[str, Any]) -> Optional[PatternMatch]:
        """Attempt to match the pattern against the provided data."""
        pass
