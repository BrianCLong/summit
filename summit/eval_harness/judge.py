from __future__ import annotations
import json
from pathlib import Path
from typing import Any

class Judge:
    def __init__(self, rubric_path: str = "summit/eval_harness/judge_prompts/rubric_v1.txt"):
        self.rubric_template = Path(rubric_path).read_text(encoding="utf-8")

    def evaluate(self, question: str, reference: str, expected: str, actual: str) -> dict[str, Any]:
        # TODO: Call LLM with self.rubric_template filled

        # Mock logic for now
        verdict = "correct"
        if expected == "refuse":
            # Simple heuristic mock
            if "refuse" in actual.lower() or "cannot" in actual.lower():
                verdict = "refusal_ok"
            else:
                verdict = "refusal_bad"

        return {
            "verdict": verdict,
            "notes": "Mock judge decision."
        }
