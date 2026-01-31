from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class JudgeAdapter(ABC):
    """
    Abstract base class for SpatialGenEval judges.
    """

    @abstractmethod
    def evaluate(self, image_path: str, question: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a single question against an image.

        Args:
            image_path: Path to the generated image.
            question: Dictionary representation of QARecord.

        Returns:
            Dict containing:
                - pred_index: int (predicted choice index)
                - confidence: float (optional)
                - rationale: str (optional)
                - judge_id: str
                - latency_ms: float
        """
        pass

class DummyJudge(JudgeAdapter):
    """
    A dummy judge for testing/stubs.
    """
    def evaluate(self, image_path: str, question: Dict[str, Any]) -> Dict[str, Any]:
        # Always predicts the correct answer if 'answer_index' is in input (cheat for testing)
        # In real usage, question wouldn't necessarily have the answer

        # NOTE: For negative testing, we can force a wrong prediction if question id has 'fail'
        if "fail" in question.get("question_id", ""):
            pred = (question.get("answer_index", 0) + 1) % 2
        else:
            pred = question.get("answer_index", 0)

        return {
            "pred_index": pred,
            "confidence": 0.99,
            "rationale": "Dummy judge logic",
            "judge_id": "dummy-v1",
            "latency_ms": 10.0
        }
