from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Dict

@dataclass(frozen=True)
class Summary:
    facts: list[str]
    open_questions: list[str]
    plan: list[str]
    files_touched: list[str]
    patches_attempted: list[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "facts": self.facts,
            "open_questions": self.open_questions,
            "plan": self.plan,
            "files_touched": self.files_touched,
            "patches_attempted": self.patches_attempted
        }

def make_structured_summary(context_chunks: list[str], state: dict[str, Any]) -> Summary:
    """
    Summit original: structured summarization container.
    NOTE: The summarization *mechanism* can call an LLM, but output must be JSON-serializable,
    deterministic in field ordering, and redacted via summit/security/redaction.py.
    """
    # TODO: replace with model-backed summarization; keep shape stable.
    # For now, we extract from state or use placeholders.
    return Summary(
        facts=state.get("facts", ["Context exhaustion triggered"]),
        open_questions=state.get("open_questions", []),
        plan=state.get("plan", ["Summarize and continue"]),
        files_touched=sorted(set(state.get("files_touched", []))),
        patches_attempted=state.get("patches_attempted", []),
    )
