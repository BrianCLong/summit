from abc import ABC, abstractmethod
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class JudgeOutput:
    pred_index: int
    confidence: Optional[float] = None
    rationale: Optional[str] = None
    judge_id: str = "base_judge"
    latency_ms: float = 0.0

class JudgeAdapter(ABC):
    @abstractmethod
    def evaluate(self, image_path: str, question: str, choices: List[str]) -> JudgeOutput:
        pass

class DummyJudge(JudgeAdapter):
    def evaluate(self, image_path: str, question: str, choices: List[str]) -> JudgeOutput:
        # Always picks the first choice for testing
        return JudgeOutput(pred_index=0, confidence=1.0, rationale="Dummy rationale", judge_id="dummy_judge")
