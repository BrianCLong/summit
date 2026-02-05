from typing import List, Dict, Any
import hashlib
from summit.mars.redact import redact_text

class ReflectionEngine:
    def __init__(self, evidence_id: str):
        self.evidence_id = evidence_id

    def distill_lesson(self, solution_a: str, solution_b: str, outcome_a: float, outcome_b: float) -> Dict[str, Any]:
        # Simple "diff" by finding what's in B but not in A (very basic)
        delta = outcome_b - outcome_a
        diff_summary = f"Comparison. A: {solution_a[:20]}, B: {solution_b[:20]}. Delta: {delta}"

        # Redact
        redacted_summary, redactions = redact_text(diff_summary)

        lesson_id = f"lesson_{hashlib.sha256(diff_summary.encode()).hexdigest()[:8]}"

        effect = "positive" if delta > 0 else "negative" if delta < 0 else "unknown"

        return {
            "lesson_id": lesson_id,
            "source": "same_branch",
            "diff_summary": redacted_summary,
            "effect": effect,
            "redactions_applied": ["PII"] if redactions else []
        }

    def generate_lessons_artifact(self, lessons: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "schema_version": "1.0",
            "evidence_id": self.evidence_id,
            "lessons": lessons
        }
